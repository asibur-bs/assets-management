# Code Generation Questions — `u2-domain-vocabulary`

**Unit**: Domain Vocabulary and Error Contract  
**Intent**: 261106-asset-tracker-mvp

## Plan Approval

Does the code-generation plan (including its embedded Testing Contract) and the unit-test instructions look correct for U2?

Covered artifacts:
- `code-generation-plan.md` — leaf library at `src/domain/`; test-after; omit DB/repo/API/UI; stories US1.2, US3.3, US3.6, US5.1, US5.6 + transition/error baseline
- `unit-test-instructions.md` — `tests/domain/vocabulary.test.js` and `tests/domain/translation.test.js` (5–8 each); unit command `npx vitest run tests/domain/vocabulary.test.js tests/domain/translation.test.js`

[Approval Fingerprint]: sha256:v3:ad03a257d25da88d79cf3d840df15e88367f513965025a29f6bb3f84ea947e6c
[Planned Source]: dd6db1bbf940daede303ae076eb2ac89119208567ff09eb0fc5ae1f757bc6d13

- Approve Plan — proceed to code generation
- Request Changes — revise the plan

[Answer]: Approve Plan
