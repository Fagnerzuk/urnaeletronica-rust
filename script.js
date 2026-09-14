import init, { Urna } from "./pkg/urna_eletronica.js";

await init();

const urna = new Urna();
let numero = "";
let votacaoEncerrada = false;

const $ = (id) => document.getElementById(id);

function atualizarTela() {
  const digitos = [numero[0] || "", numero[1] || "", numero[2] || ""];
  $("digito1").textContent = digitos[0];
  $("digito2").textContent = digitos[1];
  $("digito3").textContent = digitos[2];

  if (numero.length === 3) {
    const candidato = urna.buscar_candidato(Number(numero));

    if (candidato) {
      $("nome").textContent = candidato.nome;
      $("partido").textContent = candidato.partido;
      $("candidato").classList.remove("hidden");
      $("status").textContent = "Confira os dados e pressione CONFIRMA.";
    } else {
      $("candidato").classList.add("hidden");
      $("status").textContent = "NÚMERO NÃO ENCONTRADO. Pressione CORRIGE.";
    }
  } else {
    $("candidato").classList.add("hidden");
    $("status").textContent = "Digite o número do candidato";
  }
}

document.querySelectorAll("[data-num]").forEach((botao) => {
  botao.addEventListener("click", () => {
    if (votacaoEncerrada || numero.length >= 3) return;
    numero += botao.dataset.num;
    atualizarTela();
  });
});

$("corrige").addEventListener("click", () => {
  numero = "";
  atualizarTela();
});

$("branco").addEventListener("click", () => {
  if (votacaoEncerrada) return;
  urna.branco();
  $("mensagem").textContent = "VOTO EM BRANCO";
  $("candidato").classList.add("hidden");
  $("status").textContent = "Pressione CONFIRMA para registrar.";
  numero = "BRANCO";
});

$("confirma").addEventListener("click", () => {
  if (votacaoEncerrada) return;

  if (numero === "BRANCO") {
    confirmarVoto("VOTO EM BRANCO");
    return;
  }

  if (numero.length !== 3) {
    $("status").textContent = "Digite os 3 números do candidato.";
    return;
  }

  const candidato = urna.buscar_candidato(Number(numero));
  if (!candidato) {
    $("status").textContent = "Candidato inválido. Pressione CORRIGE.";
    return;
  }

  urna.votar(Number(numero));
  confirmarVoto("VOTO CONFIRMADO");
});

function confirmarVoto(texto) {
  $("mensagem").textContent = texto;
  $("status").textContent = "Obrigado por votar!";
  votacaoEncerrada = true;

  setTimeout(() => {
    votacaoEncerrada = false;
    numero = "";
    $("mensagem").textContent = "SEU VOTO PARA";
    atualizarTela();
  }, 2200);
}

$("resultados").addEventListener("click", () => {
  const resultados = urna.resultados();
  $("lista-resultados").innerHTML = "";

  resultados.forEach((c) => {
    const item = document.createElement("div");
    item.className = "resultado-item";
    item.innerHTML = `
      <span>${c.numero} — ${c.nome} (${c.partido})</span>
      <b>${c.votos} voto(s)</b>
    `;
    $("lista-resultados").appendChild(item);
  });

  $("total").textContent = urna.total_votos();
  $("resultado-modal").classList.remove("hidden");
});

$("fechar").addEventListener("click", () => {
  $("resultado-modal").classList.add("hidden");
});

atualizarTela();
