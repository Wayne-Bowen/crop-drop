# Assessment 2, tasks 8 to 10: debugging tools, regression testing, documentation

This guide shows the method and gives templates. **The findings, screenshots and results must be your own**, from running the application yourself. Where a defect or fault appears below it is an example of how to record one.

---

## Task 8: Isolate each defect with debugging tools before fixing it

### Tools available for CropDrop

| Tool | Use it for | How |
|---|---|---|
| Browser DevTools, **Console** | JavaScript errors in the front end | F12, Console. Red lines show the file and line. |
| Browser DevTools, **Network** | Failed or wrong API calls | F12, Network, click the request: status code, request body, response body. |
| Browser DevTools, **Sources** | Pausing front-end code | Click a line number to set a breakpoint, then repeat the action. |
| **VS Code debugger** | Pausing the Express server | `.vscode/launch.json` is included. Press F5, set a breakpoint in a route file, repeat the action in the browser. Inspect variables in the left panel. |
| Server terminal output | Runtime errors and stack traces | Read the terminal running `npm run dev`. |
| `psql` queries | Checking what was really saved | `psql postgres://cropdrop:cropdrop@localhost:5432/cropdrop -c "SELECT ..."` |
| `curl` | Calling the API without the browser | `curl -s localhost:3000/api/produce?limit=2` |
| `git diff` / `git log -p` | Finding what changed since it last worked | `git diff HEAD~1 -- src/routes/orders.js` |

### Isolation technique (do this for every defect)
1. **Reproduce** it with exact steps and note them.
2. **Compare** expected and actual result.
3. **Locate the layer.** Network tab: is the request wrong or the response wrong? If the request is right and the response wrong, the fault is on the server. If the response is right and the page is wrong, it is in the front-end code. Check the database with `psql` to see whether data is stored correctly.
4. **Pause and inspect.** Put a breakpoint where the wrong value could first appear and read the variables.
5. **Capture evidence** before changing anything: screenshot of the failing state, the breakpoint with variable values, the console or terminal error.

Save screenshots in an `evidence/` folder (do not commit anything containing secrets) named like `D1-01-symptom.png`, `D1-02-breakpoint.png`, `D1-03-after-fix.png`.

### Worked example (plant, find and fix one fault yourself)

1. In `src/routes/orders.js` change `total += p.price * qty;` to `total += p.price;`. This is a **logical error**: it ignores the quantity.
2. Run `DATABASE_URL=postgres://cropdrop:cropdrop@localhost:5432/cropdrop_test npm test`. The check **order total uses database price** fails (expected 1200, got 80). Screenshot it.
3. Press F5 with a breakpoint on that line. Place an order for 15 units. Inspect `p.price` (80) and `qty` (15) in the variables panel and watch `total` stay at 80. Screenshot it.
4. Fix it back to `total += p.price * qty;`.

Other faults you can plant, one per module, so each module has its own evidence:

| Module | Fault to plant | Type | How it shows up |
|---|---|---|---|
| Registration | In `src/util.js` change `isPhone` regex to require 11 digits | Logical | Valid numbers are rejected: Network tab shows 400 with a phone field error. |
| Catalogue | Remove a closing bracket in `src/routes/produce.js` | Syntax | The server will not start; the terminal prints `SyntaxError` with the line. |
| Checkout | In `src/routes/orders.js` rename `merged` to `mergd` in one place | Runtime | Placing an order returns 500; the terminal shows `ReferenceError: merged is not defined`. |

---

## Task 9: Regression testing after each fix

After each fix:

1. Re-run the exact steps that failed and confirm they now pass.
2. Run the whole automated suite: `DATABASE_URL=postgres://cropdrop:cropdrop@localhost:5432/cropdrop_test npm test`. It runs 46 checks and ends with `46 passed, 0 failed`. (It wipes the `_test` database only; it refuses to run against any other.)
3. Manually repeat the main journey for the affected module in the browser.

### Which checks cover which module

| Module | Automated checks | Manual check |
|---|---|---|
| Registration and login | register farmer, duplicate email, weak password, bad phone, no self-registration as admin, SQL injection login attempt, admin login | Register, log in, wrong password shows the generic error |
| Produce catalogue | search and filter, SQL injection in search, product detail, batch lookup, farmer profiles, stats | Search "toma", filter by category, open a product |
| Checkout and orders | guest and farmer cannot order, over-stock refused, order total from database, stock decreases, PDF receipt, other buyer cannot read order, status flow | Add to cart, place order, open receipt |

### Regression record

| Fix ID | Module affected | Steps re-run | Full suite result | New defects found | Verified by and date |
|---|---|---|---|---|---|
| D1 | Checkout | Order 15 units, check total | 46 passed, 0 failed | None | |

---

## Task 10: Debugging documentation

One entry per defect or planted fault.

| Field | D1 (example, replace with your own) |
|---|---|
| Module | Checkout |
| Symptom | Order of 15 units at KES 80 shows total KES 80 |
| Steps to reproduce | Log in as buyer, add 15 Tomatoes, place order, open My orders |
| Expected / actual | KES 1,200 / KES 80 |
| Severity | High (wrong money amount) |
| Error type | Logical |
| Tool and technique used to isolate | `npm test` failure, then VS Code breakpoint in `src/routes/orders.js`, inspected `p.price` and `qty` |
| Evidence | `evidence/D1-01-test-fail.png`, `D1-02-breakpoint.png` |
| Root cause | Line added `p.price` instead of `p.price * qty` to the total |
| Source change | Before: `total += p.price;` After: `total += p.price * qty;` |
| Verification | Failing check now passes; full suite 46 passed, 0 failed; manual order shows KES 1,200 |
| Final result | Fixed and verified |

Add a final section to your report: a summary table of all defects (ID, module, type, status) and a short paragraph on what the debugging process showed about where bugs tend to hide.
