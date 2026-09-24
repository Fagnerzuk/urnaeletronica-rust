(function () {
  "use strict";
  const D = window.CANDIDATOS;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const fmtN = (n) => n.toLocaleString("pt-BR");
  const pct = (v, t) => (t ? (v / t) * 100 : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  const CARGOS = window.Store.CARGOS.slice().reverse(); // do mais alto ao mais baixo
  const INFO = Object.fromEntries(CARGOS.map((c) => [c.id, c]));
  const LISTAS = Object.fromEntries(CARGOS.map((c) => [c.id, D[c.dados]]));
  const ROTULO = Object.fromEntries(CARGOS.map((c) => [c.id, c.rotulo]));

  let cargo = CARGOS[0].id;

  /* ---------- Acesso (barreira leve, no navegador) ---------- */
  async function hash(usuario, senha) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("urna-pe-2026:" + usuario + ":" + senha));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function mostrarPainel(ok) {
    $("login").hidden = ok; $("painel").hidden = !ok; $("sair").hidden = !ok;
    if (ok) { montarPartidos(); render(); }
  }
  $("login").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("erro").textContent = "";
    if (!window.crypto || !crypto.subtle) { $("erro").textContent = "Abra o site por https ou localhost para entrar."; return; }
    if (!window.ADMIN_HASH) { $("erro").textContent = "Acesso não configurado. Rode tools/definir_admin.py."; return; }
    const h = await hash($("usuario").value.trim(), $("senha").value);
    if (h === window.ADMIN_HASH) { sessionStorage.setItem("admin_ok", "1"); $("senha").value = ""; mostrarPainel(true); }
    else $("erro").textContent = "Usuário ou senha incorretos.";
  });
  $("sair").addEventListener("click", () => { sessionStorage.removeItem("admin_ok"); mostrarPainel(false); });

  /* ---------- Cálculo ---------- */
  function apurar(c) {
    const votos = window.Store.consolidado()[c] || {};
    const porNumero = new Map();
    for (const x of LISTAS[c]) {
      if (!porNumero.has(x.numero)) porNumero.set(x.numero, { numero: x.numero, nomes: [], partido: x.partido, votos: votos[x.numero] || 0, vice: x.vice || "" });
      porNumero.get(x.numero).nomes.push(x.nome);
    }
    const linhas = [...porNumero.values()].sort((a, b) => b.votos - a.votos || a.nomes[0].localeCompare(b.nomes[0], "pt-BR"));
    linhas.forEach((l, i) => { l.pos = l.votos ? i + 1 : null; });
    const validos = linhas.reduce((s, l) => s + l.votos, 0);
    const branco = votos._branco || 0, nulo = votos._nulo || 0;
    return { linhas, validos, branco, nulo, total: validos + branco + nulo };
  }

  /* ---------- Tela ---------- */
  function montarPartidos() {
    const siglas = [...new Set(LISTAS[cargo].map((c) => c.partido))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    $("partido").innerHTML = '<option value="">Todos os partidos</option>' + siglas.map((s) => "<option>" + esc(s) + "</option>").join("");
  }
  const barra = (v, t) => '<div class="barra"><span style="width:' + (t ? Math.min(100, (v / t) * 100) : 0).toFixed(2) + '%"></span></div>';

  function render() {
    if ($("painel").hidden) return;
    renderComparecimento();
    $("nota-cargo").textContent = INFO[cargo].votos > 1
      ? "Cada eleitor tem " + INFO[cargo].votos + " votos para " + INFO[cargo].rotulo.toLowerCase() + ". Os percentuais são sobre os votos, não sobre os eleitores."
      : "";
    const a = apurar(cargo);
    const lider = a.linhas[0] && a.linhas[0].votos ? a.linhas[0] : null;

    $("kpis").innerHTML =
      kpi("Total de votos", fmtN(a.total), "") +
      kpi("Votos válidos", fmtN(a.validos), pct(a.validos, a.total) + " do total") +
      kpi("Brancos", fmtN(a.branco), pct(a.branco, a.total) + " do total") +
      kpi("Nulos", fmtN(a.nulo), pct(a.nulo, a.total) + " do total") +
      kpi("Mais votado", lider ? esc(lider.nomes.join(" / ")) : "Sem votos", lider ? fmtN(lider.votos) + (lider.votos === 1 ? " voto, " : " votos, ") + pct(lider.votos, a.validos) + " dos válidos" : "");

    const q = norm($("busca").value.trim()), p = $("partido").value, zer = $("zerados").checked;
    const vis = a.linhas.filter((l) => (zer || l.votos) && (!p || l.partido === p) &&
      (!q || l.numero.startsWith(q) || norm(l.nomes.join(" ")).includes(q)));
    $("tab-cand").tBodies[0].innerHTML = vis.length
      ? vis.map((l) => "<tr><td>" + (l.pos || "-") + "</td><td><strong>" + esc(l.numero) + "</strong></td><td>" +
          esc(l.nomes.join(" / ")) + (l.nomes.length > 1 ? ' <small class="sub">(número em mais de um registro)</small>' : "") +
          (l.vice ? ' <small class="sub">Vice: ' + esc(l.vice) + "</small>" : "") +
          "</td><td>" + esc(l.partido) + '</td><td class="d">' + fmtN(l.votos) + '</td><td class="d">' + pct(l.votos, a.validos) +
          "</td><td>" + barra(l.votos, a.validos) + "</td></tr>").join("")
      : '<tr><td colspan="7" class="vazio">Nenhum voto para este filtro ainda.</td></tr>';

    const part = new Map();
    for (const l of a.linhas) part.set(l.partido, (part.get(l.partido) || 0) + l.votos);
    const ps = [...part.entries()].filter((e) => e[1] > 0).sort((x, y) => y[1] - x[1]);
    $("tab-part").tBodies[0].innerHTML = ps.length
      ? ps.map((e) => "<tr><td><strong>" + esc(e[0]) + '</strong></td><td class="d">' + fmtN(e[1]) + '</td><td class="d">' + pct(e[1], a.validos) + "</td><td>" + barra(e[1], a.validos) + "</td></tr>").join("")
      : '<tr><td colspan="4" class="vazio">Nenhum voto registrado ainda.</td></tr>';

    const urnas = window.Store.urnas();
    $("urnas").textContent = "Urnas somadas: " + urnas.length + " (este aparelho" + (urnas.length > 1 ? " e " + (urnas.length - 1) + " importada" + (urnas.length > 2 ? "s" : "") : "") + ").";
  }
  function renderComparecimento() {
    const c = window.Store.comparecimento(), max = window.Store.MAX, n = c.votaram.size;
    $("kpis-comp").innerHTML = kpi("Eleitores que votaram", fmtN(n) + " de " + fmtN(max), pct(n, max) + " dos números distribuídos") +
      kpi("Ainda não votaram", fmtN(max - n), pct(max - n, max));
    $("repetidos").hidden = !c.repetidos.length;
    $("repetidos").textContent = c.repetidos.length ? "Atenção: estes números aparecem em mais de uma urna (podem ter votado duas vezes): " + c.repetidos.join(", ") + "." : "";
    let h = "";
    for (let i = 1; i <= max; i++) { const k = String(i).padStart(3, "0"); h += '<span class="chip' + (c.votaram.has(k) ? " ok" : "") + '">' + k + "</span>"; }
    $("chips").innerHTML = h;
  }
  function kpi(rotulo, valor, sub) {
    return '<div class="kpi"><span class="k-rot">' + rotulo + '</span><span class="k-val">' + valor + "</span>" + (sub ? '<span class="k-sub">' + sub + "</span>" : "") + "</div>";
  }

  $("abas").innerHTML = CARGOS.map((c) => '<button class="aba" data-cargo="' + c.id + '" aria-pressed="' + (c.id === cargo) + '">' + c.rotulo + "</button>").join("");
  document.querySelectorAll(".aba").forEach((b) => b.addEventListener("click", () => {
    cargo = b.dataset.cargo;
    document.querySelectorAll(".aba").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $("busca").value = ""; montarPartidos(); render();
  }));
  $("busca").addEventListener("input", render);
  $("partido").addEventListener("change", render);
  $("zerados").addEventListener("change", render);

  /* ---------- Dados ---------- */
  function baixar(nome, tipo, texto) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
    a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const msg = (t) => { $("msg").textContent = t; };

  $("exp-json").addEventListener("click", () => {
    const e = window.Store.exportar();
    baixar("urna-" + e.urnaId.slice(0, 8) + ".json", "application/json", JSON.stringify(e));
    msg("Arquivo gerado com os votos deste aparelho.");
  });
  $("importar").addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { window.Store.importar(JSON.parse(r.result)); msg("Urna importada e somada à apuração."); render(); }
      catch (err) { msg("Não foi possível importar: " + err.message + "."); }
      e.target.value = "";
    };
    r.readAsText(f);
  });
  $("exp-csv").addEventListener("click", () => {
    const L = ["Cargo;Número;Candidato;Partido;Votos;% dos válidos"];
    for (const c of CARGOS.map((x) => x.id)) {
      const a = apurar(c);
      for (const l of a.linhas) L.push([ROTULO[c], l.numero, '"' + l.nomes.join(" / ").replace(/"/g, '""') + '"', l.partido, l.votos, pct(l.votos, a.validos)].join(";"));
      L.push([ROTULO[c], "", "Brancos", "", a.branco, ""].join(";"), [ROTULO[c], "", "Nulos", "", a.nulo, ""].join(";"));
    }
    baixar("apuracao.csv", "text/csv;charset=utf-8", "\ufeff" + L.join("\r\n"));
  });
  $("zerar-imp").addEventListener("click", () => {
    if (confirm("Remover todas as urnas importadas da apuração?")) { window.Store.zerarImportados(); msg("Urnas importadas removidas."); render(); }
  });
  $("zerar-local").addEventListener("click", () => {
    if (confirm("Zerar os votos deste aparelho? Isso não pode ser desfeito. Exporte antes se precisar guardar.")) { window.Store.zerarLocal(); msg("Votos deste aparelho zerados."); render(); }
  });

  window.addEventListener("storage", render);
  setInterval(render, 5000);
  mostrarPainel(sessionStorage.getItem("admin_ok") === "1");
})();
