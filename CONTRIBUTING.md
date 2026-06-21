# Contributing

Thanks for your interest! This is a small project, so contributing is simple.

## Run it locally
```bash
npm start          # serves the game on http://localhost:8000
```
Needs a modern browser with WebGL. The game is plain HTML/CSS/JS — no build step.

## Ideas & bugs
- Found a bug or have an idea? Open an [issue](../../issues).
- Small fixes (typos, balancing, translations)? A pull request is welcome.

## Pull requests
1. Fork and create a branch.
2. Keep changes focused and the style consistent with the surrounding code.
3. Don't add dependencies or a build tool — "just serve static files" is intentional.
4. **Strings are translated:** no hardcoded user-facing text. Use `data-i18n` in HTML
   and `t('key')` in JS, and add the key to **both** `src/i18n/de.js` and `en.js`.
5. Run `npm test` (i18n check) before submitting.

## Please respect the spirit
The gameplay was designed by a 10‑year‑old. Tidy and extend the code, but don't
change the game's character without asking first. See also the
[Code of Conduct](CODE_OF_CONDUCT.md) and [AGENTS.md](AGENTS.md) for project conventions.
