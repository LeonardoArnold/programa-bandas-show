"""
Lê uma playlist do YouTube e sorteia bandas dela (sem chave de API).
Usa yt-dlp em modo 'flat' (só lista os títulos, não baixa nada — é rápido).
"""
import re
import random
from yt_dlp import YoutubeDL


def parse_titulo(titulo: str) -> dict:
    """
    Quebra 'BANDA MARIAH - GARÇOM | Feat. Paulinho... | LANÇAMENTO 2026' em nome + música.
    Já devolve nome e música em CAIXA ALTA (padrão da ficha: 'MUSICAL CALMON (TRAÍRA)').
    Marca 'incompleto' quando não consegue separar nome/música com confiança, pra você revisar.
    """
    t = (titulo or "").strip()
    lanc = bool(re.search(r"lan[cç]amento", t, re.I))
    t_norm = re.sub(r"\s[–—]\s", " - ", t)

    pipe_pos = t_norm.find("|")
    hifen_pos = t_norm.find(" - ")
    base = t_norm[:pipe_pos] if (pipe_pos != -1 and (hifen_pos == -1 or pipe_pos < hifen_pos)) else t_norm

    nome, musica = base, ""
    if " - " in base:
        nome, resto = base.split(" - ", 1)
        resto = re.split(r"\s*[\|\(/]\s*", resto, 1)[0]
        resto = re.split(r"\b(?:feat\.?|ft\.?)\b", resto, 1, flags=re.I)[0]
        musica = resto.strip()
    else:
        nome = re.split(r"[\|\(]", base, 1)[0].strip()

    nome = nome.strip(" .-,/")
    musica = musica.strip(" .-,/")
    incompleto = not musica

    return {"nome": nome.upper(), "musica": musica.upper(), "lancamento": lanc,
            "incompleto": incompleto, "titulo_original": titulo}


def _url_playlist(url: str) -> str:
    """
    Se vier link de vídeo com &list=ID (watch?v=...&list=...), extrai só o ID
    e monta a URL pura da playlist — senão o yt-dlp lê só o vídeo, não a lista.
    """
    m = re.search(r"[?&]list=([A-Za-z0-9_-]+)", url)
    if m:
        return "https://www.youtube.com/playlist?list=" + m.group(1)
    return url


def extrair_playlist(url: str, quantidade: int = 10) -> list:
    url = _url_playlist(url)
    opts = {"quiet": True, "extract_flat": True, "skip_download": True,
            "ignoreerrors": True, "noplaylist": False}
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
    entries = (info or {}).get("entries") or []

    vistos, candidatos = set(), []
    for e in entries:
        if not e:
            continue
        titulo = e.get("title") or ""
        if not titulo or titulo.startswith("["):
            continue
        p = parse_titulo(titulo)
        chave = p["nome"].lower()
        if not chave or chave in vistos:
            continue
        vistos.add(chave)
        vid = e.get("id")
        p["youtube_link"] = f"https://www.youtube.com/watch?v={vid}" if vid else ""
        candidatos.append(p)

    if not candidatos:
        raise ValueError("Não encontrei bandas nessa playlist. "
                         "Confirme que o link tem 'list=' e que a playlist é pública.")

    random.shuffle(candidatos)
    return candidatos[:quantidade]
