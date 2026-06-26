# Programa Bandas Show — Montador de Fichas

App local pra montar a ficha semanal do programa e exportar em **Word (.docx)**.
Cadastra bandas (patrocinadores, master, bloqueadas), monta a ordem do programa
arrastando/subindo/descendo os blocos, e gera o documento no formato da emissora.

## O que ele já faz
- Cadastro de bandas: patrocinador / aleatória, com flags **Master** e **Bloqueada**.
- A banda **Master** entra automática em toda ficha nova (ex.: Musical Calmon, toca todo domingo).
- Patrocinadores comuns têm uma **frequência**:
  - **Alternado**: toca 1 sim, 1 não (a maioria dos seus patrocinadores).
  - **Mensal**: toca 1 vez por mês (ex.: Léo Ribeiro).
  - **Manual**: nunca entra automático, você decide toda vez.
  O cálculo usa a data da **última vez que a banda tocou** — você só informa isso uma vez
  no cadastro; depois, toda vez que a banda entra numa ficha salva, a data é atualizada sozinha.
- Ao abrir uma ficha nova, o app **já insere automaticamente** quem está na vez (master +
  alternados/mensais). Se quiser pular alguém pontualmente, é só remover o bloco na hora.
- Bandas **bloqueadas** (ex.: Corpo e Alma) nunca aparecem nas seleções.
- Número do programa e datas **sugeridos sozinhos**: número anterior + 1,
  exibição no domingo seguinte, e gravação = exibição − 8 dias.
- Blocos da ficha: banda (com **Lançamento** e **FT.**), Comercial, Texto/patrocínio,
  Abraços, Redes sociais — todos reordenáveis.
- Numeração das bandas calculada na hora (pula Comercial e textos).
- **Gerar Word** no formato da foto (título vermelho, linhas em negrito, LANÇAMENTO em vermelho).
- Histórico de fichas: abrir, **duplicar** (reaproveita tudo, só troca número/datas), baixar Word, excluir.
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

# 3. instalar dependências
pip install -r requirements.txt

# 4. rodar
uvicorn app:app --reload
```

Abra no navegador: **http://127.0.0.1:8000**

A documentação automática da API fica em **http://127.0.0.1:8000/docs** (ótimo pra você
inspecionar e aprender como cada rota funciona).

## Fluxo da semana
1. Aba **Bandas**: cadastre seus patrocinadores, marque o Master e as bloqueadas, e defina
   a frequência de cada um (alternado/mensal/manual) com a última vez que tocou (faz uma vez só).
2. Aba **Montar ficha**: número, datas, Master e quem está na vez **já vêm inseridos sozinhos**.
3. Adicione os 4–5 patrocinadores pelo menu, as aleatórias (nome + música), e os blocos fixos
   (Comercial, Frigobendo, etc.). Reordene com ▲▼.
4. **Salvar ficha** e **Gerar Word**.
5. Na semana seguinte: aba **Histórico** → **duplicar** a última → ajusta só as aleatórias.

## Backup
Tudo fica no arquivo **`ficha.db`** (SQLite) na pasta do projeto. Pra fazer backup,
é só copiar esse arquivo. Pra zerar tudo, apague-o (ele é recriado vazio).

## Próximo passo (quando você quiser): busca automática no YouTube
Hoje as aleatórias são digitadas e o clipe é só conferido colando o link.
Pra automatizar (puxar de uma playlist sua e te mostrar uma lista com checkbox),
o caminho é a **YouTube Data API v3**:
1. Criar um projeto no Google Cloud Console e gerar uma **API key** (grátis).
2. Usar `playlistItems.list` (custa ~1 unidade por chamada; cota diária de ~10 mil — sobra).
3. O gancho no código fica em `app.py` (rota nova `/api/youtube/playlist`) e em
   `static/app.js` (montar a lista de checkbox a partir do retorno).

Obs.: a API **não** garante resolução (o "Full HD" não vem de forma confiável). Dá pra puxar
o clipe oficial mais recente e deixar o YouTube servir a melhor qualidade que tiver.

## Estrutura dos arquivos
```
bandas-show/
├── app.py            # rotas da API + serve o site (FastAPI)
├── db.py             # banco SQLite (sem ORM, fácil de ler)
├── docx_export.py    # gera o Word no formato da ficha
├── requirements.txt
├── ficha.db          # criado ao rodar (seu banco de dados)
└── static/
    ├── index.html    # as 3 telas
    ├── style.css
    └── app.js        # lógica da interface
```
