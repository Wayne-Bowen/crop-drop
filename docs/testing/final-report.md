# CropDrop: testing and debugging report

| | |
|---|---|
| Tester and developer | Wayne Bowen |
| Application | CropDrop, farmer and buyer marketplace (Node.js, Express, PostgreSQL) |
| Repository | https://github.com/Wayne-Bowen/crop-drop |
| Version tested (latest commit) | `1daf556` |
| Report generated | 2026-10-25 09:42 UTC from the files in `docs/testing/results` and the Git history |

## 1. Summary

The latest automated run executed **57 test cases**: **57 passed, 0 failed**. 4 defects were found, traced with the debugger, corrected and re-tested (below).

Method, test types, plan and case list: `01-testing-types.md`, `02-test-plan.md`, `03-test-case-catalogue.md`.

## 2. Test run history

| Run | Date (UTC) | Passed | Failed | Cases that failed | Results file |
|---|---|---|---|---|---|
| 1 | 2026-10-17 18:20:20 UTC | 56 | 1 | REG-06 | `test-results-2026-10-17-18-20.md` |
| 2 | 2026-10-17 18:35:23 UTC | 56 | 1 | REG-06 | `test-results-2026-10-17-18-35.md` |
| 3 | 2026-10-18 19:39:59 UTC | 57 | 0 | none | `test-results-2026-10-18-19-39.md` |
| 4 | 2026-10-19 02:47:12 UTC | 56 | 1 | CAT-04 | `test-results-2026-10-19-02-47.md` |
| 5 | 2026-10-19 02:56:15 UTC | 56 | 1 | CAT-04 | `test-results-2026-10-19-02-56.md` |
| 6 | 2026-10-19 03:08:01 UTC | 56 | 1 | CAT-04 | `test-results-2026-10-19-03-08.md` |
| 7 | 2026-10-19 03:14:14 UTC | 57 | 0 | none | `test-results-2026-10-19-03-14.md` |
| 8 | 2026-10-19 03:18:00 UTC | 55 | 2 | CHK-01, CHK-16 | `test-results-2026-10-19-03-18.md` |
| 9 | 2026-10-19 03:29:15 UTC | 55 | 2 | CHK-01, CHK-16 | `test-results-2026-10-19-03-29.md` |
| 10 | 2026-10-19 03:33:52 UTC | 57 | 0 | none | `test-results-2026-10-19-03-33.md` |
| 11 | 2026-10-23 04:02:55 UTC | 57 | 0 | none | `test-results-2026-10-23-04-02.md` |
| 12 | 2026-10-24 09:29:54 UTC | 57 | 0 | none | `test-results-2026-10-24-09-29.md` |

## 3. Defect register

| ID | Module | Found by | Expected | Actual | Severity | Type | Fix commit | Status |
|---|---|---|---|---|---|---|---|---|
| D1 | Registration | Automated case REG-06 | HTTP 400 with an email error | HTTP 201 and an account created under a different address | Medium | Logical | `a1edd6f` | Fixed and verified |
| P1 | Produce catalogue | Deliberately introduced fault (no real defect found in this module) | Prices in ascending order | Prices in descending order | Medium | Logical | `ebbd45b` | Fixed and verified |
| P2 | Checkout and orders | Deliberately introduced fault (no real defect found in this module) | Total equals the sum of price x quantity | Total equals the sum of prices, ignoring quantity | High | Logical | `c97b5fb` | Fixed and verified |
| U1 | Home page (front end layout) | Manual usability check 1 (Run A: Chrome 155.0.8059.85, Windows 11, 1440 x 900) | The page fits the screen width with no horizontal scrollbar | The page was wider than the screen: 100 px wider at 1440 px and 24 px wider on smaller screens | Medium | Logical | `5cda194` | Fixed and verified |

Usability issues found in the manual checks (if any) are listed in section 6.

## 4. Defect analysis and correction

### D1: Registration

| Field | Entry |
|---|---|
| Symptom | A 151-character email was accepted, but the stored address was 150 characters (the final character was lost) |
| Steps to reproduce | Register with a 151-character email through the API (curl), then read the stored email with psql |
| Expected / actual | HTTP 400 with an email error / HTTP 201 and an account created under a different address |
| Severity | Medium |
| Error type | **Logical** |
| Tools and technique used to isolate | Test report, curl, psql, VS Code debugger breakpoint in `src/routes/auth.js` (register handler), Debug Console |
| What the trace showed | At the breakpoint `req.body.email.length` was 151 and `email.length` was 150 after the line ran. `clean.toString()` showed `.slice(0, max)` |
| Root cause | `clean(value, max)` truncates its input, and the register handler called it before validating, so the `length <= 150` check in `isEmail` could never fail |
| Source change | Before: `email = clean(req.body.email, 150).toLowerCase()` (and name, phone the same way). After: read the trimmed, untruncated values with a `trimmed()` helper and add a 100-character limit check on the name |
| Detected by | `test-results-2026-10-17-18-20.md` (56 passed, 1 failed) |
| Fix commit | `a1edd6f` (2026-10-18) Fix D1: reject overlong registration input instead of truncating it |
| Verified in test run | `test-results-2026-10-18-19-39.md` (57 passed, 0 failed) |

### P1: Produce catalogue

| Field | Entry |
|---|---|
| Symptom | Sorting by "price: low to high" returned the most expensive items first |
| Steps to reproduce | GET /api/produce?sort=low and compare the prices returned |
| Expected / actual | Prices in ascending order / Prices in descending order |
| Severity | Medium |
| Error type | **Logical** |
| Tools and technique used to isolate | Test report (CAT-04 failed), VS Code debugger with a conditional breakpoint on `req.query.sort === 'low'` in `src/routes/produce.js` |
| What the trace showed | With `req.query.sort` equal to `'low'`, the `order` variable held `'p.price DESC'` after the line ran |
| Root cause | The sort map for `low` contained `p.price DESC` instead of `p.price ASC` |
| Source change | Before: `low: 'p.price DESC'`. After: `low: 'p.price ASC'` |
| Fault introduced in commit | `6260477` (2026-10-19) P1 (test only): introduce fault, sort low-to-high returns high-to-low |
| Detected by | `test-results-2026-10-19-02-47.md` (56 passed, 1 failed) |
| Fix commit | `ebbd45b` (2026-10-19) Fix P1: sort low-to-high now orders by ascending price |
| Verified in test run | `test-results-2026-10-19-03-14.md` (57 passed, 0 failed) |

### P2: Checkout and orders

| Field | Entry |
|---|---|
| Symptom | An order for 2 units at KES 80 had a total of KES 80 instead of KES 160 |
| Steps to reproduce | Place an order for 2 Tomatoes and read the order total; compare with the sum of its line items |
| Expected / actual | Total equals the sum of price x quantity / Total equals the sum of prices, ignoring quantity |
| Severity | High |
| Error type | **Logical** |
| Tools and technique used to isolate | Test report (CHK-01 and CHK-16 failed), VS Code debugger with a conditional breakpoint on `qty === 2` in `src/routes/orders.js` |
| What the trace showed | At the breakpoint `p.price` was 80 and `qty` was 2; after the line ran `total` was 80 instead of 160. CHK-07 still passed because it orders a quantity of 1, so price times 1 hides the fault |
| Root cause | The accumulator added `p.price` and never multiplied by `qty` |
| Source change | Before: `total += p.price;`. After: `total += p.price * qty;` |
| Fault introduced in commit | `26053f3` (2026-10-19) P2 (test only): introduce fault, order total ignores quantity |
| Detected by | `test-results-2026-10-19-03-18.md` (55 passed, 2 failed) |
| Fix commit | `c97b5fb` (2026-10-19) Fix P2: order total now multiplies price by quantity |
| Verified in test run | `test-results-2026-10-19-03-33.md` (57 passed, 0 failed) |

### U1: Home page (front end layout)

| Field | Entry |
|---|---|
| Symptom | The home page scrolled sideways as well as up and down |
| Steps to reproduce | Open the home page at 1440 px in Chrome and scroll; or run the DevTools console check that lists elements extending past the viewport |
| Expected / actual | The page fits the screen width with no horizontal scrollbar / The page was wider than the screen: 100 px wider at 1440 px and 24 px wider on smaller screens |
| Severity | Medium |
| Error type | **Logical** |
| Tools and technique used to isolate | Browser DevTools: device toolbar, Console (list of unclipped elements wider than the viewport), Elements and Styles panels |
| What the trace showed | The only unclipped element extending past the right edge was the product row (class rail): left -100, right 1525 at a 1440 px viewport |
| Root cause | The rail is a direct child of a full-width section, but its CSS used negative side margins based on 100vw that assume it sits inside the 1240 px container, so it was pushed past the right edge. 100vw also counts the scrollbar width on Windows |
| Source change | Before: negative margin-inline calc((100vw - min(1240px,100vw - 48px))/-2) with padding 4px 24px 24px and a ::before spacer rule. After: no negative margin; padding-inline max(24px, calc((100% - 1240px)/2)) plus scroll-padding-inline, and the spacer rule removed |
| Detected by | Manual usability check 1, Run A, Chrome 155.0.8059.85, 1440 x 900 (no automated case covers page layout) |
| Fix commit | `5cda194` (2026-10-23) Fix U1: home page product row no longer causes horizontal scroll |
| Verified in test run | `test-results-2026-10-24-09-29.md` (57 passed, 0 failed) |

## 5. Regression testing

After each fix both suites were re-run: `npm run test:report` (57 cases) and `npm test` (46 checks), plus the affected steps by hand.

| Fix | Module affected | Failing case before | Run that shows it passing | Other cases still passing | New defects |
|---|---|---|---|---|---|
| D1 | Registration | REG-06 | `test-results-2026-10-18-19-39.md` (57 passed, 0 failed) | 57 of 57 | None |
| P1 | Produce catalogue | CAT-04 | `test-results-2026-10-19-03-14.md` (57 passed, 0 failed) | 57 of 57 | None |
| P2 | Checkout and orders | CHK-01 | `test-results-2026-10-19-03-33.md` (57 passed, 0 failed) | 57 of 57 | None |
| U1 | Home page (front end layout) | Usability check 1 | `test-results-2026-10-24-09-29.md` (57 passed, 0 failed) | 57 of 57 | None |

## 6. Manual tests, usability and compatibility

**Complete these yourself, then re-run this script.**

| ID | Test | Result (write what you observed) | Evidence |
|---|---|---|---|
| MAN-01 | Lockout after repeated wrong logins (run `node tests/lockout-check.js`) | | MAN-01 |
| MAN-02 | Inline validation messages on the Register form | | |
| MAN-03 | Catalogue at 390 px and 1440 px | | U-A, U-B |
| MAN-04 | Cart to order to receipt and PDF in the browser | | MAN-04 |

### Usability and compatibility checklist (as completed in `04-usability-compatibility.md`)


**Page tested:** Produce catalogue, `/catalogue` (also check the cart page if time allows).
**Combinations tested (minimum: two screen sizes and/or two browsers):**

| Run | Browser and version | Screen size |
|---|---|---|
| A | Google Chrome 155.0.8059.85 (Windows 11) | 1440 x 900 |
| B | Google Chrome ______ | 390 x 844 (phone) |
| C | Microsoft Edge or Firefox ______ | 1440 x 900 |

**How to change screen size:** press F12, then Ctrl+Shift+M (device toolbar). Choose Responsive and type the width, or pick a phone such as iPhone 14. Find the browser version under Settings, About.

## Checklist (mark Pass, Fail or Issue for each run, and add a screenshot name)

| # | Check | How | Run A | Run B | Run C | Notes and screenshot |
|---|---|---|---|---|---|---|
| 1 | Layout does not scroll sideways | Scroll the page, look for a horizontal scrollbar | Fail on home page (U1); retest after fix: Pass | | | U1-01, U1-03 |
| 2 | Navigation works | Menu button on the phone, links on desktop; each link opens the right page | Pass | | | |
| 3 | Product cards reflow | 4 columns on desktop, 2 on phone, no overlapping text | Pass | | | |
| 4 | Text is readable | Body text at least about 14 px, good contrast on dark background | Pass | | | |
| 5 | Search and filters usable | Type "toma", pick a category chip, change Sort | Pass | | | |
| 6 | Empty state | Search "zzzz": a clear message and a way to clear filters | Pass | | | |
| 7 | Add to cart | Tap the + button on a card; cart count increases; confirmation shown | Pass | | | |
| 8 | Touch targets | Buttons are easy to hit with a thumb (about 40 px or larger) | Pass | | | |
| 9 | Images load | Product photos show; a missing photo falls back to an icon | Pass | | | |
| 10 | Forms (Register page) | Tab through fields; error messages show under the right field | Pass | | | |
| 11 | Keyboard use | Tab reaches every control with a visible focus outline | Pass | | | |
| 12 | Speed | The catalogue is usable within about 2 seconds after the page loads | Pass | | | |

## Issues observed
Record every layout, navigation or interaction problem. If there are none, say so and state what you looked for.

| ID | Page | Run | What was wrong | Expected | Severity | Screenshot |
|---|---|---|---|---|---|---|
| U1 | Home | A | Page scrolled sideways (the product row, class rail, was wider than the screen) | No horizontal scrollbar; page fits the screen width | Medium | U1-01, U1-03 |

Anything marked Fail or Issue goes into the defect register in `05-test-report-and-defects.md`.

## Usability heuristics applied (one line each, your observation)
* **Visibility of status:** does the user see that an item was added, an order was placed?
* **Error messages:** do they say what went wrong and how to fix it?
* **Consistency:** same button style and wording on every page?
* **Recovery:** can a filter be cleared; can a cart item be removed?

## 7. Evidence index

| Evidence | What it shows | In the evidence folder? |
|---|---|---|
| D1-01 | REG-06 failing in the first run | **missing** |
| D1-02 | curl output showing the 151-character email accepted | **missing** |
| D1-03 | psql output showing the 150-character stored email | **missing** |
| D1-04 | Debugger: 151, 150 and the clean function | **missing** |
| D1-05 | The edited code | **missing** |
| D1-06 | git diff of the fix | **missing** |
| D1-07 | curl output after the fix (HTTP 400) | **missing** |
| D1-08 | Regression run after the fix | **missing** |
| P1-01 | CAT-04 failing | **missing** |
| P1-02 | Debugger: order = p.price DESC | **missing** |
| P1-03 | git diff of the fix | **missing** |
| P1-04 | Regression run after the fix | **missing** |
| P2-01 | CHK-01 and CHK-16 failing | **missing** |
| P2-02 | Debugger: total = 80, expected 160 | **missing** |
| P2-03 | git diff of the fix | **missing** |
| P2-04 | Regression run after the fix | **missing** |
| U1-01 | Home page scrolling sideways (horizontal scrollbar) | **missing** |
| U1-02 | DevTools: the rail element past the viewport edge | **missing** |
| U1-03 | Home page after the fix, no horizontal scrollbar | **missing** |
| U1-04 | git diff of the CSS fix | **missing** |
| U-A | Chrome desktop, catalogue | **missing** |
| U-B | Chrome phone width, catalogue | **missing** |
| U-C | Second browser, catalogue | **missing** |
| MAN-01 | Lockout script output | **missing** |
| MAN-04 | Cart to receipt journey | **missing** |

Screenshots live in an `evidence/` folder. Check each one for secrets before you share it.

## 8. Task checklist

| Task | Where it is covered |
|---|---|
| 1 Testing types | `01-testing-types.md` |
| 2 Test plan | `02-test-plan.md` |
| 3 Functional cases, executed | Sections 2 and 5, `03-test-case-catalogue.md`, results files |
| 4 Security tests | Cases AUTH-01 to AUTH-03 and SEC-01 to SEC-13, MAN-01 |
| 5 Usability and compatibility | Section 6 |
| 6 Test report and defect list | Sections 2 and 3 |
| 7 Classify, trace and correct | Section 4 |
| 8 Debugging tools | Section 4 (tools and what the trace showed) |
| 9 Regression testing | Section 5 |
| 10 Debugging documentation | Section 4 |
