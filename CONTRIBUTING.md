# Contribuindo para o VETOR 🎨

Obrigado pelo interesse! O projeto é propositalmente simples — **vanilla JS, sem build, sem dependências** — e gostaríamos de mantê-lo assim.

## Como começar

```bash
git clone <seu-fork>
cd vetor
# sirva a pasta com qualquer servidor estático
python -m http.server 8080
# abra http://localhost:8080
# rode os testes
node tests/test-editor.js
```

## Regras da casa

1. **JS ES2020 vanilla** — sem frameworks, sem bundler, sem `node_modules`
2. **Núcleo sem DOM** — `editor.js` não pode tocar em DOM (roda nos testes em Node); DOM fica em `app.js`
3. **Português** — interface, comentários e commits
4. **Indentação 4 espaços**, aspas simples
5. **Todo recurso novo** precisa de testes no núcleo
6. **Acessibilidade** — `aria-label` nos controles, navegação por teclado

## Fluxo

1. Abra uma **issue** antes de mudanças grandes
2. Fork + branch: `feat/nome-da-feature` ou `fix/nome-do-bug`
3. Commits pequenos e descritivos
4. Pull request com descrição do que mudou e porquê

## Precisa de ideias?

Veja o roadmap no [README](README.md) — itens com checkbox marcado estão feitos, os outros são abertos. Issues com a tag `good first issue` são as mais tranquilas para começar.