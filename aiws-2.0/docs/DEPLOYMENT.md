# Static website deployment

Studio and all three example applications work as a static website. No Node server, credentials or external API is required at runtime. User graph state stays in the browser's localStorage; deployment does not add server persistence or multi-user access control.

```sh
npm ci
npm test
npm run build:site
AIWS_SITE_ROOT=site npm run test:e2e
```

`site/` is ignored generated output. It contains index.html, styles.css, browser modules, compiled framework modules and three example graphs. A manifest records version/schema and SHA-256 checksums of the browser assets. Server source, tests, lockfiles, dependencies and environment files are excluded by an explicit allowlist. Rebuilding replaces only this generated directory.

Upload the **contents** of `site/` as the website root using the hosting provider's deployment workflow. For Sites, use its connected deployment capability when available. A locally built package, a development server or a `sites-preview` session is not proof of a durable Sites publication; report the deployment URL only after the publishing service confirms success.

Preserve relative paths and serve `.mjs` as JavaScript and `.json` as JSON. The app works at a directory base URL (with trailing slash). There are no SPA deep-link routes, server functions, package installation steps or required runtime environment variables in the published site. Use HTTPS for a hosted deployment. Example switching and standalone app export fetch assets from the same origin.

Graph imports, downloaded app artifacts and local changes are client-side. Never add private credentials or customer data to the public example files. Browser-local user data is not part of a release bundle.
