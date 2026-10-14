# DermaSense AI — Live-ready project

## What was fixed
- Express serves the website from `public/`, matching the HTML references `/css/style.css` and `/js/app.js`. This addresses the common `Cannot GET /` issue caused by missing/misplaced static files.
- OpenAI API key is read only from the server environment; it is never put in frontend code.
- The skin-analysis prompt is limited to visible facial skin only and explicitly tells the AI not to assess eyes or diagnose conditions.
- The image input can open a phone camera where supported, while still allowing gallery selection.

## Deploy to Render
1. Upload the contents of this folder to a GitHub repository (the `package.json`, `server.js`, `render.yaml`, and `public/` folder must be at the repository root).
2. In Render, create a **Web Service** from that repository.
3. Build command: `npm install`; Start command: `npm start`. Node 20+.
4. In Render → Environment, add `OPENAI_API_KEY` with your own API key. Add `OPENAI_MODEL` as `gpt-4.1-mini` (or a vision-capable model your account can access).
5. Deploy, then open `https://YOUR-SERVICE.onrender.com/`. Check `/api/health`; `ok` should be `true` and `aiConfigured` should be `true`.

## Run locally
- Install Node.js 20+
- Copy `.env.example` to `.env`, then replace the placeholder with your own key.
- Run `npm install` and `npm start`
- Open `http://localhost:3000`

## Important
- A valid OpenAI API key and API billing/access may be required. Never commit `.env` or paste your secret key into chat/GitHub/frontend.
- `GET /api/health` confirms server and key presence, not that your API account has model access/credits. Run an actual test analysis after deploying.
- Camera permission is controlled by the browser and generally requires HTTPS on the live website. If camera does not open, use the photo picker.
- Photo analysis is educational and non-diagnostic. Photos are sent to the configured AI provider for processing. Do not upload sensitive images without consent.
- Product examples are illustrative, not verified live listings. Add trusted, real product URLs before presenting purchase links.
