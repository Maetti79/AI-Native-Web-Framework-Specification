# AIWS 2.0 Kernel & Studio

An experimental graph-native application framework. The application graph is canonical; the DOM is a derived preview. No AI account, credentials, database service, or paid dependency is required.

## Run

Node.js 24 (validated with 24.22.1), npm 11:

```sh
cd aiws-2.0
npm ci
npm run build
npm test
npm start
```

The development server listens on port 4173 (`PORT` overrides it). Run `npm run build` after changing `.mts` sources. `npm run bench` runs the local compiler benchmark.

Select a dashboard card, then enter `Make this card dark blue and change its title to Revenue.` Both operations form one validated transaction. Use the inspector, graph explorer, patch history, undo/redo, JSON export, and local browser persistence. Reset clears the stored graph. Navigation opens relevant development panels.

The seed dashboard, including chart series, activity rows, workspace cards and subscription table, is in `src/graph.mjs`. The same runtime renders and edits it. Historical specifications and the original prototype remain outside this directory.

See [architecture](docs/ARCHITECTURE.md), [gap analysis](docs/GAP_ANALYSIS.md), and [benchmarks](docs/BENCHMARKS.md).

## Scope

This is an early prototype, not a production release. Styling and Studio shell are ordinary CSS/HTML; application content is graph data. Graph layout has a small fixed vocabulary. There is no arbitrary business logic, permissions system, multiplayer editing, external model integration, binary AIR, or WASM backend. Persistence uses localStorage for graph snapshots; session history is not persisted. Validation and mutation scan the graph; compilation avoids unchanged local artifacts, but still scans node addresses. Browser pixel output and responsive layouts require real-browser review; automated DOM tests do not establish visual quality.

Versioning: package 0.1.0, graph schema 1, monotonically increasing transaction version, per-node revisions. Schema migrations are not yet supported. MIT licensed.
