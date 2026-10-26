# Testing and debugging (CropDrop)

| Task | Document |
|---|---|
| 1. Testing types for registration, catalogue and checkout | `01-testing-types.md` |
| 2. Test plan | `02-test-plan.md` |
| 3. Functional test cases, executed (positive plus boundary or negative for each module) | `03-test-case-catalogue.md` and the results file from `npm run test:report` |
| 4. Security tests on login and registration | Cases SEC-01 to SEC-13, AUTH-01 to AUTH-03, SQL injection cases, plus manual MAN-01 |
| 5. Usability and compatibility checks | `04-usability-compatibility.md` |
| 6. Test report and defect list | `05-test-report-and-defects.md` |
| 7. Classify, trace and correct defects or faults | `06-debugging-regression-documentation.md` |
| 8. Debugging tools and techniques | same file, Task 8 |
| 9. Regression testing | same file, Task 9 |
| 10. Debugging documentation | same file, Task 10 |

## Quick start
```bash
sudo service postgresql start
cd ~/cropdrop
npm pkg set scripts.test:report="node tests/report.js"      # once
DATABASE_URL=postgres://cropdrop:cropdrop@localhost:5432/cropdrop_test npm run test:report
```
The run creates `results/test-results-<date>.md` and `.csv`. It wipes the `cropdrop_test` database only and refuses to run against any other.

**Expect one failure: REG-06.** That is a real defect (see D1 in `05-test-report-and-defects.md`). Reproduce it, trace it, fix it, and re-run.

## Your own work, your own evidence
The tables here contain what to do and examples of how to record it. The results, screenshots, observations and fixes must come from you running the tests. A marker can ask you to repeat any step, so make sure you can explain each one.

Evidence checklist (keep in an `evidence/` folder, no secrets in screenshots):
* Terminal output of the full test run, and the results file
* Failing case, curl output, database output and debugger screenshot for each defect
* DevTools screenshots for each usability and compatibility run (two sizes and/or two browsers)
* The final passing run after fixes
* `git log --oneline` showing your commits
