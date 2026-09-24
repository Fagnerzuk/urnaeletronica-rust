"""Define o usuário e a senha do painel de apuração (grava só o hash em config.js).
Uso: python3 tools/definir_admin.py USUARIO SENHA"""
import hashlib, pathlib, sys

SAL = "urna-pe-2026:"
if len(sys.argv) != 3:
    sys.exit("Uso: python3 tools/definir_admin.py USUARIO SENHA")
h = hashlib.sha256((SAL + sys.argv[1] + ":" + sys.argv[2]).encode("utf-8")).hexdigest()
raiz = pathlib.Path(__file__).resolve().parent.parent
(raiz / "config.js").write_text(f'window.ADMIN_HASH="{h}";\n', encoding="utf-8")
print("config.js atualizado.")
