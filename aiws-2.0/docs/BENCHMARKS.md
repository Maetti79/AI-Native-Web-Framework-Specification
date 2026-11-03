# Benchmark protocol

Run `npm ci && npm run bench` in `aiws-2.0`. The benchmark warms the compiler, performs 1,000 one-node edits and records transaction + compile median/p95, changed artifact count, context/graph UTF-8 bytes, current heap usage and Node version. It excludes browser layout, paint and inference. Heap usage is a point-in-time process observation, not a retained allocation measurement.

One 0.3.0 development run on Node 24.22.1 with the 19-node dashboard measured median **0.279 ms**, p95 **0.730 ms**, and exactly **1,000 changed local artifacts for 1,000 patches**. Selected context was 333 bytes versus 3,606 graph bytes. These observations are specific to this small graph and machine. Cache warmup, host load and garbage collection affect results; no cross-platform guarantee or superiority claim is implied.

Unchanged nodes avoid local template reconstruction and DOM replacement. Validation/address discovery still scans graph data, and state lookup is not yet fully indexed. Report this distinction alongside any timing result.

Model calls are zero for deterministic commands. Actual input/output token counts, inference costs, intent-to-preview latency with a model, browser runtime comparisons, and a traditional TypeScript/React baseline remain unmeasured. A future comparison must fix the model/tokenizer, tasks, correctness criteria, hardware and warmup, and report those dimensions separately. Byte counts are not token counts. No binary-token savings are claimed.
