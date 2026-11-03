# Benchmark protocol

Run `npm ci && npm run bench` in `aiws-2.0`. The benchmark warms the compiler on the seed, performs 1,000 one-node edits, and records transaction + compile median/p95, modified artifact count, context/graph UTF-8 bytes, current heap usage and Node version. It excludes browser layout, paint and inference; heap usage is not an allocation profile.

One onboarding run on Node 24.22.1 / 13 nodes measured median 0.096 ms, p95 0.378 ms and exactly 1,000 modified local artifacts for 1,000 patches. Context was 305 bytes versus 2,352 graph bytes. These are observations on this small sample, not cross-platform guarantees or superiority claims.

Model calls are zero for deterministic commands. Token counts, inference costs and a traditional TypeScript/React baseline remain unmeasured (`null`). Future comparisons must fix model/version/tokenizer, tasks, output correctness, hardware and warmup, and report input/output tokens, costs, intent-to-preview latency and browser performance separately. No binary-token savings are claimed.
