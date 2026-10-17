# Task 6: Test report and defect register

## 1. Test execution summary
Copy the figures from your own run (`results/test-results-<date>.md`). Re-run after each fix and keep every results file.

| Item | Value |
|---|---|
| Run date and time | |
| Environment | Node ____, PostgreSQL ____, Windows with WSL |
| Automated cases run | 57 |
| Passed | |
| Failed | |
| Manual cases run (MAN-01 to MAN-04, usability checks) | |
| Browsers and sizes used | |

| Module | Cases | Passed | Failed |
|---|---|---|---|
| Registration | | | |
| Login and security | | | |
| Produce catalogue | | | |
| Checkout and orders | | | |

## 2. Severity scale

| Severity | Meaning | Example |
|---|---|---|
| Critical | Data loss, security breach, or the system cannot be used | Anyone can read another buyer's order |
| High | A main feature gives wrong results or fails | Order total is wrong |
| Medium | A feature works but with wrong or surprising behaviour | Overlong input is silently changed instead of refused |
| Low | Cosmetic or minor wording | Label misaligned on a phone |

## 3. Defect register

Log every failed case, every usability issue, and every fault you deliberately introduce in a module where no real defect was found.

| ID | Module | Source | Expected result | Actual result | Steps to reproduce | Severity | Evidence | Status |
|---|---|---|---|---|---|---|---|---|
| D1 | Registration | Automated case REG-06 | An email longer than 150 characters is refused with HTTP 400 and an email error | HTTP 201. The 151-character email was cut to 150 characters and an account was created under a different address | See "D1 reproduction" below | Medium | `D1-01` results row, `D1-02` curl output, `D1-03` database query | Open |
| P1 | Produce catalogue | Deliberately introduced fault (no real defect found in this module) | | | | | | |
| P2 | Checkout and orders | Deliberately introduced fault (no real defect found in this module) | | | | | | |
| U1 | | Usability check (from `04-usability-compatibility.md`) | | | | | | |

Rows P1 and P2 are yours to fill in after you plant and trace a fault in each module. The method and ideas are in `06-debugging-regression-documentation.md`. Remove a row if you find a real defect in that module instead.

### D1 reproduction (run this yourself and keep the output)

Start the app (`npm run dev`) in one terminal, then in a second terminal:

```bash
# 1. get a CSRF token and cookie
TOKEN=$(curl -s -c jar http://localhost:3000/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
# 2. register with a 151-character email
EMAIL=$(python3 -c "print('a'*139+'@example.com')")
curl -s -b jar -X POST http://localhost:3000/api/auth/register \
  -H "content-type: application/json" -H "x-csrf-token: $TOKEN" \
  -d "{\"full_name\":\"Long Email\",\"email\":\"$EMAIL\",\"phone\":\"0712345678\",\"role\":\"buyer\",\"password\":\"Passw0rdX\"}"
# 3. look at what was stored
psql postgres://cropdrop:cropdrop@localhost:5432/cropdrop -c "SELECT length(email) AS len, right(email,12) AS ends FROM users ORDER BY id DESC LIMIT 1;"
```

**Expected:** step 2 prints an error (HTTP 400) and step 3 shows no new row.
**Actual (defect):** step 2 prints `{"ok":true,...}`, and step 3 shows `len = 150` and `ends = a@example.co`. The final `m` was cut off.

## 4. Evidence index

| Evidence ID | What it shows | File |
|---|---|---|
| D1-01 | Test report row for REG-06 marked FAIL | `evidence/D1-01-reg06-fail.png` |
| D1-02 | curl output showing HTTP 201 | `evidence/D1-02-curl.png` |
| D1-03 | psql output showing the truncated email | `evidence/D1-03-db.png` |
| | | |

Keep screenshots in an `evidence/` folder. Do not capture secrets (connection strings, passwords) in screenshots.
