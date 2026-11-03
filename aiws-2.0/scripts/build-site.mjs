import { mkdir, rm, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("../", import.meta.url)),
  output = join(root, "site");
const runtimeFiles = (await readdir(join(root, "dist")))
  .filter((name) => name.endsWith(".mjs"))
  .map((name) => "dist/" + name);
const sourceFiles = [
  "kernel",
  "compiler",
  "runtime",
  "studio",
  "intent",
  "export",
  "graph",
].map((name) => `src/${name}.mjs`);
const files = [
  "index.html",
  "styles.css",
  ...runtimeFiles,
  ...sourceFiles,
  ...["northstar", "counter", "contacts"].map(
    (name) => `examples/${name}.json`,
  ),
];
const buffers = await Promise.all(
  files.map((path) => readFile(join(root, path))),
);
// Read every source before replacing generated output; never touch the checkout itself.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const [i, path] of files.entries()) {
  await mkdir(join(output, path, ".."), { recursive: true });
  await writeFile(join(output, path), buffers[i]);
}
const { version } = JSON.parse(
  await readFile(join(root, "package.json"), "utf8"),
);
await writeFile(
  join(output, "manifest.json"),
  JSON.stringify(
    {
      name: "AIWS Kernel & Studio",
      version,
      graphSchema: 2,
      files: Object.fromEntries(
        files.map((path, i) => [
          path,
          createHash("sha256").update(buffers[i]).digest("hex"),
        ]),
      ),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Static website built: ${output} (${files.length} browser assets + manifest). No credentials, tests, node_modules or server sources included.`,
);
