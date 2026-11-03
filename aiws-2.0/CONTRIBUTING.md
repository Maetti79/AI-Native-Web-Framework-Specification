# Contributing

Use a feature branch and preserve historical specifications. Inside `aiws-2.0` run `npm ci`, `npm test`, `npm run test:e2e` and `npm run bench`. Browser tests need Chromium; install with `npx playwright-core install --with-deps chromium`, or set `CHROMIUM_PATH` to an existing executable. CI runs the same suites.

Add regression tests for graph operations, invalid input and user-visible changes. Keep external models optional. Do not bypass schema validation or evaluate graph strings as code. Document schema/version changes and architectural tradeoffs. Include reproducible measurements with performance claims. Submit focused pull requests with test results and any known limitations.
