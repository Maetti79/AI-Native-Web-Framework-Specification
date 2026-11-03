# Architecture

`src/kernel.mts` defines the strict TypeScript graph, scalar property schemas and discriminated operation union. Validation enforces a rooted tree, unique IDs, supported component properties, safe colors and bounded chart/table payloads. A transaction clones a candidate, validates the complete result, then publishes it atomically. Version conflicts and invalid operations do not change state or history. Undo/redo restore snapshots and advance the transaction version; a new edit clears redo. History holds up to 40 transactions. Subscribers receive committed changes.

`src/linker.mts` resolves containment dependencies and computes ancestor invalidation. Only containment is supported: data bindings, imports and runtime capability links are future work. The DOM backend does not compose child artifacts into parent artifacts, so ancestor local templates remain reusable when a leaf changes.

`src/compiler.mts` validates/links graph input and caches local template descriptions by canonical content address. Addresses are canonical JSON bytes, not cryptographic hashes; equality therefore cannot collide. Cache capacity is 512. `.mts` files compile into ignored `dist/*.mjs`; those generated files are never canonical application content.

`src/runtime.mjs` creates DOM templates and attaches graph children. Only changed node shells are replaced; descendants and unrelated nodes retain identity. Selection is delegated at the mount. The runtime uses textContent and DOM APIs instead of evaluating graph strings. The renderer is JavaScript; migrating the DOM backend and Studio to TypeScript remains open.

`src/intent.mjs` is the deterministic AI adapter. Recognized color/title commands emit semantic operations without inference; unsupported requests return a message. `contextSlice` returns only target, parent identity and allowed property schema. Bytes are reported as bytes, never mislabeled as model tokens.

`src/studio.mjs` owns inspector controls, metrics, export and validated localStorage restoration. Compiler timings are local render durations; they exclude inference and network time. The server is for local development only and is not hardened for public hosting.
