import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { createStudioServer } from "../server.mjs";
const server = createStudioServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
let executablePath = process.env.CHROMIUM_PATH;
if (!executablePath) {
  try {
    await access("/usr/bin/chromium");
    executablePath = "/usr/bin/chromium";
  } catch {
    executablePath = chromium.executablePath();
  }
}
const temp = await mkdtemp(join(tmpdir(), "aiws-browser-"));
let browser;
try {
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1512, height: 1100 },
    acceptDownloads: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator('[data-aiws-id="mrr"]').waitFor();
  assert.match(await page.title(), /AIWS Studio/);
  if (process.env.AIWS_ARTIFACT_DIR) {
    await mkdir(process.env.AIWS_ARTIFACT_DIR, { recursive: true });
    await page.screenshot({
      path: join(process.env.AIWS_ARTIFACT_DIR, "studio-desktop.png"),
      fullPage: true,
    });
  }
  // Graph event updates chart and supports undo/redo.
  await page.locator('[data-aiws-id="period-action"]').click();
  assert.equal(await page.locator(".period-chip").textContent(), "6 months");
  await page.locator("#undo").click();
  assert.equal(await page.locator(".period-chip").textContent(), "12 months");
  await page.locator("#redo").click();
  assert.equal(await page.locator(".period-chip").textContent(), "6 months");
  // Search derives table rows from state rather than a second hardcoded application.
  await page.locator('[data-aiws-id="search"] input').fill("Orbit");
  await page.locator('[data-aiws-id="search"] input').press("Tab");
  assert.equal(await page.locator(".data-table tr").count(), 2);
  assert.match(await page.locator(".data-table").textContent(), /Orbit Labs/);
  await page.locator('[data-aiws-id="search"] input').fill("");
  await page.locator('[data-aiws-id="search"] input').press("Tab");
  await page.locator('[data-aiws-id="mrr"]').click();
  await page
    .locator("#command")
    .fill("Make this card dark blue and change its title to Revenue.");
  await page.locator("#send").click();
  assert.match(
    await page.locator('[data-aiws-id="mrr"]').textContent(),
    /Revenue/,
  );
  assert.equal(
    await page
      .locator('[data-aiws-id="mrr"]')
      .evaluate((e) => getComputedStyle(e).backgroundColor),
    "rgb(20, 46, 88)",
  );
  assert.match(
    await page.locator("#compiler-metrics").textContent(),
    /1 compiled/,
  );
  // Navigation opens collapsed panels; add/delete and history are real operations.
  await page
    .getByRole("button", { name: "Components", exact: false })
    .first()
    .click();
  await page.locator("#new-type").selectOption("metric");
  await page.locator("#add-node").click();
  assert.equal(await page.locator('[data-aiws-id="component-1"]').count(), 1);
  await page.locator("#delete-node").click();
  assert.equal(await page.locator('[data-aiws-id="component-1"]').count(), 0);
  // Visual binding and event authoring use the same validated semantic operations.
  await page.locator('[data-aiws-id="mrr"]').click();
  await page.getByRole("button", { name: "Runtime", exact: false }).click();
  await page.locator("#bind-property").selectOption("label");
  await page.locator("#bind-source").selectOption("period-state");
  await page.locator("#apply-binding").click();
  assert.match(
    await page.locator('[data-aiws-id="mrr"]').textContent(),
    /6 months/,
  );
  await page.locator("#bind-source").selectOption("");
  await page.locator("#apply-binding").click();
  assert.match(
    await page.locator('[data-aiws-id="mrr"]').textContent(),
    /Revenue/,
  );
  await page
    .getByRole("button", { name: "Application graph", exact: false })
    .click();
  await page
    .locator("#graph-explorer button")
    .filter({ hasText: "period-action · action" })
    .click();
  await page.getByRole("button", { name: "Runtime", exact: false }).click();
  await page
    .locator("#event-input")
    .fill(
      JSON.stringify([
        { kind: "set", target: "period-state", key: "value", value: "Quarter" },
      ]),
    );
  await page.locator("#apply-event").click();
  await page.locator('[data-aiws-id="period-action"]').click();
  assert.equal(await page.locator(".period-chip").textContent(), "Quarter");
  await page.locator("#undo").click();
  await page.locator("#undo").click();
  // Export, malformed import rejection, valid import and reload.
  let downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  let download = await downloadPromise;
  const graphPath = join(temp, "graph.json");
  await download.saveAs(graphPath);
  const graph = JSON.parse(await readFile(graphPath, "utf8"));
  assert.ok(graph.version > 0);
  await page.locator("#import-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"root":"bad","nodes":[]}'),
  });
  await page.waitForFunction(() =>
    document.getElementById("toast").textContent.startsWith("Import rejected:"),
  );
  assert.match(await page.locator("#toast").textContent(), /Import rejected/);
  await page.locator("#import-file").setInputFiles(graphPath);
  await page.waitForFunction(
    () => document.getElementById("toast").textContent === "Graph imported",
  );
  await page.reload();
  assert.match(
    await page.locator('[data-aiws-id="mrr"]').textContent(),
    /Revenue/,
  );
  // Exported HTML content runs with networking disabled, using the same graph runtime.
  downloadPromise = page.waitForEvent("download");
  await page.locator("#export-app").click();
  download = await downloadPromise;
  const appPath = join(temp, "app.html");
  await download.saveAs(appPath);
  const offline = await browser.newContext({
      offline: true,
      viewport: { width: 1280, height: 900 },
    }),
    app = await offline.newPage();
  app.on("pageerror", (e) => errors.push(e.message));
  await app.setContent(await readFile(appPath, "utf8"));
  await app.locator('[data-aiws-id="mrr"]').waitFor();
  assert.match(
    await app.locator('[data-aiws-id="mrr"]').textContent(),
    /Revenue/,
  );
  await app.locator('[data-aiws-id="period-action"]').click();
  assert.equal(await app.locator(".period-chip").textContent(), "12 months");
  await app.locator('[data-aiws-id="search"] input').fill("Nova");
  await app.locator('[data-aiws-id="search"] input').press("Tab");
  assert.equal(await app.locator(".data-table tr").count(), 2);
  // Mobile layout and keyboard operation.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#reset").click();
  await page.locator('[data-aiws-id="mrr"]').focus();
  await page.keyboard.press("Enter");
  assert.match(await page.locator("#selection-panel").textContent(), /#mrr/);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    "mobile horizontal overflow",
  );
  if (process.env.AIWS_ARTIFACT_DIR)
    await page.screenshot({
      path: join(process.env.AIWS_ARTIFACT_DIR, "studio-mobile.png"),
      fullPage: true,
    });
  // A second application imports without any renderer-specific source changes.
  await page
    .locator("#import-file")
    .setInputFiles(
      new URL("../examples/counter.json", import.meta.url).pathname,
    );
  await page.locator('[data-aiws-id="increase"]').click();
  assert.equal(
    await page.locator('[data-aiws-id="display"] .metric-value').textContent(),
    "1",
  );
  await page.locator('[data-aiws-id="toggle"]').click();
  assert.equal(await page.locator('[data-aiws-id="display"]').isHidden(), true);
  await page.locator("#undo").click();
  assert.equal(
    await page.locator('[data-aiws-id="display"]').isVisible(),
    true,
  );
  // Server exposes only browser assets.
  for (const path of [
    "/package-lock.json",
    "/server.mjs",
    "/node_modules/typescript/package.json",
    "/src/kernel.mts",
    "/%2e%2e/README.md",
  ])
    assert.equal((await fetch(url + path)).status, 404);
  assert.equal((await fetch(url, { method: "POST" })).status, 405);
  assert.equal((await fetch(url, { method: "HEAD" })).status, 200);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: desktop/mobile Studio, graph actions, search, patches, undo/redo, component CRUD, import/export, reload, offline app, keyboard, server boundaries.",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
