// ===== Estado =====
let blocos = [];
let modeloBlocos = [];
let bandas = [];
let fichaId = null;

const $ = (s) => document.querySelector(s);
const api = async (url, opts) => {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error((await r.text()) || r.status);
  return r.json();
};
const status = (msg) => { $("#status").textContent = msg; if (msg) setTimeout(() => $("#status").textContent = "", 4000); };
const clone = (x) => JSON.parse(JSON.stringify(x));

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
  if (t.dataset.view === "modelo") carregarModelo();
});

function novoBloco(tipo, extra = {}) {
  return Object.assign({
    tipo, nome: "", musica: "", feat: "", lancamento: false,
    conteudo: "", youtube_link: "", banda_id: null,
  }, extra);
}

function renderEditor(arr, ul, reRender) {
  ul.innerHTML = "";
  let n = 0;
  arr.forEach((b, i) => {
    const li = document.createElement("li");
    li.className = "bloco tipo-" + b.tipo;

    const ordem = document.createElement("div");
    ordem.className = "ordem";
    ordem.innerHTML = `<button title="Subir">▲</button><button title="Descer">▼</button>`;
    ordem.children[0].onclick = () => { mover(arr, i, -1); reRender(); };
    ordem.children[1].onclick = () => { mover(arr, i, +1); reRender(); };
    li.appendChild(ordem);

    const cont = document.createElement("div");
    cont.className = "conteudo";

    if (b.tipo === "banda") {
      const preenchida = (b.nome || "").trim() !== "";
      if (preenchida) { n++; cont.innerHTML = `<span class="num">${n}.</span>`; }
      else { cont.innerHTML = `<span class="num vaga">vaga</span>`; }
      const nome = mkInputMaiusculo(b, "nome", "Nome da banda", 180);
      const mus = mkInputMaiusculo(b, "musica", "Música", 150);
      const feat = mkInputMaiusculo(b, "feat", "FT. (opcional)", 110);
      const yt = mkInput(b, "youtube_link", "Link YouTube (opcional)", 170);
      const lanc = document.createElement("label");
      lanc.className = "lanc";
      lanc.innerHTML = `<input type="checkbox" ${b.lancamento ? "checked" : ""}> Lançamento`;
      lanc.querySelector("input").onchange = (e) => b.lancamento = e.target.checked;
      const btnYt = document.createElement("button");
      btnYt.textContent = "▶ clipe"; btnYt.className = "sec";
      btnYt.onclick = () => preverClipe(b, li);
      cont.append(nome, mus, feat, lanc, yt, btnYt);
      if (b.banda_id) {
        const btnFixar = document.createElement("button");
        btnFixar.textContent = "💾 fixar música"; btnFixar.className = "sec";
        btnFixar.title = "Salva esta música como padrão dessa banda, pra já vir preenchida nas próximas fichas";
        btnFixar.onclick = () => fixarMusicaPadrao(b, btnFixar);
        cont.appendChild(btnFixar);
      }
    } else if (b.tipo === "comercial") {
      cont.innerHTML = `<span class="fixo">COMERCIAL</span><span class="tag">bloco fixo</span>`;
    } else {
      const inp = mkInput(b, "conteudo", "Texto que aparece na ficha", 380);
      const tag = document.createElement("span");
      tag.className = "tag"; tag.textContent = ROTULO[b.tipo] || b.tipo;
      cont.append(inp, tag);
    }

    li.appendChild(cont);

    const rm = document.createElement("button");
    rm.className = "rm"; rm.textContent = "✕"; rm.title = "Remover";
    rm.onclick = () => { arr.splice(i, 1); reRender(); };
    li.appendChild(rm);

    ul.appendChild(li);
  });
}

function mover(arr, i, d) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

function renderFicha() {
  renderEditor(blocos, $("#lista-blocos"), renderFicha);
  if ($("#pat-resultado").dataset.aberto === "1") renderPainelPatrocinadores();
}
function renderModelo() { renderEditor(modeloBlocos, $("#lista-blocos-modelo"), renderModelo); }

function mkInput(obj, campo, ph, largura) {
  const inp = document.createElement("input");
  inp.type = "text"; inp.placeholder = ph;
  inp.value = obj[campo] || ""; inp.style.width = largura + "px";
  inp.oninput = (e) => obj[campo] = e.target.value;
  return inp;
}

function mkInputMaiusculo(obj, campo, ph, largura) {
  const inp = document.createElement("input");
  inp.type = "text"; inp.placeholder = ph;
  inp.value = (obj[campo] || "").toUpperCase(); inp.style.width = largura + "px";
  inp.oninput = (e) => {
    const pos = e.target.selectionStart;
    const maiusculo = e.target.value.toUpperCase();
    if (e.target.value !== maiusculo) { e.target.value = maiusculo; e.target.setSelectionRange(pos, pos); }
    obj[campo] = maiusculo;
  };
  return inp;
}

function adicionarBandaNaFicha(dados) {
  if (dados.banda_id && blocos.some(b => b.tipo === "banda" && b.banda_id === dados.banda_id)) {
    status(`Não dá pra repetir banda patrocinadora: ${dados.nome} já está nessa ficha.`);
    return false;
  }
  const vaga = blocos.find(b => b.tipo === "banda" && !(b.nome || "").trim());
  if (vaga) Object.assign(vaga, dados);
  else blocos.push(novoBloco("banda", dados));
  return true;
}

async function fixarMusicaPadrao(b, btn) {
  const banda = bandas.find(x => x.id === b.banda_id);
  if (!banda) { status("Não achei o cadastro dessa banda."); return; }
  const musica = (b.musica || "").trim();
  if (!musica) { status("Digite a música antes de fixar."); return; }
  const atualizada = Object.assign({}, banda, {
    musica_padrao: musica,
    youtube_link: (b.youtube_link || banda.youtube_link || ""),
  });
  await api("/api/bandas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(atualizada) });
  banda.musica_padrao = musica;
  const original = btn.textContent;
  btn.textContent = "✓ fixado";
  setTimeout(() => { btn.textContent = original; }, 1500);
  status(`"${musica}" fixada como padrão de ${banda.nome}`);
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
      div.innerHTML = `<img src="${r.thumbnail}" width="120" style="border-radius:6px"><div><b>${r.titulo}</b><br>${r.canal}</div>`;
      status("");
    } else { div.textContent = "Não consegui ler esse link."; }
    li.querySelector(".conteudo").appendChild(div);
  } catch (e) { status("Erro ao buscar clipe."); }
}

// ===== Painel de patrocinadores (checkbox) =====
let _naVezCache = new Set();

$("#btn-patrocinadores").onclick = async () => {
  const div = $("#pat-resultado");
  if (div.dataset.aberto === "1") { div.innerHTML = ""; div.dataset.aberto = "0"; return; }
  div.dataset.aberto = "1";
  _naVezCache = new Set();
  const exib = $("#f-exibicao").value.trim();
  if (exib) {
    try { (await api("/api/quem-toca?data_exibicao=" + encodeURIComponent(exib))).forEach(b => _naVezCache.add(b.id)); } catch (e) {}
  }
  renderPainelPatrocinadores();
};

function renderPainelPatrocinadores() {
  const div = $("#pat-resultado");
  const lista = bandas.filter(b => b.tipo === "patrocinador" && !b.bloqueada);
  const idsNaFicha = new Set(blocos.filter(b => b.tipo === "banda" && b.banda_id).map(b => b.banda_id));
  div.innerHTML = "";
  lista.forEach(b => {
    const linha = document.createElement("div");
    linha.className = "pat-item";
    const jaNaFicha = idsNaFicha.has(b.id);
    const chk = document.createElement("input"); chk.type = "checkbox"; chk.dataset.id = b.id;
    if (jaNaFicha) { chk.checked = true; chk.disabled = true; }
    const nome = document.createElement("span"); nome.textContent = b.nome + (b.master ? " (MASTER)" : "");
    linha.append(chk, nome);
    if (jaNaFicha) {
      const tag = document.createElement("span"); tag.className = "tag dica";
      tag.textContent = "já na ficha"; linha.appendChild(tag);
    } else if (b.master || _naVezCache.has(b.id)) {
      const dica = document.createElement("span"); dica.className = "tag dica";
      dica.textContent = b.master ? "toca sempre" : "na vez";
      linha.appendChild(dica);
    }
    div.appendChild(linha);
  });
  const btn = document.createElement("button");
  btn.className = "add pl-add-sel"; btn.textContent = "+ Adicionar marcados à ficha";
  btn.onclick = () => {
    let n = 0, repetidas = 0;
    div.querySelectorAll(".pat-item input:checked:not(:disabled)").forEach(chk => {
      const b = bandas.find(x => x.id == chk.dataset.id);
      if (b) {
        const ok = adicionarBandaNaFicha({ nome: b.nome.toUpperCase(), musica: (b.musica_padrao || "").toUpperCase(), youtube_link: b.youtube_link || "", banda_id: b.id });
        if (ok) n++; else repetidas++;
      }
    });
    if (n) { renderFicha(); status(n + " patrocinador(es) adicionado(s)" + (repetidas ? ` — ${repetidas} já estavam na ficha` : "")); }
    else if (repetidas) { status("Essas bandas já estão na ficha."); }
  };
  div.appendChild(btn);
}

document.querySelectorAll("#view-montar .add[data-add]").forEach(btn => btn.onclick = () => {
  const tipo = btn.dataset.add;
  if (tipo === "banda") blocos.push(novoBloco("banda"));
  else if (tipo === "abracos") blocos.push(novoBloco(tipo, { conteudo: "ABRAÇOS" }));
  else if (tipo === "redes_sociais") blocos.push(novoBloco(tipo, { conteudo: "REDES SOCIAIS" }));
  else blocos.push(novoBloco(tipo));
  renderFicha();
});

$("#btn-sugerir").onclick = async () => { await sugerir(); };
async function sugerir() {
  const s = await api("/api/proxima");
  $("#f-numero").value = s.numero;
  $("#f-exibicao").value = s.data_exibicao;
  $("#f-gravacao").value = s.data_gravacao;
}
$("#f-exibicao").onchange = () => {
  const m = $("#f-exibicao").value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(+m[3], +m[2] - 1, +m[1]); d.setDate(d.getDate() - 8);
    const dd = String(d.getDate()).padStart(2, "0"), mm = String(d.getMonth() + 1).padStart(2, "0");
    $("#f-gravacao").value = `${dd}/${mm}/${d.getFullYear()}`;
  }
};

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
  const f = await api("/api/fichas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(montarFichaObj()) });
  fichaId = f.id;
  status("Ficha salva ✓");
};

$("#btn-word").onclick = async () => {
  const r = await fetch("/api/preview/docx", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(montarFichaObj()) });
  const blob = await r.blob();
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `ficha_${$("#f-numero").value.trim() || "nova"}.docx`; a.click();
  status("Word gerado ✓");
};

$("#btn-limpar").onclick = async () => { await novaFicha(); };

async function novaFicha() {
  fichaId = null;
  const m = await api("/api/modelo");
  blocos = clone(m.blocos || []);
  await sugerir();
  renderFicha();
}

$("#pl-sortear").onclick = async () => {
  const url = $("#pl-url").value.trim();
  if (!url) { $("#pl-status").textContent = "Cole o link da playlist."; return; }
  const qtd = +$("#pl-qtd").value || 10;
  $("#pl-status").textContent = "Buscando na playlist… (alguns segundos)";
  try {
    const r = await api("/api/playlist/sortear", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, quantidade: qtd }) });
    if (!r.ok) { $("#pl-status").textContent = "Erro: " + r.erro; return; }
    $("#pl-status").textContent = `${r.bandas.length} bandas sorteadas — marque as que vão entrar:`;
    renderResultadoPlaylist(r.bandas);
  } catch (e) { $("#pl-status").textContent = "Falha ao buscar a playlist."; }
};

function renderResultadoPlaylist(lista) {
  const div = $("#pl-resultado");
  div.innerHTML = "";
  lista.forEach((b) => {
    const linha = document.createElement("div"); linha.className = "pl-item";
    const chk = document.createElement("input"); chk.type = "checkbox";
    const nome = document.createElement("input"); nome.type = "text"; nome.value = (b.nome || "").toUpperCase();
    nome.oninput = () => { nome.value = nome.value.toUpperCase(); };
    const mus = document.createElement("input"); mus.type = "text"; mus.value = (b.musica || "").toUpperCase(); mus.placeholder = "música";
    mus.oninput = () => { mus.value = mus.value.toUpperCase(); };
    linha.append(chk, nome, mus);
    if (b.incompleto) {
      const aviso = document.createElement("span"); aviso.className = "tag";
      aviso.title = "Título fora do padrão — confira antes de marcar"; aviso.textContent = "⚠ confira";
      linha.appendChild(aviso);
    }
    linha._pega = () => ({ marcado: chk.checked, nome: nome.value, musica: mus.value, lancamento: b.lancamento, youtube_link: b.youtube_link });
    div.appendChild(linha);
  });
  const btn = document.createElement("button");
  btn.className = "add pl-add-sel"; btn.textContent = "+ Adicionar selecionadas à ficha";
  btn.onclick = () => {
    let n = 0;
    div.querySelectorAll(".pl-item").forEach(linha => {
      const d = linha._pega();
      if (d.marcado) { adicionarBandaNaFicha({ nome: d.nome, musica: d.musica, lancamento: d.lancamento, youtube_link: d.youtube_link }); n++; }
    });
    if (n) { renderFicha(); status(n + " banda(s) adicionada(s)"); div.innerHTML = ""; $("#pl-url").value = ""; $("#pl-status").textContent = ""; }
  };
  div.appendChild(btn);
}

$("#btn-sortear-ordem").onclick = () => {
  const idx = [];
  blocos.forEach((b, i) => { if (b.tipo === "banda" && (b.nome || "").trim()) idx.push(i); });
  const arr = idx.map(i => blocos[i]);
  for (let k = arr.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [arr[k], arr[j]] = [arr[j], arr[k]]; }
  idx.forEach((pos, n) => blocos[pos] = arr[n]);
  renderFicha();
  status("Ordem das atrações sorteada 🎲");
};

async function carregarModelo() {
  const m = await api("/api/modelo");
  modeloBlocos = clone(m.blocos || []);
  renderModelo();
}
document.querySelectorAll("#view-modelo .add[data-add]").forEach(btn => btn.onclick = () => {
  const tipo = btn.dataset.add;
  if (tipo === "banda") modeloBlocos.push(novoBloco("banda"));
  else if (tipo === "abracos") modeloBlocos.push(novoBloco(tipo, { conteudo: "ABRAÇOS" }));
  else if (tipo === "redes_sociais") modeloBlocos.push(novoBloco(tipo, { conteudo: "REDES SOCIAIS" }));
  else modeloBlocos.push(novoBloco(tipo));
  renderModelo();
});
$("#btn-salvar-modelo").onclick = async () => {
  await api("/api/modelo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocos: modeloBlocos }) });
  $("#modelo-status").textContent = "Modelo salvo ✓ (vai aparecer nas próximas fichas novas)";
  setTimeout(() => $("#modelo-status").textContent = "", 4000);
};
$("#btn-restaurar-modelo").onclick = async () => {
  if (!confirm("Restaurar o modelo padrão da foto? Isso descarta o modelo atual.")) return;
  await api("/api/modelo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocos: [] }) });
  await carregarModelo();
  $("#modelo-status").textContent = "Modelo restaurado ao padrão ✓";
  setTimeout(() => $("#modelo-status").textContent = "", 4000);
};

async function carregarBandas(busca = "") {
  bandas = await api("/api/bandas?busca=" + encodeURIComponent(busca));
  const tb = $("#tab-bandas tbody"); tb.innerHTML = "";
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
    const ed = document.createElement("button"); ed.textContent = "editar"; ed.className = "sec"; ed.onclick = () => abrirModalBanda(b);
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
    nome: $("#b-nome").value.trim(), tipo: $("#b-tipo").value,
    master: $("#b-master").checked ? 1 : 0, bloqueada: $("#b-bloqueada").checked ? 1 : 0,
    frequencia: $("#b-frequencia").value, ultima_vez: $("#b-ultima-vez").value.trim(),
    musica_padrao: $("#b-musica").value.trim(), youtube_link: $("#b-youtube").value.trim(),
    observacoes: $("#b-obs").value.trim(),
  };
  if (!banda.nome) { alert("Informe o nome."); return; }
  await api("/api/bandas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(banda) });
  $("#modal-banda").classList.add("oculto");
  carregarBandas($("#busca-banda").value);
};

async function carregarHistorico() {
  const fichas = await api("/api/fichas");
  const tb = $("#tab-fichas tbody"); tb.innerHTML = "";
  fichas.forEach(f => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${f.numero}</td><td>${f.data_exibicao}</td><td>${f.data_gravacao}</td><td>${f.criado_em}</td><td class="linha-acoes"></td>`;
    const ab = document.createElement("button"); ab.textContent = "abrir"; ab.className = "sec"; ab.onclick = () => abrirFicha(f.id);
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
async function abrirFicha(id) { carregarFichaNoEditor(await api("/api/fichas/" + id)); }
function carregarFichaNoEditor(f) {
  fichaId = f.id; blocos = f.blocos || [];
  $("#f-numero").value = f.numero || "";
  $("#f-exibicao").value = f.data_exibicao || "";
  $("#f-gravacao").value = f.data_gravacao || "";
  document.querySelector('.tab[data-view="montar"]').click();
  renderFicha();
}

(async function init() {
  bandas = await api("/api/bandas");
  await novaFicha();
})();
