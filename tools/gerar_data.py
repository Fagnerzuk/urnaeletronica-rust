"""Gera data.js.
- Deputados: data/candidatos_PE_2026.json
- Senador, governador e presidente: CSVs de consulta de candidatos do TSE (encoding latin-1, separador ;).
Os CSVs têm CPF e título dos candidatos, então NÃO ficam no repositório (ver .gitignore).

Uso: python3 tools/gerar_data.py [--pe caminho/consulta_cand_2026_PE.csv] [--br caminho/consulta_cand_2026_BRASIL.csv]
Sem argumentos, procura os dois arquivos em data/."""
import argparse, csv, json, pathlib, re

raiz = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("--pe", default=str(raiz / "data" / "consulta_cand_2026_PE.csv"))
ap.add_argument("--br", default=str(raiz / "data" / "consulta_cand_2026_BRASIL.csv"))
args = ap.parse_args()

def limpa(t): return re.sub(r"\s+", " ", t or "").strip()

def nulo(t):
    t = limpa(t)
    return None if t in ("", "#NULO", "#NE", "-1", "-3") else t

def ler(caminho):
    with open(caminho, encoding="latin-1", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))

def reg(r):
    return {"nome": limpa(r["NM_URNA_CANDIDATO"]), "numero": limpa(r["NR_CANDIDATO"]),
            "partido": limpa(r["SG_PARTIDO"]), "partido_nome": limpa(r["NM_PARTIDO"]),
            "federacao": nulo(r["NM_FEDERACAO"])}

def por_cargo(linhas, cargo, uf):
    return [r for r in linhas if r["DS_CARGO"] == cargo and r["SG_UF"] == uf]

def com_apoio(linhas, uf, cargo, vice=None, suplentes=()):
    """Cada candidato leva o(s) vice ou suplente(s) que compartilham o número dele."""
    saida = []
    for r in por_cargo(linhas, cargo, uf):
        c = reg(r)
        if vice:
            v = [limpa(x["NM_URNA_CANDIDATO"]) for x in por_cargo(linhas, vice, uf) if limpa(x["NR_CANDIDATO"]) == c["numero"]]
            c["vice"] = " / ".join(v) or None
        if suplentes:
            c["suplentes"] = [" / ".join(limpa(x["NM_URNA_CANDIDATO"]) for x in por_cargo(linhas, s, uf) if limpa(x["NR_CANDIDATO"]) == c["numero"]) for s in suplentes]
        saida.append(c)
    return sorted(saida, key=lambda c: (int(c["numero"]), c["nome"]))

d = json.loads((raiz / "data" / "candidatos_PE_2026.json").read_text(encoding="utf-8"))
def dep(c):
    return {"nome": limpa(c["nome"]), "numero": str(c["numero"]).strip(), "partido": c["partido"],
            "partido_nome": c["partido_nome"], "federacao": nulo(c.get("federacao"))}

pe, br = ler(args.pe), ler(args.br)
saida = {
    "estado": d["estado"], "eleicao": d["eleicao"],
    "deputado_federal": [dep(c) for c in d["deputado_federal"]],
    "deputado_estadual": [dep(c) for c in d["deputado_estadual"]],
    "senador": com_apoio(pe, "PE", "SENADOR", suplentes=("1º SUPLENTE", "2º SUPLENTE")),
    "governador": com_apoio(pe, "PE", "GOVERNADOR", vice="VICE-GOVERNADOR"),
    "presidente": com_apoio(br, "BR", "PRESIDENTE", vice="VICE-PRESIDENTE"),
}
(raiz / "data.js").write_text("window.CANDIDATOS=" + json.dumps(saida, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print({k: len(v) for k, v in saida.items() if isinstance(v, list)})
