# Programa Bandas Show â€” Montador de Fichas

App local pra montar a ficha semanal do programa e exportar em **Word (.docx)**.
Cadastra bandas (patrocinadores, master, bloqueadas), monta a ordem do programa
arrastando/subindo/descendo os blocos, e gera o documento no formato da emissora.

## O que ele jÃ¡ faz
- Cadastro de bandas: patrocinador / aleatÃ³ria, com flags **Master** e **Bloqueada**.
- A banda **Master** entra automÃ¡tica em toda ficha nova (ex.: Musical Calmon, toca todo domingo).
- Patrocinadores comuns tÃªm uma **frequÃªncia**:
  - **Alternado**: toca 1 sim, 1 nÃ£o (a maioria dos seus patrocinadores).
  - **Mensal**: toca 1 vez por mÃªs (ex.: LÃ©o Ribeiro).
  - **Manual**: nunca entra automÃ¡tico, vocÃª decide toda vez.
  O cÃ¡lculo usa a data da **Ãºltima vez que a banda tocou** â€” vocÃª sÃ³ informa isso uma vez
  no cadastro; depois, toda vez que a banda entra numa ficha salva, a data Ã© atualizada sozinha.
- Ao abrir uma ficha nova, o app **jÃ¡ insere automaticamente** quem estÃ¡ na vez (master +
  alternados/mensais). Se quiser pular alguÃ©m pontualmente, Ã© sÃ³ remover o bloco na hora.
- Bandas **bloqueadas** (ex.: Banda Fictícia X) nunca aparecem nas seleÃ§Ãµes.
- NÃºmero do programa e datas **sugeridos sozinhos**: nÃºmero anterior + 1,
  exibiÃ§Ã£o no domingo seguinte, e gravaÃ§Ã£o = exibiÃ§Ã£o âˆ’ 8 dias.
- Blocos da ficha: banda (com **LanÃ§amento** e **FT.**), Comercial, Texto/patrocÃ­nio,
  AbraÃ§os, Redes sociais â€” todos reordenÃ¡veis.
- NumeraÃ§Ã£o das bandas calculada na hora (pula Comercial e textos).
- **Gerar Word** no formato da foto (tÃ­tulo vermelho, linhas em negrito, LANÃ‡AMENTO em vermelho).
- HistÃ³rico de fichas: abrir, **duplicar** (reaproveita tudo, sÃ³ troca nÃºmero/datas), baixar Word, excluir.
- Preview do clipe do YouTube colando o link (sem precisar de chave de API).

## Como rodar (Windows / Linux / Mac)
Precisa de **Python 3.10 ou mais novo**.

```bash
# 1. entrar na pasta
cd bandas-show

# 2. (opcional, recomendado) criar ambiente virtual
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# 3. instalar dependÃªncias
pip install -r requirements.txt

# 4. rodar
uvicorn app:app --reload
```

Abra no navegador: **http://127.0.0.1:8000**

A documentaÃ§Ã£o automÃ¡tica da API fica em **http://127.0.0.1:8000/docs** (Ã³timo pra vocÃª
inspecionar e aprender como cada rota funciona).

## Fluxo da semana
1. Aba **Bandas**: cadastre seus patrocinadores, marque o Master e as bloqueadas, e defina
   a frequÃªncia de cada um (alternado/mensal/manual) com a Ãºltima vez que tocou (faz uma vez sÃ³).
2. Aba **Montar ficha**: nÃºmero, datas, Master e quem estÃ¡ na vez **jÃ¡ vÃªm inseridos sozinhos**.
3. Adicione os 4â€“5 patrocinadores pelo menu, as aleatÃ³rias (nome + mÃºsica), e os blocos fixos
   (Comercial, Frigobendo, etc.). Reordene com â–²â–¼.
4. **Salvar ficha** e **Gerar Word**.
5. Na semana seguinte: aba **HistÃ³rico** â†’ **duplicar** a Ãºltima â†’ ajusta sÃ³ as aleatÃ³rias.

## Backup
Tudo fica no arquivo **`ficha.db`** (SQLite) na pasta do projeto. Pra fazer backup,
Ã© sÃ³ copiar esse arquivo. Pra zerar tudo, apague-o (ele Ã© recriado vazio).

## PrÃ³ximo passo (quando vocÃª quiser): busca automÃ¡tica no YouTube
Hoje as aleatÃ³rias sÃ£o digitadas e o clipe Ã© sÃ³ conferido colando o link.
Pra automatizar (puxar de uma playlist sua e te mostrar uma lista com checkbox),
o caminho Ã© a **YouTube Data API v3**:
1. Criar um projeto no Google Cloud Console e gerar uma **API key** (grÃ¡tis).
2. Usar `playlistItems.list` (custa ~1 unidade por chamada; cota diÃ¡ria de ~10 mil â€” sobra).
3. O gancho no cÃ³digo fica em `app.py` (rota nova `/api/youtube/playlist`) e em
   `static/app.js` (montar a lista de checkbox a partir do retorno).

Obs.: a API **nÃ£o** garante resoluÃ§Ã£o (o "Full HD" nÃ£o vem de forma confiÃ¡vel). DÃ¡ pra puxar
o clipe oficial mais recente e deixar o YouTube servir a melhor qualidade que tiver.

## Estrutura dos arquivos
```
bandas-show/
â”œâ”€â”€ app.py            # rotas da API + serve o site (FastAPI)
â”œâ”€â”€ db.py             # banco SQLite (sem ORM, fÃ¡cil de ler)
â”œâ”€â”€ docx_export.py    # gera o Word no formato da ficha
â”œâ”€â”€ requirements.txt
â”œâ”€â”€ ficha.db          # criado ao rodar (seu banco de dados)
â””â”€â”€ static/
    â”œâ”€â”€ index.html    # as 3 telas
    â”œâ”€â”€ style.css
    â””â”€â”€ app.js        # lÃ³gica da interface
```
