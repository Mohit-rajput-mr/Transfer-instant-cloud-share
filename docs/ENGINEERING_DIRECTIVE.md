# MANDATORY DIRECTIVE: full-platform responsibility, root-cause fixes, proactive defect prevention

Set by the owner on 2026-10-19. Applies to every AI agent and every task on this project: bug reports, features,
refactors, tests, deployments and maintenance. `CLAUDE.md` points here; read it before you change anything.
The running defect list it requires lives in `FLEET_SYNC.md` → "Defect log".

## 1. Fix the whole problem, not the reported symptom
Treat every report as evidence that the implementation, architecture, validation, testing or process may be wrong.
1. Find the actual root cause before fixing anything.
2. Trace it through every layer involved: frontend, backend, APIs, database, auth, state, integrations, config, deploy, infra.
3. Find every other component, feature, workflow or dependency with the same cause or pattern.
4. Fix the reported issue and every confirmed related defect.
5. Search the codebase for similar implementations that could fail the same way, even if nobody hit them yet.
6. Fix the shared implementation instead of patching each symptom.
7. Add tests, validation, error handling, monitoring or safeguards so the same class of defect can't recur.

A fix is incomplete if the error disappears but the cause remains.

## 2. Find problems before the owner does
After any investigation, review for: similar bugs elsewhere; features sharing the defective logic, components, APIs,
queries or dependencies; untested workflows and edge cases; wrong assumptions, missing validation, race conditions,
inconsistent state, unreliable error handling; data integrity, data loss, duplicate operations, migration risks;
auth, access-control and data-isolation weaknesses; API contract mismatches, timeouts, retries, partial failures;
performance, leaks, concurrency, scalability; broken loading / empty / error / success / recovery states in the UI;
deploy, env config, dependency and compatibility issues; technical debt that threatens the affected system.
These are investigation requirements, not permission to invent defects: use evidence (code, tests, reproduction).

## 3. Review the platform, not only the current file
Every significant fix triggers a scoped review of the surrounding system; widen it when the problem is systemic.
"It currently appears to work" is not proof. Keep the running list (FLEET_SYNC.md → Defect log) of: confirmed defects,
related defects, risks to verify, fixes done, tests run and their results, blockers and accepted risks. Read earlier
failed fixes before trying again; don't repeat a failed approach without knowing why it failed.

## 4. Workflow for every issue
- **A. Diagnose:** reproduce, read the code path and logs, find the root cause.
- **B. Expand:** related defects, shared faulty patterns, affected dependencies, edge cases, regression risks.
- **C. Plan:** changes, affected components, regression risks, validation, acceptance criteria.
- **D. Implement:** fix the root cause and the related confirmed defects; prefer one shared correction; keep intended
  behaviour and backward compatibility unless a change is required.
- **E. Verify:** run the relevant unit / integration / e2e / regression / security / migration / performance checks.
  Check real behaviour (browser, API, database), not just that it compiles.
- **F. Review the surroundings:** did the fix expose similar problems, new risks or an incomplete workflow?
- **G. Report accurately:** root cause, changes, related issues fixed, checks run and their real results, what remains.

Scale depth to risk, but never skip a phase.

## 5. No temporary patches presented as fixes
Not acceptable as a complete solution: hiding an error; swallowing exceptions; arbitrary delays, retries, hardcoded
values or special cases without proof they are correct; disabling validation, security, tests or features; fixing one
occurrence and leaving equivalent ones; frontend changes that conceal a backend or database problem; mock data or
placeholders without saying so; declaring success from compilation or assumption.
A workaround is allowed only when justified, labelled as such, safeguarded, and logged with a plan to fix the cause.

## 6. Protect existing functionality
Understand current behaviour and dependents before changing code. After the fix, verify the affected feature and its
most relevant dependent workflows. No unnecessary unrelated changes or risky broad refactors; when a shared fix is
needed, test every consumer. Add tests where feasible; if testing is blocked (credentials, infra, data), say so and do
the checks that are possible. Never claim an untested workflow is verified.

## 7. Own what you find
Classify discovered defects:
- **Critical:** security, data corruption or loss, outages, essential features unusable. Fix immediately within scope.
- **High:** major workflow failures, widespread wrong behaviour, serious reliability or regression risk. Fix alongside.
- **Medium:** reproducible defects in secondary features or edge cases with real impact. Fix when in scope and safe.
- **Low:** cosmetic or minor. Log it; don't let it distract from bigger issues.
Prioritisation is never a reason to ignore critical or high issues. Anything needing separate authorisation, a big
scope change, a risky migration or a destructive action: explain and ask first.

## 8. Prevention, not just corrections
For recurring categories, find why the process let them through and add, where it pays off: regression tests, shared
validation and error handling, stronger types and contracts, database constraints and transactions, consistent API
schemas, lint / type checks, security and access-control tests, CI gates, structured logging and monitoring,
performance checks, documented invariants. No complexity without a demonstrated benefit.

## 9. Don't declare completion early
Done only when: the issue is resolved and verified as far as possible; the root cause is fixed; related defects are
fixed or logged; regression checks passed (or their absence is disclosed); important affected workflows were checked;
no known critical or high related defect is silently ignored; remaining uncertainty and blockers are written down.
If verification fails, keep going. If blocked, state the exact blocker, the evidence, what remains and what is needed.
Never fabricate results, claim access you don't have, or promise there will be no future defects.

## 10. Standard of responsibility
The owner should not have to find the same category of mistake twice, report every related defect, or remind you to
check the obvious consequences of your own changes. A report is a trigger to examine the system, fix the failure
pattern everywhere, and harden against recurrence. Don't stop at the first passing check, the vanished symptom, or the
edited file; stop when the acceptance criteria are met, verification is done, and remaining risks are documented.

## Project specifics (how to apply it here)
- Checks before every push: `npx tsc --noEmit -p .`, `npx eslint <changed files>`, the production build from FLEET_SYNC
  ("How to ship"), and a real browser check (Playwright + `/opt/pw-browsers`, `next dev` with mocked `/api/*`) of every
  screen you touched, in Classic and Work, desktop and phone width.
- Database: every change is a file in `supabase/migrations/`; prefer `update` over `delete`. The Supabase MCP hangs on
  SQL containing `delete` → give the owner the SQL to paste and verify afterwards that it exists.
- Live check after deploy: `https://orbitransfer.com/api/version` shows the new build/RELEASE; then exercise the change.
- Log every defect, fix, test and open risk in FLEET_SYNC.md → Defect log.
