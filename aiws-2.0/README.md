# AIWS 2.0 Kernel & Studio

A working, graph-native application framework and visual development studio. The typed Application Graph is canonical; rendering and exported HTML are derived artifacts. No AI account, API credentials, database service or paid dependency is required.

## Run

Node.js 22+ (validated with 24.22.1), npm:

```sh
cd aiws-2.0
npm ci
npm test
npm start
```

`npm test` builds the strict TypeScript kernel, compiler and linker, then executes 44 unit/integration tests. The development server listens on **127.0.0.1:4173**. `PORT` and `HOST` are optional overrides. `npm run build` rebuilds `.mts` sources; `npm run bench` measures local mutation/compiler behavior.

For the real-browser suite:

```sh
npx playwright-core install --with-deps chromium
npm run test:e2e
```

The suite uses `/usr/bin/chromium` when present, otherwise the Playwright installation. `CHROMIUM_PATH` overrides the executable. `AIWS_ARTIFACT_DIR` optionally saves desktop/mobile screenshots. CI runs both test suites.

## Try the complete workflow

1. Select a card and enter `Make this card dark blue and change its title to Revenue.` The two operations commit atomically. German works too: `Mach diese Karte dunkelblau und ändere den Titel in Umsatz.`
2. Use **Switch reporting period** and **Find a workspace** in the preview. These are graph-defined actions and data bindings. Undo/redo applies to application interactions as well as edits.
3. Open Components to add, move or delete nodes. Use the property inspector and graph explorer. Bindings & events provides state selection and validated event editing. The semantic patch console accepts the same operation schema as the kernel.
4. Export a graph, import it again, or reload the page. Validated graph snapshots persist locally, including their version; history is per-session. Reset restores the demo.
5. Open **Data workspace** to edit chart values/table cells or add/remove dataset rows. Edits to bound datasets update their state source atomically. Select a state node to choose a value type and edit structured records.
6. **Export app** downloads a self-contained HTML application with the same graph, kernel and runtime, without Studio chrome or external network dependencies. Its application interactions remain functional. This is a derived artifact, not a replacement for the graph.

Use the example selector to switch between Northstar, Counter lab and **People / CRM** on desktop or mobile. The contact app supports required-field checks, adding contacts, search, row removal, and undo/redo; it uses only graph-defined state and actions. [examples/contacts.json](examples/contacts.json) is its complete application representation.

Import [examples/counter.json](examples/counter.json) for a second application demonstrating numeric state, increment actions, binding and visibility toggling. [examples/northstar.json](examples/northstar.json) contains the full dashboard. Neither example needs a separate renderer.

## Modules

| Module             | Responsibility                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `src/data.mts`     | Bounded structured values and canonical encoding                                                                   |
| `src/kernel.mts`   | Typed nodes, property validation, transactions, conflict detection, undo/redo, serialization, deterministic events |
| `src/linker.mts`   | Containment and state-binding dependency resolution/invalidation                                                   |
| `src/compiler.mts` | Resolved local artifacts, canonical content addresses, bounded cache                                               |
| `src/runtime.mjs`  | Deterministic DOM construction and retained unchanged subtrees                                                     |
| `src/intent.mjs`   | Local English/German command routing; no model calls                                                               |
| `src/studio.mjs`   | Inspector, selection, authoring, history, import/export, metrics                                                   |
| `src/export.mjs`   | Standalone, offline application artifact                                                                           |

For static hosting, `npm run build:site` produces a deployment directory containing only browser assets. See [deployment](docs/DEPLOYMENT.md).

See [data and migrations](docs/DATA.md), [architecture](docs/ARCHITECTURE.md), [semantic operations](docs/OPERATIONS.md), [gap analysis](docs/GAP_ANALYSIS.md), [benchmarks](docs/BENCHMARKS.md), and [contributing](CONTRIBUTING.md). Historical specifications and the original prototype remain preserved outside this directory.

## Release scope

Version **0.3.0**, graph schema **2**, MIT. The first Kernel & Studio milestone is functional and tested; it is an experimental framework, not a production service. The component/behavior vocabulary is deliberately finite. There is no arbitrary code evaluation, external model adapter, multi-user authorization, durable server persistence, binary AIR or WASM backend. State supports native arrays, nested records, numbers, booleans, text and null. Schema-1 files migrate automatically; future/unknown versions are rejected. Named record schemas, arbitrary field-path bindings and further migration versions remain future work.

The Studio shell and styles are ordinary HTML/CSS; example applications are graph data. Compiler validation and address discovery still inspect the graph, while unchanged DOM/artifacts are reused. Browser tests cover functional behavior, keyboard selection and mobile overflow, not complete accessibility or a production security audit. The server serves only explicit browser assets and defaults to loopback; deploy behind appropriate infrastructure if public hosting is needed.
