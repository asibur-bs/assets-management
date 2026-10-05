# Requirements Analysis Questions

## Sources

- [intent] `aidlc/spaces/default/intents/261004-poc/ideation/intent-capture/intent-statement.md`: carried-forward assumptions and open questions.
- [scope] Workflow-selected scope: `poc`.
- [Q4] Success metrics — concrete thresholds for clicks and lookup time are deferred to Requirements Analysis.
- [assumption] Asset categories in scope are not yet defined (forwarded from intent-capture).

## Q1. Which asset categories should the `poc` cover?

A. Hardware only (laptops, monitors, peripherals)
B. Hardware + software/licenses
C. Hardware + software/licenses + office/facility assets (full set)
D. Software/licenses only
E. Not yet defined
X. Other (please specify)

[Answer]: B

## Q2. What level of user authentication should the `poc` implement?

A. None — single shared internal user (small team, trusted environment)
B. Username/password login (single role)
C. Username/password with basic role separation (admin vs. standard user)
D. SSO integration (e.g., company Google / Microsoft account)
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. How should asset assignment work in the `poc`?

A. Assets are issued to an employee (one current assignee)
B. Assets are issued to an employee with a return-by date
C. Assets can be reassigned freely; only the latest assignment is tracked
D. No assignment concept — assets are pooled and tracked only by location/status
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. What status values should the `poc` support?

A. In stock / Assigned / Returned / Lost (4 states)
B. In stock / Assigned / Under repair / Retired (4 states)
C. In stock / Assigned / Returned / Under repair / Retired / Lost (6 states)
D. Free-text status field with suggested values
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. What audit trail depth should the `poc` capture?

A. None — current state only
B. Last action only (who changed what most recently)
C. Full event log (every create, update, assign, return)
E. Not yet defined
X. Other (please specify)

[Answer]: B

## Q6. What search and lookup capabilities does the `poc` need?

A. List view with simple text search by name/serial
B. List view with filter by category, status, assignee
C. List view with text search + filters + sort
D. No search — browse by category only
E. Not yet defined
X. Other (please specify)

[Answer]: C

## Q7. How are assets created in the `poc`?

A. Manual entry only (web form per asset)
B. Manual entry + bulk CSV import
C. Manual entry + barcode/QR scan to populate form
D. API/programmatic only
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q8. What persistence layer should the `poc` use?

A. SQLite file database (zero-config, embedded)
B. PostgreSQL (external DB)
C. In-memory store (resets on restart — for demo only)
D. JSON file storage (no SQL)
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q9. What backend stack should the `poc` use?

A. Node.js (Express/Fastify) + REST API
B. Python (Flask/FastAPI) + REST API
C. Single-file serverless function (e.g., Next.js API routes)
D. No separate backend — server-rendered web app only
E. Not yet defined
X. Other (please specify)

[Answer]: D

## Q10. What frontend form should the `poc` use?

A. Server-rendered HTML with a lightweight CSS layer (no SPA framework)
B. Single-page React/Vue app talking to REST API
C. Server-rendered with progressive enhancement (HTMX, Turbo)
D. Static HTML files only — no dynamic server
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Hardware + software/licenses asset categories in scope for the `poc`.
- Single shared internal user — no authentication in the `poc`.
- One assignee per asset at any time, with no return-by date.
- Four lifecycle states: in stock, assigned, returned, lost.
- Last-action audit trail (who/when/what most recent change).
- List view supports text search, filter by category/status/assignee, and sort.
- Manual entry via web form per asset only.
- SQLite as the embedded persistence layer.
- Server-rendered web app (no separate backend tier).
- Server-rendered HTML with a lightweight CSS layer (no SPA framework).

Does this all look correct before I generate the requirements artifact?
- Looks correct
- Request changes

[Answer]: Looks correct