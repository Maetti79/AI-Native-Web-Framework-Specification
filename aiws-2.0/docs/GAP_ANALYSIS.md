# Kernel & Studio milestone: status

The imported archive provided a graph, JavaScript mutation kernel and visual Studio shell. Its renderer replaced the entire preview, chart/activity data lived in renderer code, compound commands stopped after the first operation, and it lacked strict typing, redo, persistence and real compiler metrics.

## Implemented and verified

- Strict TypeScript kernel/compiler/linker and versioned graph schemas.
- Atomic semantic transactions, conflicts, rollback, undo/redo, per-node revisions, serialization and validated restoration.
- Containment and state-binding dependencies, direct state resolution and consumer validation.
- Graph-defined set/increment/toggle/cycle/input events, numeric metrics and boolean visibility.
- Content-addressed artifacts, bounded caches and unchanged DOM retention.
- Responsive dashboard with chart, activity, table, search and reporting-period interaction; all application data/behavior is graph-defined.
- Inspector, selection, explorer, add/delete/move, binding controls, event editing, semantic console, context, history and measured compiler status.
- English/German compound commands with zero external model calls.
- Graph import/export, local persistence and standalone offline HTML app export using the same runtime.
- A second counter application imported without renderer modifications.
- 44 unit/integration tests and Chromium desktop/mobile/offline end-to-end coverage. Screenshots were reviewed during development.
- Reproducible npm installation/build/test, CI, local benchmark foundation, architecture and contribution documentation.

## Version 0.3 extension

- Recursive bounded JSON values and canonical nested record encoding.
- Immutable schema-1 migration, including bound datasets and cycle/set actions.
- Native table/chart/list editor, structured state authoring and explicit state type selection.
- Graph-defined contact form with required fields, atomic append-and-clear, search and row removal using original indices.
- Three selectable examples, dynamic application metadata, mobile example picker and offline contact app validation.

## Deliberate boundaries

This completes the initial functional Kernel & Studio milestone, not the entire long-term AIWS vision. Advanced layout/logic primitives, named data-record schemas, permissions, durable server storage, collaboration, external model adapters, binary AIR, WASM and further graph migrations remain future work. The Studio chrome itself is ordinary HTML/CSS. Schema 2 uses bounded native arrays and nested records. Schema-1 dataset strings migrate automatically. Table data is currently a rectangular matrix with its header as the first row; record-field bindings and named collection schemas remain open. Compiler discovery/validation still scans graph data; DOM updates are incremental.

No measured React baseline, real-model tokenizer comparison or inference-cost comparison exists. Local browser tests exercise behavior, offline exported content, keyboard selection and mobile overflow; they are not a complete accessibility audit or production security certification. In this managed Chromium environment `file:` navigation is administratively blocked, so the self-contained exported HTML was tested by loading its content with browser networking disabled.

Historical specifications and the old prototype are preserved. No database, binary protocol or paid model dependency was introduced merely to match speculative earlier architecture.
