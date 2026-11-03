# AIWS 2.0 — Sites Handoff

Source branch: `aiws-2-native-kernel-preview`
Application directory: `aiws-2.0/`
Framework version at handoff: `0.3.0`, graph schema `2`

## Objective
Present the **actual current AIWS Kernel & Studio**, not a visual imitation. Use the existing framework renderer, graph model, real semantic patch engine and demo graphs. Keep all existing interactions operational. Do not rewrite the kernel solely to implement a site preview.

## Build and verify
Prerequisite: Node.js >= 22.

```sh
cd aiws-2.0
npm ci
npm test
npm run build:site
AIWS_SITE_ROOT=site npm run test:e2e
```

Publish the **contents** of `aiws-2.0/site/` as the website root through Sites if Sites supports uploading or deploying an existing static build. The generated directory is a self-contained static site with no runtime secrets, external model API or backend. Serve JavaScript modules (`.mjs`) and JSON files with appropriate MIME types. Preserve relative asset paths, including the `examples/` files. Use HTTPS. If Sites only generates new sites rather than importing arbitrary static assets, retain the repository as source of truth and do not silently reimplement or replace the original framework. Report any blocker.

## Functional acceptance criteria
- Northstar dashboard, Counter lab and People / CRM load using the same graph-driven renderer.
- Clicking a component selects its graph node; inspector edits and semantic command edits change the real graph.
- Undo/redo, import/export and graph-defined data bindings work.
- Desktop and mobile viewport are usable.
- No mock-only editor, invented AI integrations or fabricated performance claims.
- No claim of public deployment until the hosting service returns a confirmed public URL.

## Primary project references
- `aiws-2.0/README.md`
- `aiws-2.0/docs/ARCHITECTURE.md`
- `aiws-2.0/docs/DEPLOYMENT.md`
- `aiws-2.0/docs/OPERATIONS.md`
- `aiws-2.0/scripts/build-site.mjs`
- `aiws-2.0/examples/*.json`

## Design direction
Make the Studio visually excellent without sacrificing speed or turning it into a mere marketing mockup. Premium technical aesthetic, clean typography, restrained navy/graphite colors, crisp panels, generous spacing, readable command/graph inspector, responsive preview, discoverable actions and accessible interaction states. The sample application should remain polished and useful.

## Safety
The current project is an experimental open-source framework, not a production-authenticated service. User state uses browser-local storage. Do not introduce private data, credentials or a live model API into public examples.
