"""
Geração da ficha em Word (.docx) no formato do Programa Bandas Show.

Usa python-docx (única dependência além do FastAPI/uvicorn).
A numeração das bandas é calculada na hora: só blocos do tipo "banda" recebem número.
"""
from io import BytesIO

from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

VERMELHO = RGBColor(0xC0, 0x00, 0x00)
PRETO = RGBColor(0x00, 0x00, 0x00)
FONTE = "Arial"
TAM_TITULO = 14
TAM_LINHA = 12


def _run(par, texto, *, bold=True, cor=PRETO, tam=TAM_LINHA, highlight=False):
    r = par.add_run(texto)
    r.bold = bold
    r.font.name = FONTE
    r.font.size = Pt(tam)
    r.font.color.rgb = cor
    if highlight:
        r.font.highlight_color = 7
    return r


def gerar_docx(ficha: dict) -> bytes:
    doc = Document()

    style = doc.styles["Normal"]
    style.font.name = FONTE
    style.font.size = Pt(TAM_LINHA)

    # --- Cabeçalho ---
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    _run(p, f"PROGRAMA N°({ficha.get('numero', '')})",
         bold=True, cor=VERMELHO, tam=TAM_TITULO, highlight=True)

    # Datas (exibição/gravação) não entram no documento impresso — ficam só
    # guardadas no banco, usadas pra calcular número/data da semana seguinte
    # e exibidas na aba Histórico.

    doc.add_paragraph()

    n_banda = 0
    for bloco in ficha.get("blocos", []):
        tipo = bloco.get("tipo")
        p = doc.add_paragraph()

        if tipo == "banda":
            n_banda += 1
            nome = (bloco.get("nome") or "").upper().strip()
            musica = (bloco.get("musica") or "").upper().strip()
            texto = f"{n_banda}-{nome}"
            if musica:
                texto += f" ({musica})"
            _run(p, texto, bold=True, cor=PRETO)
            feat = (bloco.get("feat") or "").upper().strip()
            if feat:
                _run(p, f" FT. {feat}", bold=True, cor=PRETO)
            if bloco.get("lancamento"):
                _run(p, " LANÇAMENTO", bold=True, cor=VERMELHO)

        elif tipo == "comercial":
            _run(p, "COMERCIAL", bold=True, cor=PRETO)

        elif tipo == "redes_sociais":
            txt = (bloco.get("conteudo") or "REDES SOCIAIS").upper().strip()
            _run(p, txt, bold=True, cor=PRETO)

        elif tipo == "abracos":
            txt = (bloco.get("conteudo") or "ABRAÇOS").upper().strip()
            _run(p, txt, bold=True, cor=PRETO)

        else:
            txt = (bloco.get("conteudo") or "").upper().strip()
            _run(p, txt, bold=True, cor=PRETO)

    bio = BytesIO()
    doc.save(bio)
    return bio.getvalue()
