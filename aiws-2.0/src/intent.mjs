/** Deterministic, model-independent adapter. No network calls or hidden fallbacks. */
const palette = {
  blue: "#4785ed",
  "dark blue": "#142e58",
  purple: "#7568f8",
  violet: "#7568f8",
  green: "#1abca3",
  teal: "#1abca3",
  red: "#ed5969",
  orange: "#efa257",
  pink: "#e66ab7",
  blau: "#4785ed",
  dunkelblau: "#142e58",
  "dunkel blau": "#142e58",
  grün: "#1abca3",
  rot: "#ed5969",
  lila: "#7568f8",
};
const unsupported = () => ({
  kind: "unsupported",
  message:
    "Try “make dark blue and change its title to Revenue”, “rename to Growth”, inspect, undo or redo. You can also use the property inspector.",
});
export function routeIntent(input, selected, snapshot) {
  const text = String(input).trim(),
    lower = text.toLowerCase();
  if (/^(undo|rückgängig|zurück)$/.test(lower)) return { kind: "undo" };
  if (/^(redo|wiederholen)$/.test(lower)) return { kind: "redo" };
  const node = snapshot.nodes.find((n) => n.id === selected);
  if (!node) return { kind: "error", message: "Select a component first." };
  if (/^(inspect|context|kontext|zeige kontext)$/.test(lower))
    return { kind: "inspect" };
  // Split only before a recognized rename clause so a title can itself contain "and".
  const clauses = text.split(
    /\s+(?:and|und)\s+(?=(?:change|rename|ändere|benenne|title|titel)\b)/i,
  );
  if (clauses.length > 2) return unsupported();
  const ops = [];
  for (const clause of clauses) {
    const rename = clause.match(
      /^(?:rename\s+(?:it\s+)?to|(?:change\s+(?:(?:its|the)\s+)?)?title\s+to|(?:ändere\s+(?:den\s+)?)?titel\s+(?:zu|in|auf)|benenne\s+(?:es\s+)?(?:zu|in))\s+(.+)$/i,
    );
    if (rename) {
      let value = rename[1]
        .trim()
        .replace(/[.]$/, "")
        .replace(/^["„']|["”']$/g, "");
      if (!value || value.length > 300) return unsupported();
      const key = ["metric", "badge"].includes(node.type)
        ? "label"
        : ["heading", "paragraph", "action"].includes(node.type)
          ? "text"
          : "title";
      if (node.type === "state") return unsupported();
      ops.push({ op: "set", id: selected, key, value });
      continue;
    }
    const colorClause = clause.toLowerCase().replace(/[.!]$/, "");
    const color = Object.keys(palette)
      .sort((a, b) => b.length - a.length)
      .find((color) => colorClause.endsWith(color));
    if (!color) return unsupported();
    const prefix = colorClause.slice(0, -color.length).trim();
    if (
      !/^(?:make(?: this(?: card| chart| component)?)?|change (?:its |the )?(?:color|colour|accent) to|set (?:color|accent) to|mach(?:e)?(?: diese(?: karte| komponente)?| das diagramm)?|(?:ändere|setze) (?:die )?farbe (?:zu|in|auf))$/.test(
        prefix,
      )
    )
      return unsupported();
    if (!["metric", "chart"].includes(node.type)) return unsupported();
    ops.push({
      op: "set",
      id: selected,
      key: node.type === "chart" ? "accent" : "background",
      value: palette[color],
    });
  }
  return ops.length
    ? {
        kind: "patch",
        ops: ops.map((op) =>
          node.bindings?.[op.key]
            ? {
                ...op,
                id: node.bindings[op.key].node,
                key: node.bindings[op.key].key,
              }
            : op,
        ),
      }
    : unsupported();
}
