"""
Programa Bandas Show — montador de fichas.
Rode com:  uvicorn app:app --reload
Depois abra http://127.0.0.1:8000
"""
import json
import urllib.parse
import urllib.request
from io import BytesIO

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path

import db
import docx_export

app = FastAPI(title="Bandas Show")
db.init_db()

BASE = Path(__file__).parent


# ---------- Modelos de entrada ----------
class Banda(BaseModel):
    id: int | None = None
    nome: str
    tipo: str = "aleatoria"          # 'patrocinador' | 'aleatoria'
    master: int = 0
    bloqueada: int = 0
    frequencia: str = "alternado"    # 'alternado' | 'mensal' | 'manual'
    ultima_vez: str = ""             # dd/mm/aaaa
    youtube_link: str = ""
    facebook_link: str = ""
    musica_padrao: str = ""
    observacoes: str = ""


class Ficha(BaseModel):
    id: int | None = None
    numero: str
    data_gravacao: str = ""
    data_exibicao: str = ""
    blocos: list = []


# ---------- BANDAS ----------
@app.get("/api/bandas")
def api_listar_bandas(busca: str = "", incluir_bloqueadas: bool = True):
    return db.listar_bandas(busca, incluir_bloqueadas)


@app.post("/api/bandas")
def api_salvar_banda(banda: Banda):
    bid = db.salvar_banda(banda.model_dump())
    return db.get_banda(bid)


@app.delete("/api/bandas/{banda_id}")
def api_excluir_banda(banda_id: int):
    db.excluir_banda(banda_id)
    return {"ok": True}


@app.get("/api/master")
def api_master():
    return db.get_master() or {}


@app.get("/api/quem-toca")
def api_quem_toca(data_exibicao: str):
    """Patrocinadores (alternados/mensais) que estão na vez para essa data de exibição."""
    return db.quem_toca_hoje(data_exibicao)


# ---------- FICHAS ----------
@app.get("/api/proxima")
def api_proxima():
    return db.sugerir_proxima()


@app.get("/api/fichas")
def api_listar_fichas():
    return db.listar_fichas()


@app.get("/api/fichas/{ficha_id}")
def api_get_ficha(ficha_id: int):
    f = db.get_ficha(ficha_id)
    if not f:
        raise HTTPException(404, "Ficha não encontrada")
    return f


@app.post("/api/fichas")
def api_salvar_ficha(ficha: Ficha):
    fid = db.salvar_ficha(ficha.model_dump())
    return db.get_ficha(fid)


@app.post("/api/fichas/{ficha_id}/duplicar")
def api_duplicar(ficha_id: int):
    base = db.get_ficha(ficha_id)
    if not base:
        raise HTTPException(404, "Ficha não encontrada")
    prox = db.sugerir_proxima()
    nova = {
        "numero": prox["numero"] or base["numero"],
        "data_gravacao": prox["data_gravacao"],
        "data_exibicao": prox["data_exibicao"],
        "blocos": base["blocos"],
    }
    fid = db.salvar_ficha(nova)
    return db.get_ficha(fid)


@app.delete("/api/fichas/{ficha_id}")
def api_excluir_ficha(ficha_id: int):
    db.excluir_ficha(ficha_id)
    return {"ok": True}


@app.post("/api/fichas/{ficha_id}/docx")
def api_docx(ficha_id: int):
    f = db.get_ficha(ficha_id)
    if not f:
        raise HTTPException(404, "Ficha não encontrada")
    conteudo = docx_export.gerar_docx(f)
    nome = f"ficha_{f['numero'] or ficha_id}.docx"
    return StreamingResponse(
        BytesIO(conteudo),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{nome}"'},
    )


# Gera Word direto de blocos não salvos (prévia/download rápido)
@app.post("/api/preview/docx")
def api_preview_docx(ficha: Ficha):
    conteudo = docx_export.gerar_docx(ficha.model_dump())
    nome = f"ficha_{ficha.numero or 'nova'}.docx"
    return StreamingResponse(
        BytesIO(conteudo),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{nome}"'},
    )


# ---------- YOUTUBE (preview sem chave, via oEmbed) ----------
@app.get("/api/youtube/oembed")
def api_oembed(url: str):
    """Devolve título, canal e thumbnail de um link do YouTube. Sem API key."""
    try:
        oe = "https://www.youtube.com/oembed?" + urllib.parse.urlencode(
            {"url": url, "format": "json"}
        )
        req = urllib.request.Request(oe, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
        return {
            "ok": True,
            "titulo": data.get("title", ""),
            "canal": data.get("author_name", ""),
            "thumbnail": data.get("thumbnail_url", ""),
        }
    except Exception as e:
        return {"ok": False, "erro": str(e)}


# ---------- Frontend ----------
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")


@app.get("/")
def index():
    return FileResponse(BASE / "static" / "index.html")
