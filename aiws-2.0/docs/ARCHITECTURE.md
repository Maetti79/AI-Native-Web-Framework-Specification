# Architecture

## Canonical graph and atomic execution

`src/kernel.mts` defines strict TypeScript interfaces for graph nodes, bindings, event actions and a discriminated operation union. Every node has a stable compact ID and revision. The graph is a rooted containment tree; references to state form a separate dependency relation. Root, reachability, property types, container rules, JSON datasets and state/event references are validated before commit.

A transaction clones a candidate, applies all operations, validates the complete candidate, then commits it once. Intermediate dangling references are permissible inside a patch, provided the final graph is valid. Conflicts, invalid values and reference errors leave state, history and version unchanged. Undo/redo restore snapshots while advancing the transaction version; a new edit clears redo. Snapshots preserve at most 40 undo steps. Subscriber failures are isolated from a committed transaction.

State nodes contain scalar values. Component properties bind directly to state values. Bindings cannot chain through other components or states, keeping resolution deterministic and cycle-free. A bound property is validated against its consumer schema. Events support typed set, increment, toggle, cycle and text-input actions. Dispatch expands a handler into ordinary operations against candidate state, preserving sequential semantics within one atomic patch. There is no eval or dynamic code generation.

## Linker and compiler

`src/linker.mts` links containment and state-to-consumer references. `invalidated` traverses dependent consumers and ancestor containers. A state update invalidates its consumers; unrelated siblings remain unaffected.

`src/compiler.mts` resolves bound values and caches local artifacts by canonical JSON addresses of type, effective properties and event handlers. Addresses use exact byte equality instead of a lossy hash. Cache capacity is 512 entries. Local artifacts do not contain composed child artifacts, so a child's change does not require reconstructing its parent's local template. `.mts` modules compile into ignored `dist/*.mjs`; generated modules are executable framework output, not application source of truth.

Validation, resolution and address discovery still scan graph data. Binding lookup currently performs array searches; many bindings can increase cost beyond a linear scan. Full incremental indexing is an identified optimization, not an implemented performance claim. The current benefit is avoiding unchanged artifact creation and DOM replacement.

## DOM runtime and standalone application

`src/runtime.mjs` builds safe DOM templates using textContent and DOM APIs. It replaces changed shells while retaining descendants and unrelated nodes. Delegated click/change events call kernel dispatch. Data sources for charts, activities and tables belong to the graph. Layout is a finite vocabulary: metrics, projects, stack and dashboard. Visibility can bind to boolean state. A standalone runtime requires no Studio code.

`src/export.mjs` exports the graph, runtime modules and CSS into one HTML document using import maps and data modules. Relative module dependencies are remapped into the embedded module set. Graph JSON escapes `<` to prevent script-element termination. Exported HTML is a derived distribution artifact. Its state is session-local; it does not share Studio localStorage or undo history.

## Context, adapters and Studio

`contextSlice` includes effective target properties, its parent identity, relevant state sources and allowed property schema. It does not include unrelated graph branches. The deterministic adapter recognizes a constrained English/German grammar and emits semantic patches. Unsupported compound instructions produce no partial command. Renaming to a color does not accidentally recolor a component. Bound-property commands edit the underlying state source.

Studio uses the same kernel and runtime as exported examples. It supports component creation/movement/removal, property editing, state bindings, event handlers, patch history, minimal context, a semantic console, import, graph/app export and local persistence. Imported graph validation occurs before replacing the active kernel. Graph versions survive reload. History remains session-local, and UI errors do not overwrite a stored invalid graph automatically.

Compiler status measures local compile/link/render duration and changed DOM shells. Artifact bytes are UTF-8 bytes, never model token counts. Compilation is synchronous; inference/network time is excluded.

## Trust boundary

Graph input is data, not executable code. The development server permits only known browser asset paths, blocks traversal/symlink escape, handles GET/HEAD and rejects other methods. It defaults to loopback and sends content/security headers. This is a single-user local tool, not a multi-tenant sandbox or authenticated public service. Runtime/Studio remain JavaScript; the core kernel/compiler/linker are strict TypeScript.
