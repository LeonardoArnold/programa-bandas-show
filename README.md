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
- Bandas **bloqueadas** (ex.: Banda Fictícia X) nunca aparecem nas seleções.
- Número do programa e datas **sugeridos sozinhos**: número anterior + 1,
  exibição no domingo seguinte, e gravação = exibição − 8 dias.
- Blocos da ficha: banda (com **Lançamento** e **FT.**), Comercial, Texto/patrocínio,
  Abraços, Redes sociais — todos reordenáveis.
- Numeração das bandas calculada na hora (pula Comercial e textos).
- **Gerar Word** no formato da foto (título vermelho, linhas em negrito, LANÇAMENTO em vermelho).
- Histórico de fichas: abrir, **duplicar** (reaproveita tudo, só troca número/datas), baixar Word, excluir.
- Preview do clipe do YouTube colando o link (sem precisar de chave de API).
- **Sortear bandas de uma playlist do YouTube** (cola o link, escolhe quantas, marca quais entram).
- **Sortear ordem** das atrações entre si na ficha.

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
3. Cole o link de uma playlist do YouTube e sorteie as bandas aleatórias que faltam.
4. Adicione os blocos fixos (Comercial, Frigobendo, etc.) e reordene com ▲▼ ou Sortear ordem.
5. **Salvar ficha** e **Gerar Word**.
6. Na semana seguinte: aba **Histórico** → **duplicar** a última → ajusta só as aleatórias.

## Backup
Tudo fica no arquivo **`ficha.db`** (SQLite) na pasta do projeto. Pra fazer backup,
é só copiar esse arquivo. Pra zerar tudo, apague-o (ele é recriado vazio).

## Estrutura dos arquivos
