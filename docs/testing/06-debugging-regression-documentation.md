classify and correct defects, debug with tools, regression test, document

The findings, screenshots and results must come from your own runs. The worked example (D1) shows how to record one properly.

## Task 7: Classify, trace, correct, record

### Error types

| Type | Meaning | CropDrop example |
|---|---|---|
| **Syntax** | The code breaks the language rules. The program will not start or parse. | A missing bracket in a route file: the server prints `SyntaxError` and stops. |
| **Runtime** | The code is valid but fails while running. | Using a variable that does not exist: `ReferenceError`, the request returns HTTP 500. |
| **Logical** | The code runs without error but gives the wrong result. | Adding the price without multiplying by quantity, or truncating input before checking its length. |

### Defect D1 (real, found by REG-06): worked example

| Field | Entry |
|---|---|
| Module | Registration |
| Symptom | A 151-character email registers successfully, but the stored address is 150 characters (the last character is gone) |
| Expected / actual | HTTP 400 with an email error / HTTP 201 and an account under a different address |
| Severity | Medium (user data silently changed; the user cannot log in with the address they typed) |
| **Error type** | **Logical** |
| Where | `src/util.js`, function `clean`; used in `src/routes/auth.js`, register handler |
| How it was traced | See Task 8 below |
| Root cause | `clean(value, max)` ends with `.slice(0, max)`. The register handler calls `clean(req.body.email, 150)` and only then validates. By the time `isEmail` checks `length <= 150`, the input has already been cut to 150, so that check can never fail |
| Suggested correction | In `register`, read the untruncated trimmed values and let the validators see the real length: `const full_name = String(req.body.full_name ?? '').trim()`, `const email = String(req.body.email ?? '').trim().toLowerCase()`, `const phone = String(req.body.phone ?? '').trim()`, and add `if (full_name.length > 100) errors.full_name = 'Name must be 100 characters or fewer.'` next to the existing name check. `isEmail` and `isPhone` already reject overlong values. |
| Related places to review | The same truncation pattern is used for names, locations, descriptions and messages in `src/routes/produce.js` and `src/routes/public.js`. Decide whether to refuse or truncate and record your decision. |
| Verification | Re-run D1 reproduction (now HTTP 400); run `npm run test:report` (REG-06 passes) and `npm test` |

### Faults for modules with no real defect
The paper requires you to introduce and document one fault in any module where testing finds nothing, then trace and correct it. Do this yourself in the code so it is your own work.

| Module | Fault to introduce | Type | How it shows up |
|---|---|---|---|
| Produce catalogue | In `src/routes/produce.js` change `p.price ASC` to `p.price DESC` for sort `low` | Logical | CAT-04 fails (prices not ascending) |
| Produce catalogue (alternative) | Remove a closing bracket in the same file | Syntax | Server will not start; `SyntaxError` with the line |
| Checkout and orders | In `src/routes/orders.js` change `total += p.price * qty;` to `total += p.price;` | Logical | CHK-01 and CHK-07 fail (wrong total) |
| Checkout and orders (alternative) | Rename `merged` to `mergd` in one place | Runtime | Order returns HTTP 500; terminal shows `ReferenceError` |

Record each in the table at the end of this file. Put the fault back by fixing it properly, not by undoing it silently: show the trace first.

## Task 8: Debugging tools and techniques (isolate before correcting)

| Tool | Use it for |
|---|---|
| Test report (`npm run test:report`) | Finds which case fails and what it expected and got |
| `curl` and Browser DevTools, Network tab | Reproduce the request and read the exact status code and response |
| VS Code debugger (F5, `.vscode/launch.json`) | Pause the server on a line and read variables |
| `psql` queries | Check what was actually stored |
| Terminal output | Stack traces for runtime and syntax errors |
| `git diff` | See what changed since it last worked |

**Technique for every defect:** reproduce, compare expected and actual, decide which layer is at fault (request, server, database), set a breakpoint where the wrong value first appears, read the variables, then change the code.

**How D1 is isolated:**
1. The report shows REG-06 fails and the actual column says `150 chars: HTTP 201; 151 chars: HTTP 201`. (Screenshot)
2. Reproduce with `curl` (see `05-test-report-and-defects.md`). The response is success when it should be an error. (Screenshot)
3. Query the database: the stored email is 150 characters. The data was changed before it reached the database, so the fault is in the server code, not the database. (Screenshot)
4. In VS Code press F5 and put a breakpoint on the line in `src/routes/auth.js` that reads the email. Repeat step 2. In the variables panel `req.body.email.length` is 151 but `email.length` is 150. (Screenshot)
5. Step into `clean` and see `.slice(0, max)`. That is the cause.

Capture evidence **before** changing code: failing report row, curl output, database output, breakpoint with variable values. Name files `D1-01-...png` and keep them in `evidence/`.

## Task 9: Regression testing after fixes

After each fix:
1. Repeat the exact steps that failed (for D1: the reproduction now returns HTTP 400).
2. Run both suites: `DATABASE_URL=postgres://cropdrop:cropdrop@localhost:5432/cropdrop_test npm run test:report` (57 cases) and `... npm test` (46 checks). All must pass.
3. Repeat the browser journey for the affected module (MAN-04 for checkout, register and log in for registration).

| Module | Automated cases that guard it |
|---|---|
| Registration and login | REG-01 to REG-11, AUTH-01 to AUTH-03, SEC-01 to SEC-13 |
| Produce catalogue | CAT-01 to CAT-14 |
| Checkout and orders | CHK-01 to CHK-16 |

### Regression record

| Fix ID | Module affected | Steps re-run | `test:report` result | `npm test` result | New defects | Verified (date) |
|---|---|---|---|---|---|---|
| D1 | Registration | D1 reproduction, register and log in in the browser | | | | |
| P1 | Produce catalogue | | | | | |
| P2 | Checkout and orders | | | | | |

## Task 10: Debugging documentation

Complete one block per defect or fault. D1 above is the model.

| Field | D1 | P1 | P2 |
|---|---|---|---|
| Module | Registration | | |
| Symptom | | | |
| Steps to reproduce | | | |
| Expected / actual | | | |
| Severity | | | |
| Error type | Logical | | |
| Tool and technique used to isolate | | | |
| Evidence files | | | |
| Root cause | | | |
| Source change (before and after) | | | |
| Verification and regression result | | | |
| Final status | | | |

Finish with a short summary: how many defects were found by which test type, and one paragraph on what the debugging showed (for example, that boundary tests found a defect the normal-case tests missed).
