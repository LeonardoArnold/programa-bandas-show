"""
Banco de dados SQLite (stdlib, sem ORM — fácil de ler e mexer).
Cria o arquivo ficha.db na primeira execução.
"""
import sqlite3
import json
from datetime import date, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "ficha.db"


def conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys = ON")
    return c


def init_db():
    with conn() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS bandas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                tipo TEXT NOT NULL DEFAULT 'aleatoria',   -- 'patrocinador' | 'aleatoria'
                master INTEGER NOT NULL DEFAULT 0,         -- 0/1
                bloqueada INTEGER NOT NULL DEFAULT 0,      -- 0/1
                frequencia TEXT NOT NULL DEFAULT 'alternado',  -- 'alternado' | 'mensal' | 'manual'
                                                                -- só vale pra tipo='patrocinador'; master ignora isso
                ultima_vez TEXT DEFAULT '',                -- dd/mm/aaaa da última vez que tocou
                youtube_link TEXT DEFAULT '',
                facebook_link TEXT DEFAULT '',
                musica_padrao TEXT DEFAULT '',
                observacoes TEXT DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS fichas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero TEXT NOT NULL,
                data_gravacao TEXT DEFAULT '',   -- dd/mm/aaaa
                data_exibicao TEXT DEFAULT '',
                blocos_json TEXT NOT NULL DEFAULT '[]',
                criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
            );
            """
        )
        # Migração leve: se o banco já existia antes dessas colunas existirem, cria agora.
        cols = {row["name"] for row in c.execute("PRAGMA table_info(bandas)")}
        if "frequencia" not in cols:
            c.execute("ALTER TABLE bandas ADD COLUMN frequencia TEXT NOT NULL DEFAULT 'alternado'")
        if "ultima_vez" not in cols:
            c.execute("ALTER TABLE bandas ADD COLUMN ultima_vez TEXT DEFAULT ''")


# ---------------- BANDAS ----------------
def listar_bandas(busca="", incluir_bloqueadas=True):
    q = "SELECT * FROM bandas WHERE 1=1"
    params = []
    if busca:
        q += " AND lower(nome) LIKE ?"
        params.append(f"%{busca.lower()}%")
    if not incluir_bloqueadas:
        q += " AND bloqueada = 0"
    q += " ORDER BY master DESC, tipo, nome COLLATE NOCASE"
    with conn() as c:
        return [dict(r) for r in c.execute(q, params).fetchall()]


def get_banda(banda_id):
    with conn() as c:
        r = c.execute("SELECT * FROM bandas WHERE id = ?", (banda_id,)).fetchone()
        return dict(r) if r else None


def salvar_banda(b):
    campos = ("nome", "tipo", "master", "bloqueada", "frequencia", "ultima_vez",
              "youtube_link", "facebook_link", "musica_padrao", "observacoes")
    with conn() as c:
        # Só um master por vez: ao marcar um, desmarca os outros
        if int(b.get("master", 0)) == 1:
            c.execute("UPDATE bandas SET master = 0")
        if b.get("id"):
            sets = ", ".join(f"{k} = ?" for k in campos)
            c.execute(f"UPDATE bandas SET {sets} WHERE id = ?",
                      [b.get(k, "") for k in campos] + [b["id"]])
            return b["id"]
        else:
            placeholders = ", ".join("?" for _ in campos)
            cur = c.execute(
                f"INSERT INTO bandas ({', '.join(campos)}) VALUES ({placeholders})",
                [b.get(k, "") for k in campos],
            )
            return cur.lastrowid


def excluir_banda(banda_id):
    with conn() as c:
        c.execute("DELETE FROM bandas WHERE id = ?", (banda_id,))


def get_master():
    with conn() as c:
        r = c.execute("SELECT * FROM bandas WHERE master = 1 LIMIT 1").fetchone()
        return dict(r) if r else None


def _parse_data(s):
    try:
        d, m, a = s.split("/")
        return date(int(a), int(m), int(d))
    except Exception:
        return None


def esta_na_vez(banda: dict, data_exibicao: date) -> bool:
    """
    Decide se um patrocinador comum (não-master) toca na data de exibição informada,
    com base na frequência cadastrada e na última vez que tocou.
    - 'alternado': toca se já passaram >= 14 dias desde a última vez (1 sim, 1 não).
    - 'mensal': toca se já passaram >= 28 dias desde a última vez.
    - 'manual': nunca entra automático (usuário decide sempre na hora).
    Sem 'ultima_vez' cadastrada => entra (assume que está na vez, dá pra remover na mão).
    """
    freq = banda.get("frequencia") or "alternado"
    if freq == "manual":
        return False
    ultima = _parse_data(banda.get("ultima_vez") or "")
    if ultima is None:
        return True
    dias = (data_exibicao - ultima).days
    if freq == "mensal":
        return dias >= 28
    return dias >= 14  # alternado


def quem_toca_hoje(data_exibicao_str: str):
    """Lista de patrocinadores (não-master, não-bloqueados) que estão na vez nessa data."""
    data_exibicao = _parse_data(data_exibicao_str) or date.today()
    with conn() as c:
        rows = [dict(r) for r in c.execute(
            "SELECT * FROM bandas WHERE tipo = 'patrocinador' AND master = 0 AND bloqueada = 0"
        ).fetchall()]
    return [b for b in rows if esta_na_vez(b, data_exibicao)]


def atualizar_ultima_vez(banda_id: int, data_exibicao_str: str):
    with conn() as c:
        c.execute("UPDATE bandas SET ultima_vez = ? WHERE id = ?", (data_exibicao_str, banda_id))


# ---------------- FICHAS ----------------
def listar_fichas():
    with conn() as c:
        return [dict(r) for r in c.execute(
            "SELECT id, numero, data_gravacao, data_exibicao, criado_em "
            "FROM fichas ORDER BY id DESC").fetchall()]


def get_ficha(ficha_id):
    with conn() as c:
        r = c.execute("SELECT * FROM fichas WHERE id = ?", (ficha_id,)).fetchone()
        if not r:
            return None
        d = dict(r)
        d["blocos"] = json.loads(d.pop("blocos_json") or "[]")
        return d


def salvar_ficha(f):
    blocos_json = json.dumps(f.get("blocos", []), ensure_ascii=False)
    data_exibicao = f.get("data_exibicao", "")
    with conn() as c:
        if f.get("id"):
            c.execute(
                "UPDATE fichas SET numero=?, data_gravacao=?, data_exibicao=?, blocos_json=? WHERE id=?",
                (f["numero"], f.get("data_gravacao", ""), data_exibicao,
                 blocos_json, f["id"]),
            )
            fid = f["id"]
        else:
            cur = c.execute(
                "INSERT INTO fichas (numero, data_gravacao, data_exibicao, blocos_json) VALUES (?,?,?,?)",
                (f["numero"], f.get("data_gravacao", ""), data_exibicao, blocos_json),
            )
            fid = cur.lastrowid

        # Registra "essa banda tocou nessa data" pra quem tem banda_id e não é o master
        # (o master toca sempre, não precisa de controle de vez).
        if data_exibicao:
            for bloco in f.get("blocos", []):
                bid = bloco.get("banda_id")
                if bloco.get("tipo") == "banda" and bid:
                    c.execute(
                        "UPDATE bandas SET ultima_vez = ? WHERE id = ? AND master = 0",
                        (data_exibicao, bid),
                    )
    return fid


def excluir_ficha(ficha_id):
    with conn() as c:
        c.execute("DELETE FROM fichas WHERE id = ?", (ficha_id,))


def sugerir_proxima():
    """Sugere número e datas com base na última ficha."""
    with conn() as c:
        r = c.execute("SELECT numero, data_exibicao FROM fichas ORDER BY id DESC LIMIT 1").fetchone()

    numero = ""
    exib = None
    if r:
        # número + 1 (se for numérico)
        try:
            numero = str(int(r["numero"]) + 1)
        except (ValueError, TypeError):
            numero = ""
        # exibição anterior + 7 dias
        try:
            d, m, a = r["data_exibicao"].split("/")
            exib = date(int(a), int(m), int(d)) + timedelta(days=7)
        except Exception:
            exib = None

    if exib is None:
        hoje = date.today()
        # próximo domingo (weekday: seg=0 ... dom=6)
        delta = (6 - hoje.weekday()) % 7
        exib = hoje + timedelta(days=delta)

    grav = exib - timedelta(days=8)
    return {
        "numero": numero,
        "data_exibicao": exib.strftime("%d/%m/%Y"),
        "data_gravacao": grav.strftime("%d/%m/%Y"),
    }
