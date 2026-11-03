# Structured data and schema migrations

AIWS 0.3 uses graph schema **2**. State values may contain strings, finite numbers, booleans, null, native arrays and nested plain records. These are JSON values, not source-code strings. Components validate the effective value after binding resolution.

```json
{
  "id": "contact-record",
  "type": "state",
  "props": {
    "value": {
      "name": "Maya Chen",
      "company": "Orbit Studio",
      "active": true,
      "tags": ["customer", null]
    }
  },
  "children": []
}
```

## Component shapes

- Chart `series`: 2–50 finite numbers, each from 0 to 100.
- Activity `entries`: arrays of five strings: icon, title, description, time and tone.
- Table `rows`: a native rectangular matrix. The first row is the text header (1–12 columns); subsequent cells are string, number, boolean or null. Empty matrices are allowed. Header and body column counts must agree.
- Metric `value`: number or text; `visible`: boolean.
- Input `value`: bounded text. A binding must satisfy the receiving component's schema.

General data bounds: depth at most 8 (the value root is depth 0), lists at most 500 items, objects at most 100 fields, strings at most 12,000 characters, and at most 10,000 visited values in one value-validation call. Executable values, non-finite numbers, cyclic references, non-plain objects and prototype-related keys are rejected. Ordinary text component properties have a tighter 300-character limit. These limits are development safeguards, not a multi-user security model.

## Editing

Select a table, chart, activity or list state, then open Data workspace. Cells retain their type. Adding/removing rows and changing cells commits a normal semantic transaction; a bound dataset updates its state source. A table's header cannot be deleted through that table's data controls. Select a state node to replace its value with an empty text/number/boolean/null/list/record value, then edit it through the inspector. Incompatible changes are rejected if consumers would become invalid.

Nested record state is edited as JSON in the property inspector. Field-path bindings and named record schemas are not yet supported; component bindings currently refer to a whole state value. Large datasets are not virtualized.

## Legacy upgrade

`deserialize` and `createKernel` accept schema 1, unversioned legacy graphs, and schema 2. Schema-1 input is cloned, known `series`/`rows`/`entries` strings are parsed, relevant bound state is converted, and set/cycle action literals for those states are upgraded. The final graph is validated before installation. IDs, revisions and transaction version remain unchanged. The caller's object and imported file are not edited; exported graphs are always schema 2.

Unrelated text is preserved even if it looks like JSON. Future schema numbers are rejected. A custom legacy graph that also consumes serialized dataset text as an input/text property may need manual redesign: migration will reject incompatible consumers rather than silently changing behavior. Original legacy files should be retained until their migrated result is reviewed. Browser state is persisted in schema 2 on the next successful edit/import.

## Contact manager

Choose People / CRM in the example selector (sidebar on desktop, toolbar on smaller screens). The form writes draft text states. Add contact appends a row to the contacts dataset and clears all drafts in one transaction. Empty required text rejects the entire operation; email is required text, not a deliverability validator. Search is a bound filter. Remove buttons carry original row indices, and Undo restores the row even under filtering.

The same graph runs in the standalone offline export. No separate CRUD application code, database or model service is involved. Data remains browser-local, with no collaboration or server durability guarantees.
