# Archive review and remaining gaps

The supplied ZIP provided a graph, JavaScript mutation kernel, deterministic intent examples and a polished Studio shell. It already had ten mutation tests, but no strict TypeScript build. Its claimed incremental renderer replaced the complete mount. Charts and activity data lived in renderer code; compound commands stopped after color. Redo, graph persistence, graph explorer, history and measured compiler status were missing.

Implemented here: strict typed kernel/compiler/linker, property validation, validated atomic edits, node revisions, conflict detection, redo, serialization/restoration, dependency invalidation, content-addressed local template reuse, retained DOM subtrees, combined commands, graph-driven chart/activity/table data, inspector and navigation panels, session history, local metrics and repeatable tests/benchmark/CI.

Not implemented: arbitrary typed data/state/event nodes, reusable application actions, general responsive layout primitives, permissions, external model adapters, durable server persistence, distributed transactions, binary encoding, WASM, real tokenizer measurements or a React baseline. The Studio shell itself is not graph-authored. Fixed chart and table renderers are runtime primitives; their displayed records are graph data. Production security, accessibility and visual browser audits remain required.

Tradeoffs: keep a small tree schema and safe scalar properties, encoding bounded series/rows as JSON strings initially. This is intentionally less expressive than the long-term AIR design. Full graph validation and address scanning remain O(N); DOM work is incremental. Benchmark claims must retain this distinction.
