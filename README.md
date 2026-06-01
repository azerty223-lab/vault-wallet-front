# Vault Wallet UI Mockup

Static, fictional wallet onboarding page inspired by the provided layout.

## Structure

- `index.html`: semantic page markup.
- `styles.css`: layered CSS with design tokens, layout rules, and component styles.
- `assets/orbit-illustration.svg`: decorative illustration isolated from the document structure.
- `scripts/app.js`: small progressive-enhancement script for safe demo feedback.

## Verification Gate

The mockup includes a local, front-end verification gate:

- Google reCAPTCHA is shown before the demo UI.
- A successful check is stored in `localStorage` as `vaultCaptchaPassed`.
- Lightweight browser automation signals show an "Access blocked" screen.

This is suitable for a local/static demo only. Production reCAPTCHA requires
server-side token verification with your own site key and secret.

## Run Locally

```powershell
python -m http.server 4177
```

Then open:

```text
http://127.0.0.1:4177
```

This mockup intentionally avoids using Trust Wallet branding or collecting wallet credentials.
