# Enquete eleitoral 2026 — Pernambuco

Urna de enquete **não-oficial** com todos os candidatos de Pernambuco: deputado estadual (517), deputado federal (392),
senador (12), governador (8) e presidente (14), mais um painel de apuração. HTML, CSS e JavaScript puros, sem build.
Feita para tablet e notebook (alvos de toque grandes, botão de tela cheia).

## Como o eleitor vota (`index.html`)

1. Digita o **número distribuído a ele, de 001 a 350**, e toca em Entrar. Cada número vota **uma única vez**.
2. Vota em sequência: deputado estadual, deputado federal, **senador (2 votos, não pode repetir o candidato)**, governador e presidente.
3. Ao confirmar o presidente, a cédula inteira é gravada e o número fica bloqueado. Se o eleitor sair no meio, nada é gravado e o número continua livre.

Na urna: teclado por toque, mouse ou teclado físico (Enter confirma, Backspace/Esc corrige). O número de dígitos muda por cargo
(5, 4, 3, 2 e 2). Governador e presidente mostram o vice; senador mostra os suplentes. Branco só vale sem número digitado.
Sons em `sons/` (`tecla.mp3` e `confirma.mp3`).

**Número inexistente:** a 1ª confirmação dá o aviso e mais 2 confirmações seguidas viram voto nulo. Corrigir zera a contagem.

**Voto secreto:** só se guardam as contagens por candidato (e brancos/nulos) e a lista de números que já votaram.
Nada liga um número de eleitor ao voto dele.

## Painel de apuração (`admin.html`)

Comparecimento (quantos dos 350 votaram, com a grade 001 a 350), e por cargo: total, válidos, brancos, nulos, mais votado,
ranking de candidatos com votos e % dos válidos, votos por partido, busca, filtros e exportação em CSV.

**Várias urnas:** cada aparelho guarda os votos no próprio navegador (localStorage), então um número pode votar em outro
aparelho sem que este saiba. Para somar tudo: em cada urna, entre no painel e use *Exportar deste aparelho*; no aparelho de
apuração, use *Importar de outra urna*. O painel avisa se um mesmo número aparecer em mais de uma urna. Reimportar o arquivo
da mesma urna substitui os dados dela, sem contar duas vezes. Para bloquear números já usados em outro aparelho, importe o
arquivo dele também no aparelho de votação.

**Login do painel:** o site é estático, então a senha só é conferida no navegador (`config.js` guarda apenas um hash).
É uma barreira leve, não proteção real. Para trocar: `python3 tools/definir_admin.py USUARIO SENHA`.
Bloqueio de voto duplicado entre aparelhos e apuração central em tempo real exigem um servidor.

## Publicar no GitHub Pages

Envie tudo para a raiz do repositório e, em Settings → Pages, escolha *Deploy from a branch* (`main`, `/ (root)`).
O painel exige https ou localhost.

## Atualizar candidatos

Deputados vêm de `data/candidatos_PE_2026.json`; senador, governador e presidente vêm dos CSVs de consulta de candidatos do TSE
(`consulta_cand_2026_PE.csv` e `consulta_cand_2026_BRASIL.csv`). Os CSVs têm CPF e título dos candidatos, por isso ficam fora do
repositório (`.gitignore`). Para regenerar o `data.js`:

```
python3 tools/gerar_data.py --pe caminho/consulta_cand_2026_PE.csv --br caminho/consulta_cand_2026_BRASIL.csv
```

Para mudar a faixa de números de eleitor, altere `MAX` em `store.js`.

## Observações sobre os dados

- Números que aparecem em mais de um registro: 4033 e 4444 (federal), 70231 (estadual) e 28 (presidente). Urna e painel os tratam como um número só e mostram todos os nomes.
- Todos os candidatos vêm com situação "#NE" no TSE, então nenhum foi filtrado por situação.
