(function () {
  "use strict";

  const D = window.CANDIDATOS, S = window.Store;
  const ordenar = (l) => l.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  // Cargos na ordem da votação, com índices por número e por prefixo de partido
  const CARGOS = S.CARGOS.map((c) => {
    const lista = ordenar(D[c.dados]), porNumero = new Map(), porPrefixo = new Map();
    for (const x of lista) {
      if (!porNumero.has(x.numero)) porNumero.set(x.numero, []);
      porNumero.get(x.numero).push(x);
      const p = x.numero.slice(0, 2);
      if (!porPrefixo.has(p)) porPrefixo.set(p, x);
    }
    return Object.assign({}, c, { lista, porNumero, porPrefixo });
  });
  // Uma etapa por voto (senador tem dois votos)
  const ETAPAS = CARGOS.flatMap((c) => Array.from({ length: c.votos }, (_, i) => ({ cargo: c, voto: i + 1 })));

  let codigo = null;      // número do eleitor logado
  let etapa = 0;
  let cedula = [];        // votos já confirmados, só na memória até o fim
  let digitos = "";
  let estado = "votando"; // votando | branco | fim
  let tentativas = 0;     // confirmações seguidas em número inexistente
  let fimTimer = null;
  let cargoDaLista = null;
  const MAX_TENTATIVAS = 3; // 1º aviso + mais 2 insistências = nulo

  const $ = (id) => document.getElementById(id);
  const tela = $("tela");
  const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const atual = () => ETAPAS[etapa];

  /* ---------------- Sons ---------------- */
  const SONS = { tecla: new Audio("sons/tecla.mp3"), confirma: new Audio("sons/confirma.mp3") };
  Object.values(SONS).forEach((a) => { a.preload = "auto"; });
  function tocar(nome) {
    try { const a = SONS[nome]; a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* sem áudio */ }
  }

  /* ---------------- Entrada do eleitor ---------------- */
  $("login").addEventListener("submit", (e) => {
    e.preventDefault();
    const c = S.codigoValido($("codigo").value.trim());
    if (!c) { $("erro").textContent = "Número inválido. Digite um número de 001 a " + S.MAX + "."; return; }
    if (S.jaVotou(c)) { $("erro").textContent = "O número " + c + " já votou. Cada eleitor vota uma única vez."; return; }
    $("erro").textContent = "";
    codigo = c; etapa = 0; cedula = [];
    $("entrada").hidden = true; $("votacao").hidden = false;
    document.activeElement.blur();
    iniciarEtapa();
  });

  function sair(msg) {
    clearTimeout(fimTimer);
    codigo = null; cedula = []; etapa = 0; digitos = ""; estado = "votando"; tentativas = 0; cargoDaLista = null;
    $("votacao").hidden = true; $("entrada").hidden = false;
    $("codigo").value = ""; $("erro").textContent = msg || "";
    $("codigo").focus();
  }
  $("btn-sair").addEventListener("click", () => {
    if (estado === "fim" || confirm("Sair sem votar? Os votos desta cédula serão descartados e o número continua livre.")) sair();
  });

  /* ---------------- Urna ---------------- */
  function iniciarEtapa() {
    digitos = ""; estado = "votando"; tentativas = 0;
    const c = atual().cargo;
    if (cargoDaLista !== c.id) { cargoDaLista = c.id; $("busca").value = ""; montarPartidos(); }
    $("lista-titulo").textContent = c.rotulo + " (" + c.lista.length + " candidatos)";
    renderLista(); renderTela();
  }

  function detalhes(c) {
    let h = '<span class="detalhe">Partido: ' + esc(c.partido) + " (" + esc(c.partido_nome) + ")</span>";
    if (c.federacao) h += '<span class="detalhe">' + esc(c.federacao) + "</span>";
    if (c.vice) h += '<span class="detalhe">Vice: ' + esc(c.vice) + "</span>";
    if (c.suplentes) h += '<span class="detalhe">Suplentes: ' + c.suplentes.map((x, i) => (i + 1) + "º " + esc(x)).join(", ") + "</span>";
    return h;
  }
  const repetido = () => atual().voto > 1 && cedula.some((v) => v.cargo === atual().cargo.id && v.chave === digitos);

  function renderTela() {
    const et = atual(), cfg = et.cargo;
    tela.className = "tela";

    if (estado === "fim") {
      tela.className = "tela fim";
      tela.innerHTML = '<p class="grande">FIM</p><p>Voto registrado. Obrigado por participar.</p>';
      return;
    }

    let html = '<p class="pre">Seu voto para (' + (etapa + 1) + " de " + ETAPAS.length + ')</p><h2 class="cargo">' +
      cfg.rotulo + (cfg.votos > 1 ? ", " + et.voto + "º voto" : "") + "</h2>";

    if (estado === "branco") {
      tela.innerHTML = html + '<p class="nulo">VOTO EM BRANCO</p><p class="instrucao">Verde para CONFIRMAR ou laranja para CORRIGIR.</p>';
      return;
    }

    html += '<div class="digitos" aria-label="Número digitado">';
    for (let i = 0; i < cfg.digitos; i++) html += '<span class="digito' + (i === digitos.length ? " ativo" : "") + '">' + (digitos[i] || "") + "</span>";
    html += "</div>";

    if (digitos.length === cfg.digitos) {
      const achados = cfg.porNumero.get(digitos);
      if (achados) {
        if (achados.length > 1) html += '<p class="aviso">Este número aparece em ' + achados.length + " registros nos dados.</p>";
        for (const c of achados) html += '<div class="candidato"><span class="nome">' + esc(c.nome) + "</span>" + detalhes(c) + "</div>";
        if (repetido()) html += '<p class="aviso">Você já votou neste candidato no 1º voto. Corrija e escolha outro, ou vote em branco.</p>';
      } else {
        const falta = MAX_TENTATIVAS - tentativas;
        html += '<p class="nulo">NÚMERO INEXISTENTE</p>' +
          (tentativas === 0
            ? '<p class="aviso">Nenhum candidato tem este número. Corrija ou insista: após ' + MAX_TENTATIVAS + " confirmações o voto será nulo.</p>"
            : '<p class="aviso">Aviso ' + tentativas + " de " + (MAX_TENTATIVAS - 1) + ": número ainda inexistente. Confirme mais " + falta + (falta === 1 ? " vez" : " vezes") + " para votar nulo, ou corrija.</p>");
      }
      html += '<p class="instrucao">Verde para CONFIRMAR ou laranja para CORRIGIR.</p>';
    } else {
      const p = digitos.length >= 2 ? cfg.porPrefixo.get(digitos.slice(0, 2)) : null;
      if (p) html += '<div class="candidato"><span class="detalhe">Partido: ' + esc(p.partido) + " (" + esc(p.partido_nome) + ")</span></div>";
      html += '<p class="instrucao">Digite ' + cfg.digitos + " dígitos. Branco vota em branco (sem número digitado).</p>";
    }
    tela.innerHTML = html;
  }

  function digitar(d) {
    if (!codigo || estado !== "votando") return;
    if (digitos.length < atual().cargo.digitos) { digitos += d; tocar("tecla"); renderTela(); }
  }
  function corrigir() {
    if (!codigo || estado === "fim") return;
    digitos = ""; estado = "votando"; tentativas = 0; renderTela();
  }
  function branco() {
    if (codigo && estado === "votando" && digitos === "") { estado = "branco"; tocar("tecla"); renderTela(); }
  }
  function tremer() { tela.classList.add("balanca"); }

  function confirmar() {
    if (!codigo || estado === "fim") return;
    const cfg = atual().cargo;
    let chave = null;
    if (estado === "branco") chave = "_branco";
    else if (digitos.length === cfg.digitos) {
      if (cfg.porNumero.has(digitos)) {
        if (repetido()) { tocar("tecla"); tremer(); return; }
        chave = digitos;
      } else {
        tentativas++;
        if (tentativas < MAX_TENTATIVAS) { tocar("tecla"); renderTela(); tremer(); return; }
        chave = "_nulo";
      }
    }
    if (!chave) return;

    cedula.push({ cargo: cfg.id, chave });
    if (etapa < ETAPAS.length - 1) { tocar("tecla"); etapa++; iniciarEtapa(); return; }

    // Última etapa: grava a cédula inteira e marca o número como usado
    if (!S.registrarCedula(codigo, cedula)) { sair("O número " + codigo + " já votou. Cada eleitor vota uma única vez."); return; }
    tocar("confirma");
    estado = "fim"; renderTela();
    fimTimer = setTimeout(() => sair(), 3000);
  }

  document.querySelectorAll(".tecla[data-d]").forEach((b) => b.addEventListener("click", () => digitar(b.dataset.d)));
  $("btn-branco").addEventListener("click", branco);
  $("btn-corrige").addEventListener("click", corrigir);
  $("btn-confirma").addEventListener("click", confirmar);

  document.addEventListener("keydown", (e) => {
    if (!codigo || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (/^\d$/.test(e.key)) digitar(e.key);
    else if (e.key === "Enter") { if (e.target.tagName !== "BUTTON") confirmar(); }
    else if (e.key === "Backspace" || e.key === "Escape") corrigir();
  });

  /* ---------------- Lista de candidatos do cargo atual ---------------- */
  const busca = $("busca"), selPartido = $("partido");

  function montarPartidos() {
    const siglas = [...new Set(atual().cargo.lista.map((c) => c.partido))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    selPartido.innerHTML = '<option value="">Todos os partidos</option>' + siglas.map((s) => '<option value="' + esc(s) + '">' + esc(s) + "</option>").join("");
  }

  function renderLista() {
    if (!codigo) return;
    const q = norm(busca.value.trim()), p = selPartido.value;
    const itens = atual().cargo.lista.filter((c) => (!p || c.partido === p) && (!q || norm(c.nome).includes(q) || c.numero.startsWith(q)));
    $("resultado").textContent = itens.length + (itens.length === 1 ? " candidato" : " candidatos");
    $("lista").innerHTML = itens.length
      ? itens.map((c) =>
          '<li><button type="button" data-n="' + esc(c.numero) + '"><span class="num">' + esc(c.numero) +
          '</span><span><span class="nome">' + esc(c.nome) + '</span><span class="sigla">' + esc(c.partido) +
          (c.federacao ? ", " + esc(c.federacao) : "") + (c.vice ? ". Vice: " + esc(c.vice) : "") + "</span></span></button></li>").join("")
      : '<li class="vazio">Nenhum candidato encontrado. Tente outro nome, número ou partido.</li>';
  }

  $("lista").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-n]");
    if (!b || !codigo || estado === "fim") return;
    digitos = b.dataset.n; estado = "votando"; tentativas = 0;
    renderTela();
    $("urna").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  });
  busca.addEventListener("input", renderLista);
  selPartido.addEventListener("change", renderLista);

  $("btn-cheia").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  });

  $("codigo").focus();
})();
