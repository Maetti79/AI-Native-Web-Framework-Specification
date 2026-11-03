# Semantic operations

Apply 1–40 operations atomically through `kernel.apply(operations, expectedVersion)`. Versions are checked before mutation. The final graph must satisfy all property, containment and dependency schemas. Examples below assume the Northstar seed.

```json
[
  { "op": "set", "id": "mrr", "key": "label", "value": "Revenue" },
  { "op": "set", "id": "mrr", "key": "background", "value": "#142e58" }
]
```

| Operation | Fields                   | Behavior                                                                          |
| --------- | ------------------------ | --------------------------------------------------------------------------------- |
| `set`     | `id`, `key`, `value`     | Set a supported typed property, including structured data                         |
| `add`     | `parent`, `node`         | Insert a unique leaf; only app/section accept children                            |
| `remove`  | `id`                     | Remove an existing leaf, unless final references would dangle                     |
| `move`    | `id`, `parent`, `index`  | Reparent/reorder a node; index is evaluated after detachment; cycles are rejected |
| `bind`    | `id`, `key`, `source`    | Bind to `{ "node":"state-id", "key":"value" }`; `null` removes the binding        |
| `event`   | `id`, `event`, `actions` | Set click/action, change/input or remove/table actions; `[]` removes a handler    |

A bound property overrides its local value. Removing the binding reveals the local value again. The inspector disables direct editing of bound values; modify the state source or remove the binding first. Semantic natural-language commands automatically target the source of an existing binding.

## Example: create a functional counter

```json
[
  {
    "op": "add",
    "parent": "app",
    "node": {
      "id": "count",
      "type": "state",
      "props": { "value": 0 },
      "children": []
    }
  },
  {
    "op": "bind",
    "id": "mrr",
    "key": "value",
    "source": { "node": "count", "key": "value" }
  },
  {
    "op": "event",
    "id": "period-action",
    "event": "click",
    "actions": [
      { "kind": "increment", "target": "count", "key": "value", "amount": 1 }
    ]
  }
]
```

Clicking the existing period button now increments the displayed counter. Undo reverses the event dispatch as a single transaction. See the independent [counter example](../examples/counter.json) for a complete graph.

## Event actions

All actions target a state node's `value`. Numeric increments require numeric state; toggles require boolean state; cycle values and fixed sets must match the current state type. Input actions require a change event and string state. Dispatch validates consumer properties too: a change that would produce an invalid bound color/series is rejected atomically.

```json
[
  {
    "kind": "set",
    "target": "period-state",
    "key": "value",
    "value": "6 months"
  },
  {
    "kind": "cycle",
    "target": "series-state",
    "key": "value",
    "values": [
      [23, 30, 38, 44, 55, 78],
      [40, 52, 59, 55, 69, 78]
    ]
  }
]
```

Consumers bind using the component's `bindings` map, handlers live in its `events` map. These survive graph serialization, export, and import. Raw operations can be entered in Studio's semantic patch console. There is no dependency on an AI provider.

## Data actions

`append` targets array state and appends one row. `items` can contain literal scalar cells or `{ "source": { "node":"draft-name", "key":"value" } }` descriptors referring to text state. All text cells must be nonempty after trimming. Sources are read from candidate state, so action ordering within a handler matters.

```json
[
  {
    "kind": "append",
    "target": "contacts",
    "key": "value",
    "items": [
      { "source": { "node": "draft-name", "key": "value" } },
      { "source": { "node": "draft-company", "key": "value" } },
      { "source": { "node": "draft-email", "key": "value" } }
    ]
  },
  { "kind": "set", "target": "draft-name", "key": "value", "value": "" },
  { "kind": "set", "target": "draft-company", "key": "value", "value": "" },
  { "kind": "set", "target": "draft-email", "key": "value", "value": "" }
]
```

One commit appends the row and clears drafts; any validation error rolls back the whole interaction. Undo restores both.

A table node may declare `events.remove` with `{"kind":"removeAt","target":"contacts","key":"value","index":"event"}`. The renderer sends the row's original dataset index, preserving correctness after filtering. Index 0 is the table header and cannot be removed through a table event. Fixed numeric indices can be used by other handlers. Invalid/stale indices fail atomically.

See [contacts](../examples/contacts.json) for a complete runnable graph. Email values are treated as required text, not verified email identities or deliverability.
