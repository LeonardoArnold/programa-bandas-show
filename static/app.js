// ===== Estado =====
let blocos = [];
let bandas = [];
let fichaId = null;

const $ = (s) => document.querySelector(s);
const api = async (url, opts) => {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error((await r.text()) || r.status);
  return r.json();
};
const status = (msg) => { $("#status").textContent = msg; if (msg) setTimeout(() => $("#status").textContent = "", 4000); };

const ROTULO = {
  banda: "Banda", comercial: "Comercial", texto: "Texto",
  abracos: "Abraços", redes_sociais: "Redes sociais",
};
const ROTULO_FREQ = { alternado: "Alternado", mensal: "Mensal", manual: "Manual" };

document.querySelectorAll(".tab").forEach(t => t.onclick = () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("ativo"));
  document.querySelectorAll(".view").forEach(x => x.classList.remove("ativo"));
  t.classList.add("ativo");
  $("#view-" + t.dataset.view).classList.add("ativo");
  if (t.dataset.view === "bandas") carregarBandas();
  if (t.dataset.view === "historico") carregarHistorico();
});

function novoBloco(tipo, extra = {}) {
  return Object.assign({
    tipo, nome: "", musica: "", feat: "", lancamento: false,
    conteudo: "", youtube_link: "", banda_id: null,
  }, extra);
}

function addBloco(tipo) {
  if (tipo === "abracos") blocos.push(novoBloco(tipo, { conteudo: "ABRAÇOS" }));
  else if (tipo === "redes_sociais") blocos.push(novoBloco(tipo, { conteudo: "REDES SOCIAIS" }));
  else blocos.push(novoBloco(tipo));
  render();
}

function mover(i, d) {
  const j = i + d;
  if (j < 0 || j >= blocos.length) return;
  [blocos[i], blocos[j]] = [blocos[j], blocos[i]];
  render();
}
function remover(i) { blocos.splice(i, 1); render(); }

function render() {
  const ul = $("#lista-blocos");
  ul.innerHTML = "";
  let n = 0;
  blocos.forEach((b, i) => {
    const li = document.createElement("li");
    li.className = "bloco tipo-" + b.tipo;

    const ordem = document.createElement("div");
    ordem.className = "ordem";
    ordem.innerHTML = `<button title="Subir">▲</button><button title="Descer">▼</button>`;
    ordem.children[0].onclick = () => mover(i, -1);
    ordem.children[1].onclick = () => mover(i, +1);
    li.appendChild(ordem);

    const cont = document.createElement("div");
    cont.className = "conteudo";

    if (b.tipo === "banda") {
      n++;
      cont.innerHTML = `<span class="num">${n}.</span>`;
      const nome = mkInputMaiusculo(b, "nome", "Nome da banda", 180);
      const mus = mkInputMaiusculo(b, "musica", "Música", 150);
      const feat = mkInputMaiusculo(b, "feat", "FT. (opcional)", 110);
      const yt = mkInput(b, "youtube_link", "Link YouTube (opcional)", 170);
      const lanc = document.createElement("label");
      lanc.className = "lanc";
      lanc.innerHTML = `<input type="checkbox" ${b.lancamento ? "checked" : ""}> Lançamento`;
      lanc.querySelector("input").onchange = (e) => b.lancamento = e.target.checked;
      const btnYt = document.createElement("button");
      btnYt.textContent = "▶ clipe";
      btnYt.className = "sec";
      btnYt.onclick = () => preverClipe(b, li);
      cont.append(nome, mus, feat, lanc, yt, btnYt);
    } else if (b.tipo === "comercial") {
      cont.innerHTML = `<span class="fixo">COMERCIAL</span><span class="tag">bloco fixo</span>`;
    } else {
      const inp = mkInput(b, "conteudo", "Texto que aparece na ficha", 380);
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = ROTULO[b.tipo] || b.tipo;
      cont.append(inp, tag);
    }

    li.appendChild(cont);

    const rm = document.createElement("button");
    rm.className = "rm";
    rm.textContent = "✕";
    rm.title = "Remover";
    rm.onclick = () => remover(i);
    li.appendChild(rm);

    ul.appendChild(li);
  });
}

function mkInput(obj, campo, ph, largura) {
  const inp = document.createElement("input");
  inp.type = "text";
  inp.placeholder = ph;
  inp.value = obj[campo] || "";
  inp.style.width = largura + "px";
  inp.oninput = (e) => obj[campo] = e.target.value;
  return inp;
}

// Igual ao mkInput, mas força CAIXA ALTA enquanto digita, preservando o cursor.
function mkInputMaiusculo(obj, campo, ph, largura) {
  const inp = document.createElement("input");
  inp.type = "text";
  inp.placeholder = ph;
  inp.value = (obj[campo] || "").toUpperCase();
  inp.style.width = largura + "px";
  inp.oninput = (e) => {
    const pos = e.target.selectionStart;
    const maiusculo = e.target.value.toUpperCase();
    if (e.target.value !== maiusculo) {
      e.target.value = maiusculo;
      e.target.setSelectionRange(pos, pos);
    }
    obj[campo] = maiusculo;
  };
  return inp;
}

async function preverClipe(b, li) {
  const link = b.youtube_link?.trim();
  if (!link) { status("Cole o link do YouTube nessa banda primeiro."); return; }
  status("Buscando clipe…");
  try {
    const r = await api("/api/youtube/oembed?url=" + encodeURIComponent(link));
    li.querySelector(".yt-prev")?.remove();
    const div = document.createElement("div");
    div.className = "yt-prev";
    div.style.cssText = "flex-basis:100%;display:flex;gap:10px;align-items:center;margin-top:6px;font-size:13px;color:#444";
    if (r.ok) {
      div.innerHTML = `<img src="${r.thumbnail}" width="120" style="border-radius:6px">
        <div><b>${r.titulo}</b><br>${r.canal}</div>`;
      status("");
    } else {
      div.textContent = "Não consegui ler esse link.";
    }
    li.querySelector(".conteudo").appendChild(div);
  } catch (e) { status("Erro ao buscar clipe."); }
}

function preencherSelectPatrocinadores() {
  const sel = $("#sel-patrocinador");
  sel.innerHTML = `<option value="">+ Patrocinador…</option>`;
  bandas.filter(b => b.tipo === "patrocinador" && !b.bloqueada).forEach(b => {
    const o = document.createElement("option");
    o.value = b.id;
    o.textContent = b.nome + (b.master ? " (MASTER)" : "");
    sel.appendChild(o);
  });
}
$("#sel-patrocinador").onchange = (e) => {
  const b = bandas.find(x => x.id == e.target.value);
  if (!b) return;
  if (b.bloqueada) { status("Essa banda está bloqueada e não pode entrar."); e.target.value = ""; return; }
  blocos.push(novoBloco("banda", { nome: b.nome, musica: b.musica_padrao || "", youtube_link: b.youtube_link || "", banda_id: b.id }));
  e.target.value = "";
  render();
};

document.querySelectorAll(".add").forEach(btn => btn.onclick = () => addBloco(btn.dataset.add));

$("#btn-sugerir").onclick = async () => {
  await sugerir();
  await incluirAutomaticos();
  render();
};
async function sugerir() {
  const s = await api("/api/proxima");
  $("#f-numero").value = s.numero;
  $("#f-exibicao").value = s.data_exibicao;
  $("#f-gravacao").value = s.data_gravacao;
}
$("#f-exibicao").onchange = async () => {
  const v = $("#f-exibicao").value.trim();
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    d.setDate(d.getDate() - 8);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    $("#f-gravacao").value = `${dd}/${mm}/${d.getFullYear()}`;
  }
};

async function incluirAutomaticos() {
  const exibicao = $("#f-exibicao").value.trim();
  const m = await api("/api/master");
  if (m && m.id && !blocos.some(b => b.banda_id === m.id)) {
    blocos.push(novoBloco("banda", { nome: m.nome, musica: m.musica_padrao || "", youtube_link: m.youtube_link || "", banda_id: m.id }));
  }
  if (exibicao) {
    const naVez = await api("/api/quem-toca?data_exibicao=" + encodeURIComponent(exibicao));
    naVez.forEach(b => {
      if (!blocos.some(x => x.banda_id === b.id)) {
        blocos.push(novoBloco("banda", { nome: b.nome, musica: b.musica_padrao || "", youtube_link: b.youtube_link || "", banda_id: b.id }));
      }
    });
  }
}

function montarFichaObj() {
  return {
    id: fichaId,
    numero: $("#f-numero").value.trim(),
    data_exibicao: $("#f-exibicao").value.trim(),
    data_gravacao: $("#f-gravacao").value.trim(),
    blocos,
  };
}

$("#btn-salvar").onclick = async () => {
  if (!$("#f-numero").value.trim()) { status("Informe o número do programa."); return; }
  const f = await api("/api/fichas", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(montarFichaObj()),
  });
  fichaId = f.id;
  status("Ficha salva ✓");
};

$("#btn-word").onclick = async () => {
  const r = await fetch("/api/preview/docx", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(montarFichaObj()),
  });
  const blob = await r.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ficha_${$("#f-numero").value.trim() || "nova"}.docx`;
  a.click();
  status("Word gerado ✓");
};

$("#btn-limpar").onclick = async () => {
  blocos = []; fichaId = null;
  $("#f-numero").value = ""; $("#f-exibicao").value = ""; $("#f-gravacao").value = "";
  await novaFicha();
};

async function novaFicha() {
  await sugerir();
  await incluirAutomaticos();
  render();
}

async function carregarBandas(busca = "") {
  bandas = await api("/api/bandas?busca=" + encodeURIComponent(busca));
  preencherSelectPatrocinadores();
  const tb = $("#tab-bandas tbody");
  tb.innerHTML = "";
  bandas.forEach(b => {
    const tr = document.createElement("tr");
    const freq = b.master ? "—" : (b.tipo === "patrocinador" ? `<span class="pill freq">${ROTULO_FREQ[b.frequencia] || b.frequencia}</span>` : "—");
    tr.innerHTML = `
      <td>${b.nome}</td>
      <td>${b.tipo === "patrocinador" ? "Patrocinador" : "Aleatória"}</td>
      <td>${freq}</td>
      <td>${b.master ? '<span class="pill master">MASTER</span>' : ""}</td>
      <td>${b.bloqueada ? '<span class="pill bloq">BLOQUEADA</span>' : ""}</td>
      <td>${b.ultima_vez || ""}</td>
      <td>${b.musica_padrao || ""}</td>
      <td class="linha-acoes"></td>`;
    const ed = document.createElement("button"); ed.textContent = "editar"; ed.className = "sec";
    ed.onclick = () => abrirModalBanda(b);
    const ex = document.createElement("button"); ex.textContent = "excluir"; ex.className = "sec";
    ex.onclick = async () => { if (confirm("Excluir " + b.nome + "?")) { await api("/api/bandas/" + b.id, { method: "DELETE" }); carregarBandas($("#busca-banda").value); } };
    tr.querySelector(".linha-acoes").append(ed, ex);
    tb.appendChild(tr);
  });
}
$("#busca-banda").oninput = (e) => carregarBandas(e.target.value);
$("#btn-nova-banda").onclick = () => abrirModalBanda(null);

function atualizarVisibilidadeFrequencia() {
  const ehPatrocComum = $("#b-tipo").value === "patrocinador" && !$("#b-master").checked;
  $("#bloco-frequencia").classList.toggle("oculto", !ehPatrocComum);
}
$("#b-tipo").onchange = atualizarVisibilidadeFrequencia;
$("#b-master").onchange = atualizarVisibilidadeFrequencia;

function abrirModalBanda(b) {
  $("#modal-titulo").textContent = b ? "Editar banda" : "Nova banda";
  $("#b-id").value = b?.id || "";
  $("#b-nome").value = b?.nome || "";
  $("#b-tipo").value = b?.tipo || "patrocinador";
  $("#b-master").checked = !!b?.master;
  $("#b-bloqueada").checked = !!b?.bloqueada;
  $("#b-frequencia").value = b?.frequencia || "alternado";
  $("#b-ultima-vez").value = b?.ultima_vez || "";
  $("#b-musica").value = b?.musica_padrao || "";
  $("#b-youtube").value = b?.youtube_link || "";
  $("#b-obs").value = b?.observacoes || "";
  atualizarVisibilidadeFrequencia();
  $("#modal-banda").classList.remove("oculto");
}
$("#b-cancelar").onclick = () => $("#modal-banda").classList.add("oculto");
$("#b-salvar").onclick = async () => {
  const banda = {
    id: $("#b-id").value ? +$("#b-id").value : null,
    nome: $("#b-nome").value.trim(),
    tipo: $("#b-tipo").value,
    master: $("#b-master").checked ? 1 : 0,
    bloqueada: $("#b-bloqueada").checked ? 1 : 0,
    frequencia: $("#b-frequencia").value,
    ultima_vez: $("#b-ultima-vez").value.trim(),
    musica_padrao: $("#b-musica").value.trim(),
    youtube_link: $("#b-youtube").value.trim(),
    observacoes: $("#b-obs").value.trim(),
  };
  if (!banda.nome) { alert("Informe o nome."); return; }
  await api("/api/bandas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(banda) });
  $("#modal-banda").classList.add("oculto");
  carregarBandas($("#busca-banda").value);
};

async function carregarHistorico() {
  const fichas = await api("/api/fichas");
  const tb = $("#tab-fichas tbody");
  tb.innerHTML = "";
  fichas.forEach(f => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${f.numero}</td><td>${f.data_exibicao}</td><td>${f.data_gravacao}</td><td>${f.criado_em}</td><td class="linha-acoes"></td>`;
    const ab = document.createElement("button"); ab.textContent = "abrir"; ab.className = "sec";
    ab.onclick = () => abrirFicha(f.id);
    const dup = document.createElement("button"); dup.textContent = "duplicar"; dup.className = "sec";
    dup.onclick = async () => { const nova = await api("/api/fichas/" + f.id + "/duplicar", { method: "POST" }); carregarFichaNoEditor(nova); status("Duplicada — ajuste e salve."); };
    const wd = document.createElement("button"); wd.textContent = "word"; wd.className = "sec";
    wd.onclick = async () => { const r = await fetch("/api/fichas/" + f.id + "/docx", { method: "POST" }); const blob = await r.blob(); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `ficha_${f.numero}.docx`; a.click(); };
    const ex = document.createElement("button"); ex.textContent = "excluir"; ex.className = "sec";
    ex.onclick = async () => { if (confirm("Excluir ficha " + f.numero + "?")) { await api("/api/fichas/" + f.id, { method: "DELETE" }); carregarHistorico(); } };
    tr.querySelector(".linha-acoes").append(ab, dup, wd, ex);
    tb.appendChild(tr);
  });
}

async function abrirFicha(id) {
  const f = await api("/api/fichas/" + id);
  carregarFichaNoEditor(f);
}
function carregarFichaNoEditor(f) {
  fichaId = f.id;
  blocos = f.blocos || [];
  $("#f-numero").value = f.numero || "";
  $("#f-exibicao").value = f.data_exibicao || "";
  $("#f-gravacao").value = f.data_gravacao || "";
  document.querySelector('.tab[data-view="montar"]').click();
  render();
}

// ---- Sortear bandas de uma playlist do YouTube ----
$("#pl-sortear").onclick = async () => {
  const url = $("#pl-url").value.trim();
  if (!url) { $("#pl-status").textContent = "Cole o link da playlist."; return; }
  const qtd = +$("#pl-qtd").value || 10;
  $("#pl-status").textContent = "Buscando na playlist… (alguns segundos)";
  try {
    const r = await api("/api/playlist/sortear", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, quantidade: qtd }),
    });
    if (!r.ok) { $("#pl-status").textContent = "Erro: " + r.erro; return; }
    $("#pl-status").textContent = `${r.bandas.length} bandas sorteadas — marque as que vão entrar e ajuste se precisar:`;
    renderResultadoPlaylist(r.bandas);
  } catch (e) { $("#pl-status").textContent = "Falha ao buscar a playlist."; }
};

function renderResultadoPlaylist(lista) {
  const div = $("#pl-resultado");
  div.innerHTML = "";
  lista.forEach((b) => {
    const linha = document.createElement("div");
    linha.className = "pl-item";
    const chk = document.createElement("input"); chk.type = "checkbox";
    const nome = document.createElement("input");
    nome.type = "text"; nome.value = (b.nome || "").toUpperCase();
    nome.oninput = () => { nome.value = nome.value.toUpperCase(); };
    const mus = document.createElement("input");
    mus.type = "text"; mus.value = (b.musica || "").toUpperCase(); mus.placeholder = "música";
    mus.oninput = () => { mus.value = mus.value.toUpperCase(); };
    linha.append(chk, nome, mus);
    if (b.incompleto) {
      const aviso = document.createElement("span");
      aviso.className = "tag";
      aviso.title = "Título fora do padrão — confira nome/música antes de marcar";
      aviso.textContent = "⚠ confira";
      linha.appendChild(aviso);
    }
    linha._pega = () => ({ marcado: chk.checked, nome: nome.value, musica: mus.value, lancamento: b.lancamento, youtube_link: b.youtube_link });
    div.appendChild(linha);
  });
  const btn = document.createElement("button");
  btn.className = "add pl-add-sel";
  btn.textContent = "+ Adicionar selecionadas à ficha";
  btn.onclick = () => {
    let n = 0;
    div.querySelectorAll(".pl-item").forEach(linha => {
      const d = linha._pega();
      if (d.marcado) {
        blocos.push(novoBloco("banda", { nome: d.nome, musica: d.musica, lancamento: d.lancamento, youtube_link: d.youtube_link }));
        n++;
      }
    });
    if (n) { render(); status(n + " banda(s) adicionada(s) à ficha"); div.innerHTML = ""; $("#pl-url").value = ""; $("#pl-status").textContent = ""; }
  };
  div.appendChild(btn);
}

// ---- Sortear a ordem das atrações entre si ----
$("#btn-sortear-ordem").onclick = () => {
  const idx = [];
  blocos.forEach((b, i) => { if (b.tipo === "banda") idx.push(i); });
  const arr = idx.map(i => blocos[i]);
  for (let k = arr.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [arr[k], arr[j]] = [arr[j], arr[k]];
  }
  idx.forEach((pos, n) => blocos[pos] = arr[n]);
  render();
  status("Ordem das atrações sorteada 🎲");
};

(async function init() {
  bandas = await api("/api/bandas");
  preencherSelectPatrocinadores();
  await novaFicha();
})();
