# GitHub / Vercel handoff

Extract Lintara_Project.zip into a new directory. Its root contains package.json, package-lock.json, src, public, tests, docs and deliverables. No enclosing project folder is required.

1. Use Node22.12+ (Node24 used in verification).
2. Run `npm ci`, `npm test`, `npm run check:pages` and `npm run build`.
3. Upload the extracted directory to an empty GitHub repository, preserving the root layout. Do not commit node_modules, dist, personal files or credentials.
4. In Vercel import that repository and choose the Vite preset. Build command `npm run build`; output `dist`; Node24. No environment variables are required for the application.
5. Check the root, a direct SPA path, query preset link, all local assets, 3D initialization and real desktop/mobile screens before external presentation.

```sh
npm ci
npm test
npm run check:pages
npm run build
npm run preview
```

The project uses `/` as its Vite base, root-resolved local assets and a SPA rewrite. Production is static; the model runs locally in the browser. Saved plans and shortlists are local to the same browser/origin; a source/host change does not migrate them. Export JSON before changing origin. The bundled morning preset link is shareable; a custom local plan must be transferred separately as a file.

No account creation, GitHub push, Vercel registration or publication occurred. Deployment configuration/buildability is verified locally; hosted deployment remains the owner's action. Browser/GPU verification limits are in VERIFICATION.md.
