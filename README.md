# Padlet Mario reaction bot

A small Playwright bot that opens a password-protected Padlet, searches for `mario`, finds the first matching post, and applies a configurable reaction.

## Recommended free cloud run: GitHub Actions

1. Create a **private** GitHub repository.
2. Upload all files from this project.
3. In **Settings > Secrets and variables > Actions**, create:
   - `PADLET_URL`: the complete Padlet URL.
   - `PADLET_PASSWORD`: the board password.
4. Open **Actions > React to Mario on Padlet > Run workflow**.

The default reaction is `like`. To use another reaction, edit `REACTION` in `.github/workflows/run.yml`, for example `heart`, `star`, or the accessible label shown by Padlet.

## Local test

```bash
npm install
npx playwright install chromium
PADLET_URL='https://...' PADLET_PASSWORD='...' SEARCH_TEXT='mario' REACTION='like' npm start
```

## Notes

- Keep the repository private because this automation targets a password-protected board.
- The password is read only from a secret/environment variable and is not embedded in the code.
- The workflow is manual so it cannot repeatedly toggle or duplicate a reaction.
- If Padlet changes its interface, download the `failure-screenshot` artifact from the failed workflow and adjust the label-based selectors in `bot.js`.
- Use only if you have permission from the Padlet owner and the automation complies with the site's rules.
