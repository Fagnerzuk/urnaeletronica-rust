/* Armazenamento local da enquete.
   - Voto secreto: guarda só a contagem por candidato ("_branco" e "_nulo" também) e a lista de
     números de eleitor que já votaram. Nada liga um número de eleitor a um voto.
   - Um voto por eleitor: o número (001 a MAX) só é aceito uma vez. */
(function () {
  "use strict";
  const KEY = "enquete_pe2026_v1";
  const MAX = 350; // números de eleitor: 001 até 350

  // Ordem da votação na urna. "votos" = quantos votos o eleitor dá naquele cargo.
  const CARGOS = [
    { id: "estadual", rotulo: "Deputado Estadual", digitos: 5, dados: "deputado_estadual", votos: 1 },
    { id: "federal", rotulo: "Deputado Federal", digitos: 4, dados: "deputado_federal", votos: 1 },
    { id: "senador", rotulo: "Senador", digitos: 3, dados: "senador", votos: 2 },
    { id: "governador", rotulo: "Governador", digitos: 2, dados: "governador", votos: 1 },
    { id: "presidente", rotulo: "Presidente", digitos: 2, dados: "presidente", votos: 1 },
  ];

  const vazioVotos = () => Object.fromEntries(CARGOS.map((c) => [c.id, {}]));
  function novo() {
    const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    return { urnaId: id, votos: vazioVotos(), usados: [], importados: {} };
  }
  function ler() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.votos && s.urnaId) {
        for (const c of CARGOS) s.votos[c.id] = s.votos[c.id] || {};
        s.usados = s.usados || []; s.importados = s.importados || {};
        return s;
      }
    } catch (e) { /* segue para novo */ }
    const s = novo(); gravar(s); return s;
  }
  function gravar(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* armazenamento indisponível */ } }

  function todosUsados(s) {
    const set = new Set(s.usados);
    for (const id of Object.keys(s.importados)) (s.importados[id].usados || []).forEach((u) => set.add(u));
    return set;
  }

  window.Store = {
    CARGOS, MAX,
    /* "1", "01" ou "001" -> "001". Devolve null se fora de 001 a MAX. */
    codigoValido(txt) {
      if (!/^\d{1,3}$/.test(txt)) return null;
      const n = Number(txt);
      return n >= 1 && n <= MAX ? String(n).padStart(3, "0") : null;
    },
    jaVotou(codigo) { return todosUsados(ler()).has(codigo); },
    /* Grava a cédula inteira de uma vez e marca o número como usado. cedula = [{cargo, chave}] */
    registrarCedula(codigo, cedula) {
      const s = ler();
      if (todosUsados(s).has(codigo)) return false;
      for (const v of cedula) s.votos[v.cargo][v.chave] = (s.votos[v.cargo][v.chave] || 0) + 1;
      s.usados.push(codigo);
      gravar(s);
      return true;
    },
    consolidado() {
      const s = ler(), total = vazioVotos();
      const somar = (o) => { for (const c of CARGOS) { const x = (o && o[c.id]) || {}; for (const k of Object.keys(x)) total[c.id][k] = (total[c.id][k] || 0) + (Number(x[k]) || 0); } };
      somar(s.votos);
      for (const id of Object.keys(s.importados)) somar(s.importados[id].votos);
      return total;
    },
    /* Quem votou (união das urnas) e números que apareceram em mais de uma urna. */
    comparecimento() {
      const s = ler(), cont = new Map();
      const add = (lista) => new Set(lista).forEach((u) => cont.set(u, (cont.get(u) || 0) + 1));
      add(s.usados);
      for (const id of Object.keys(s.importados)) add(s.importados[id].usados || []);
      return { votaram: new Set(cont.keys()), repetidos: [...cont.entries()].filter((e) => e[1] > 1).map((e) => e[0]).sort() };
    },
    urnas() {
      const s = ler();
      return [{ id: s.urnaId, local: true }].concat(Object.keys(s.importados).map((id) => ({ id, local: false, em: s.importados[id].geradoEm })));
    },
    exportar() {
      const s = ler();
      return { tipo: "enquete-pe-2026", versao: 2, urnaId: s.urnaId, geradoEm: new Date().toISOString(), votos: s.votos, usados: s.usados };
    },
    /* Importar de novo a mesma urna substitui os dados dela (não soma duas vezes). */
    importar(obj) {
      if (!obj || obj.tipo !== "enquete-pe-2026" || !obj.votos || !obj.urnaId) throw new Error("Arquivo inválido");
      const s = ler();
      if (obj.urnaId === s.urnaId) throw new Error("Este arquivo é deste próprio aparelho");
      s.importados[obj.urnaId] = { geradoEm: obj.geradoEm, votos: obj.votos, usados: obj.usados || [] };
      gravar(s);
    },
    zerarLocal() { const s = ler(); s.votos = vazioVotos(); s.usados = []; gravar(s); },
    zerarImportados() { const s = ler(); s.importados = {}; gravar(s); },
  };
})();
