# Contribuindo para o VETOR 🎨

Obrigado pelo interesse! O projeto é propositalmente simples — **vanilla JS, sem build, sem dependências** — e gostaríamos de mantê-lo assim.

## Como começar

```bash
git clone https://github.com/<seu-usuario>/vetor.git
cd vetor
git remote add upstream https://github.com/cleciodivi/vetor.git
git switch -c feat/nome-da-feature
# sirva a pasta com qualquer servidor estático
python -m http.server 8080
# abra http://localhost:8080
# rode os testes
node tests/test-editor.js
```

Se ainda não tiver um fork, use o botão **Fork** na página do repositório antes de clonar.

## Regras da casa

1. **JS ES2020 vanilla** — sem frameworks, sem bundler, sem `node_modules`
2. **Núcleo sem DOM** — `editor.js` não pode tocar em DOM (roda nos testes em Node); DOM fica em `app.js` e `app-mvp.js`
3. **Português** — interface, comentários e commits
4. **Indentação 4 espaços**, aspas simples
5. **Todo recurso novo** precisa de testes no núcleo
6. **Acessibilidade** — `aria-label` nos controles, navegação por teclado

## Fluxo

1. Consulte as [issues abertas](https://github.com/cleciodivi/vetor/issues) e abra uma nova para discutir mudanças maiores.
2. Faça um fork e crie uma branch: `feat/nome-da-feature` ou `fix/nome-do-bug`.
3. Faça commits pequenos e descritivos.
4. Rode `node tests/test-editor.js` e confira a aplicação no navegador.
5. Abra um pull request para `main`, explicando o que mudou, por que e como foi testado. Inclua capturas de tela quando a alteração afetar a interface.

Ao participar, siga o [Código de Conduta](.github/CODE_OF_CONDUCT.md). Relatos de comportamento inadequado devem ser enviados em particular aos mantenedores, não publicados em uma issue.

## Precisa de ideias?

Veja o roadmap no [README](README.md) e as issues marcadas com `good first issue` ou `help wanted`.