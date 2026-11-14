# Code Generation Questions — `u1-foundation`

**Unit**: Foundation  
**Intent**: 261106-asset-tracker-mvp

## Plan Approval

Does this exact code-generation plan, including its embedded Testing Contract, and the unit-test instructions look correct for U1?

Covered artifacts:
- `code-generation-plan.md` — one migration rebuilds `audit_log` then `assets`; `resolveActor()` reads `ASSET_ACTOR` or returns `system`; `busy_timeout` is 5000; rebuild tests are written first
- `unit-test-instructions.md` — `npx vitest run --maxWorkers=1 --no-file-parallelism tests/foundation/rebuild.test.js tests/foundation/connection.test.js tests/foundation/actor.test.js`

[Approval Fingerprint]: sha256:v3:5578bf2f71fbbad1142f17292b3a3ed3fca779e932c6a6e2977b9aa580b89994
[Planned Source]: 1682427dbcf507f5d360bdf90564272953a742894fb1aa1766d48251428ccd89

- Approve Plan — proceed to code generation
- Request Changes — revise the plan

[Answer]: Approve Plan
