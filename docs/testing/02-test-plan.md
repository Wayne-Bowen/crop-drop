# Task 2: Test plan for registration, produce catalogue and checkout

| | |
|---|---|
| Application | CropDrop, farmer and buyer marketplace |
| Version tested | Git commit: `________` (run `git rev-parse --short HEAD`) |
| Prepared by | Wayne Bowen |
| Date | ________ |

## 1. Test environment

| Item | Detail |
|---|---|
| Development machine | Windows with WSL (Ubuntu), Node.js 20 or newer |
| Database | PostgreSQL 16 on WSL. A separate database `cropdrop_test` is wiped and rebuilt for every automated run so the live data is never touched. |
| Automated tests | `tests/report.js` (57 cases) and `tests/smoke.js` (regression suite), run with `npm run test:report` and `npm test` |
| Browsers for manual tests | Google Chrome and Microsoft Edge (or Firefox) |
| Screen sizes | 1440 px wide desktop and 390 px wide phone (browser DevTools device toolbar) |
| Deployed site | https://crop-drop.onrender.com (Render web service, Neon PostgreSQL), used for the acceptance journey only |
| Debugging tools | Browser DevTools, VS Code debugger (`.vscode/launch.json`), `psql`, `curl` |

## 2. Scope

**In scope:** registration and login, produce catalogue (list, search, filter, sort, detail, listing creation rules), checkout and orders (cart to order, stock, status lifecycle, receipt).
**Out of scope:** payment (not part of the scenario), email sending, load and stress testing, the free hosting platform's own reliability.

## 3. Objectives
1. Confirm each module meets the functional requirements in the project scenario.
2. Check input limits and refusal of wrong input (boundary and negative testing).
3. Verify protection against SQL injection, weak passwords and unauthorised access.
4. Confirm the site is usable at desktop and phone width in two browsers.
5. Record every defect with evidence, then fix it and confirm nothing else broke.

## 4. Test cases to be covered
Full list with steps and expected results: `03-test-case-catalogue.md`.

| Module | Automated cases | Positive | Boundary | Negative | Security | Manual |
|---|---|---|---|---|---|---|
| Registration | 11 | 3 | 4 | 4 |  | MAN-02 |
| Login and security | 16 | 1 |  | 1 | 14 | MAN-01 |
| Produce catalogue | 14 | 4 | 4 | 3 | 3 | MAN-03 |
| Checkout and orders | 16 | 6 | 3 | 5 | 2 | MAN-04 |

Every module has at least one positive case and at least one boundary or negative case.

## 5. Expected results and pass criteria
* Each case lists its expected result in the catalogue. A case **passes** only when the actual result matches exactly.
* The run is acceptable when every case passes, or when each failure is logged as a defect, fixed and re-tested.
* Exit criteria: no open defect of severity High or Critical, and the regression run passes in full.

## 6. Testing schedule (4 hour session)

| Time | Activity | Output |
|---|---|---|
| 0:00 to 0:20 | Set up: start Postgres, create `cropdrop_test`, `npm install`, read the plan | Environment ready |
| 0:20 to 0:45 | Run `npm run test:report`, save the report, screenshot the terminal | `results/test-results-*.md`, `.csv` |
| 0:45 to 1:15 | Security tests: review SQL injection and authentication results, run MAN-01 (lockout) | Evidence screenshots |
| 1:15 to 1:50 | Usability and compatibility checks on `/catalogue`: two sizes, two browsers | `04-usability-compatibility.md` filled in |
| 1:50 to 2:20 | Defect register: log every failure, reproduce each manually, capture evidence | `05-test-report-and-defects.md` |
| 2:20 to 3:20 | Debug and fix each defect, plant and fix a fault in any module with no defects | `06-...` log, code changes, commits |
| 3:20 to 3:45 | Regression: rerun both suites, repeat the browser journey (MAN-04) | Final results file |
| 3:45 to 4:00 | Final check of evidence, commit, push | Repository up to date |

## 7. Risks and assumptions
* The free hosting service sleeps after 15 idle minutes, so the first request on the deployed site is slow. Acceptance checks on the deployed site allow for it.
* The automated run deletes everything in `cropdrop_test`. It refuses to run against any other database.
* Browser results can differ by version. Record the versions used.

## 8. Roles
Tester, developer and report author: Wayne Bowen.
