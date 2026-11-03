import { validateGraph } from "./kernel.mjs";
const dataURL = (source) =>
  "data:text/javascript;base64," + btoa(unescape(encodeURIComponent(source)));
/** A derived, offline HTML artifact. The graph remains the source of truth. */
export async function exportApplication(
  graph,
  read = async (path) => {
    const r = await fetch(path);
    if (!r.ok) throw Error(`Export failed to load ${path}`);
    return r.text();
  },
) {
  validateGraph(graph);
  const [kernel, linker, compiler, runtime, styles] = await Promise.all(
    [
      "dist/kernel.mjs",
      "dist/linker.mjs",
      "dist/compiler.mjs",
      "src/runtime.mjs",
      "styles.css",
    ].map(read),
  );
  const remap = (source, paths) => {
    for (const [from, to] of Object.entries(paths))
      for (const quote of ['"', "'"])
        source = source.replaceAll(quote + from + quote, quote + to + quote);
    return source;
  };
  const imports = {
    "@aiws/kernel": dataURL(kernel),
    "@aiws/linker": dataURL(remap(linker, { "./kernel.mjs": "@aiws/kernel" })),
    "@aiws/compiler": dataURL(
      remap(compiler, {
        "./kernel.mjs": "@aiws/kernel",
        "./linker.mjs": "@aiws/linker",
      }),
    ),
    "@aiws/runtime": dataURL(
      remap(runtime, { "../dist/compiler.mjs": "@aiws/compiler" }),
    ),
  };
  const json = JSON.stringify(graph).replaceAll("<", "\\u003c");
  const css = styles
    .replace(/@import[^;]+;/g, "")
    .replaceAll("</style", "<\\/style");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIWS Application</title><style>${css}\nbody{padding:24px;background:#f6f7fb}.standalone{max-width:1200px;margin:auto}.selected-node{outline:none!important}.compiled-app [data-aiws-id]{cursor:auto}.compiled-app [data-aiws-id]:hover{box-shadow:none}</style><main id="application" class="standalone"></main><p id="error" role="alert"></p><script type="importmap">${JSON.stringify({ imports })}</script><script type="application/json" id="graph">${json}</script><script type="module">import {createKernel} from '@aiws/kernel';import {createRuntime} from '@aiws/runtime';const kernel=createKernel(JSON.parse(document.getElementById('graph').textContent)),runtime=createRuntime(document.getElementById('application'));function action(id,event,value){try{kernel.dispatch(id,event,value)}catch(e){document.getElementById('error').textContent=e.message}}function render(){runtime.render(kernel.get(),null,()=>{},action)}kernel.subscribe(render);render();</script></html>`;
}
