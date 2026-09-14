# Urna Eletrônica — HTML + CSS + Rust

Projeto educacional de uma urna eletrônica fictícia.

## Tecnologias

- HTML
- CSS
- JavaScript
- Rust
- WebAssembly
- GitHub Pages

O Rust é compilado para WebAssembly e executado diretamente no navegador. Isso permite hospedar o projeto como site estático no GitHub Pages, sem servidor.

## Rodar localmente

Você precisa ter Rust e `wasm-pack` instalados.

```bash
cargo install wasm-pack
```

Compile o Rust:

```bash
wasm-pack build --target web
```

Isso criará a pasta `pkg/`.

Depois rode um servidor HTTP na raiz do projeto. Por exemplo:

```bash
python3 -m http.server 8000
```

Abra:

```text
http://localhost:8000
```

## GitHub Pages

O workflow em `.github/workflows/pages.yml`:

1. instala Rust;
2. instala wasm-pack;
3. compila o Rust para WebAssembly;
4. publica o site no GitHub Pages.

No GitHub:

**Settings → Pages → Source → GitHub Actions**

Depois faça push para a branch principal.

## Observação

Esta é uma simulação para estudo. Não é um sistema eleitoral real e não deve ser usado para eleições reais.
