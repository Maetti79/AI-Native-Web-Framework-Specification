/** Bounded JSON values; graph data is never executable code. */
export type Scalar = string | number | boolean;
export type Value = Scalar | null | Value[] | { [key: string]: Value };
export function isScalar(value: unknown): value is Scalar {
  return (
    ["string", "number", "boolean"].includes(typeof value) &&
    !(typeof value === "number" && !Number.isFinite(value))
  );
}
export function assertValue(value: unknown): asserts value is Value {
  let budget = 10000;
  const seen = new Set<object>();
  function visit(v: unknown, depth: number) {
    if (--budget < 0 || depth > 8)
      throw Error("Data exceeds depth or item limit");
    if (v === null || typeof v === "boolean") return;
    if (typeof v === "number") {
      if (!Number.isFinite(v)) throw Error("Data numbers must be finite");
      return;
    }
    if (typeof v === "string") {
      if (v.length > 12000) throw Error("Data text exceeds 12000 characters");
      return;
    }
    if (typeof v !== "object" || !v)
      throw Error("Data must be JSON-compatible");
    if (seen.has(v)) throw Error("Cyclic data is not supported");
    seen.add(v);
    if (Array.isArray(v)) {
      if (v.length > 500) throw Error("Lists may contain at most 500 items");
      for (const x of v) visit(x, depth + 1);
    } else {
      if (![Object.prototype, null].includes(Object.getPrototypeOf(v)))
        throw Error("Data must use plain objects");
      const entries = Object.entries(v);
      if (entries.length > 100) throw Error("Too many object fields");
      for (const [key, x] of entries) {
        if (
          !key ||
          key.length > 100 ||
          ["__proto__", "constructor", "prototype"].includes(key)
        )
          throw Error("Invalid data field");
        visit(x, depth + 1);
      }
    }
    seen.delete(v);
  }
  visit(value, 0);
}
export function valueKind(value: Value): string {
  return value === null
    ? "null"
    : Array.isArray(value)
      ? "array"
      : typeof value;
}
export function canonicalValue(value: unknown): string {
  function ordered(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(ordered);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, x]) => [key, ordered(x)]),
      );
    return v;
  }
  return JSON.stringify(ordered(value));
}
