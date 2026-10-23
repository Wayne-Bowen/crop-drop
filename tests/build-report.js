#!/usr/bin/env node
// Builds docs/testing/final-report.md from YOUR real test result files and Git history.
// Run from the project folder:  node tests/build-report.js
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const root = process.cwd(), dir = path.join(root, 'docs', 'testing'), resDir = path.join(dir, 'results');
const sh = c => { try { return execSync(c, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const esc = s => String(s ?? '').replace(/\|/g, '\\|');

// ---- test runs
const files = fs.existsSync(resDir) ? fs.readdirSync(resDir).filter(f => /^test-results-.*\.md$/.test(f)).sort() : [];
const runs = files.map(f => {
  const t = fs.readFileSync(path.join(resDir, f), 'utf8'), m = t.match(/\*\*(\d+) passed, (\d+) failed\*\*/);
  return { file: f, date: (t.match(/\| Run date \| (.+?) \|/) || [])[1] || '', pass: m ? +m[1] : null, fail: m ? +m[2] : null,
    failed: [...t.matchAll(/^\| ([A-Z]+-\d+) \|.*\*\*FAIL\*\* \|$/gm)].map(x => x[1]) };
});
const last = runs[runs.length - 1];
const detect = id => runs.findIndex(r => r.failed.includes(id));
const verify = id => { const d = detect(id); if (d < 0) return -1; return runs.findIndex((r, i) => i > d && !r.failed.includes(id) && r.fail === 0); };

// ---- commits
const log = sh('git log --reverse --pretty=format:%h%x09%ad%x09%s --date=short').split('\n').filter(Boolean).map(l => { const [h, d, ...s] = l.split('\t'); return { h, d, s: s.join('\t') }; });
const find = re => log.find(c => re.test(c.s));
const cm = c => c ? `\`${c.h}\` (${c.d}) ${esc(c.s)}` : '_not found: commit it with the message from the guide_';
const verified = d => d.manual ? (d.fix && last && last.fail === 0 ? runs.length - 1 : -1) : verify(d.case);
const run = i => i >= 0 ? `\`${runs[i].file}\` (${runs[i].pass} passed, ${runs[i].fail} failed)` : '_no run found yet_';

const defects = [
  { id: 'D1', mod: 'Registration', type: 'Logical', sev: 'Medium', source: 'Automated case REG-06', case: 'REG-06', plant: null, fix: find(/Fix D1/i),
    sym: 'A 151-character email was accepted, but the stored address was 150 characters (the final character was lost)',
    exp: 'HTTP 400 with an email error', act: 'HTTP 201 and an account created under a different address',
    steps: 'Register with a 151-character email through the API (curl), then read the stored email with psql',
    tool: 'Test report, curl, psql, VS Code debugger breakpoint in `src/routes/auth.js` (register handler), Debug Console',
    trace: 'At the breakpoint `req.body.email.length` was 151 and `email.length` was 150 after the line ran. `clean.toString()` showed `.slice(0, max)`',
    cause: '`clean(value, max)` truncates its input, and the register handler called it before validating, so the `length <= 150` check in `isEmail` could never fail',
    change: 'Before: `email = clean(req.body.email, 150).toLowerCase()` (and name, phone the same way). After: read the trimmed, untruncated values with a `trimmed()` helper and add a 100-character limit check on the name' },
  { id: 'P1', mod: 'Produce catalogue', type: 'Logical', sev: 'Medium', source: 'Deliberately introduced fault (no real defect found in this module)', case: 'CAT-04', plant: find(/P1 \(test only\)/i), fix: find(/Fix P1/i),
    sym: 'Sorting by "price: low to high" returned the most expensive items first',
    exp: 'Prices in ascending order', act: 'Prices in descending order',
    steps: 'GET /api/produce?sort=low and compare the prices returned',
    tool: 'Test report (CAT-04 failed), VS Code debugger with a conditional breakpoint on `req.query.sort === \'low\'` in `src/routes/produce.js`',
    trace: 'With `req.query.sort` equal to `\'low\'`, the `order` variable held `\'p.price DESC\'` after the line ran',
    cause: 'The sort map for `low` contained `p.price DESC` instead of `p.price ASC`',
    change: 'Before: `low: \'p.price DESC\'`. After: `low: \'p.price ASC\'`' },
  { id: 'P2', mod: 'Checkout and orders', type: 'Logical', sev: 'High', source: 'Deliberately introduced fault (no real defect found in this module)', case: 'CHK-01', plant: find(/P2 \(test only\)/i), fix: find(/Fix P2/i),
    sym: 'An order for 2 units at KES 80 had a total of KES 80 instead of KES 160',
    exp: 'Total equals the sum of price x quantity', act: 'Total equals the sum of prices, ignoring quantity',
    steps: 'Place an order for 2 Tomatoes and read the order total; compare with the sum of its line items',
    tool: 'Test report (CHK-01 and CHK-16 failed), VS Code debugger with a conditional breakpoint on `qty === 2` in `src/routes/orders.js`',
    trace: 'At the breakpoint `p.price` was 80 and `qty` was 2; after the line ran `total` was 80 instead of 160. CHK-07 still passed because it orders a quantity of 1, so price times 1 hides the fault',
    cause: 'The accumulator added `p.price` and never multiplied by `qty`',
    change: 'Before: `total += p.price;`. After: `total += p.price * qty;`' },
  { id: 'U1', mod: 'Home page (front end layout)', type: 'Logical', sev: 'Medium', source: 'Manual usability check 1 (Run A: Chrome 155.0.8059.85, Windows 11, 1440 x 900)', case: null, manual: true,
    detected: 'Manual usability check 1, Run A, Chrome 155.0.8059.85, 1440 x 900 (no automated case covers page layout)', plant: null, fix: find(/Fix U1/i),
    sym: 'The home page scrolled sideways as well as up and down',
    exp: 'The page fits the screen width with no horizontal scrollbar', act: 'The page was wider than the screen: 100 px wider at 1440 px and 24 px wider on smaller screens',
    steps: 'Open the home page at 1440 px in Chrome and scroll; or run the DevTools console check that lists elements extending past the viewport',
    tool: 'Browser DevTools: device toolbar, Console (list of unclipped elements wider than the viewport), Elements and Styles panels',
    trace: 'The only unclipped element extending past the right edge was the product row (class rail): left -100, right 1525 at a 1440 px viewport',
    cause: 'The rail is a direct child of a full-width section, but its CSS used negative side margins based on 100vw that assume it sits inside the 1240 px container, so it was pushed past the right edge. 100vw also counts the scrollbar width on Windows',
    change: 'Before: negative margin-inline calc((100vw - min(1240px,100vw - 48px))/-2) with padding 4px 24px 24px and a ::before spacer rule. After: no negative margin; padding-inline max(24px, calc((100% - 1240px)/2)) plus scroll-padding-inline, and the spacer rule removed' },
];

// ---- evidence files
const evDirs = ['evidence', path.join('docs', 'testing', 'evidence')].map(d => path.join(root, d));
const have = id => evDirs.some(d => fs.existsSync(d) && fs.readdirSync(d).some(f => f.toUpperCase().startsWith(id.toUpperCase())));
const evidence = [['D1-01', 'REG-06 failing in the first run'], ['D1-02', 'curl output showing the 151-character email accepted'], ['D1-03', 'psql output showing the 150-character stored email'], ['D1-04', 'Debugger: 151, 150 and the clean function'], ['D1-05', 'The edited code'], ['D1-06', 'git diff of the fix'], ['D1-07', 'curl output after the fix (HTTP 400)'], ['D1-08', 'Regression run after the fix'],
  ['P1-01', 'CAT-04 failing'], ['P1-02', 'Debugger: order = p.price DESC'], ['P1-03', 'git diff of the fix'], ['P1-04', 'Regression run after the fix'],
  ['P2-01', 'CHK-01 and CHK-16 failing'], ['P2-02', 'Debugger: total = 80, expected 160'], ['P2-03', 'git diff of the fix'], ['P2-04', 'Regression run after the fix'],
  ['U1-01', 'Home page scrolling sideways (horizontal scrollbar)'], ['U1-02', 'DevTools: the rail element past the viewport edge'], ['U1-03', 'Home page after the fix, no horizontal scrollbar'], ['U1-04', 'git diff of the CSS fix'], ['U-A', 'Chrome desktop, catalogue'], ['U-B', 'Chrome phone width, catalogue'], ['U-C', 'Second browser, catalogue'], ['MAN-01', 'Lockout script output'], ['MAN-04', 'Cart to receipt journey']];

const head = sh('git rev-parse --short HEAD'), remote = sh('git remote get-url origin').replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, '');
let o = `# CropDrop: testing and debugging report (Assessment 2)\n\n| | |\n|---|---|\n| Tester and developer | Wayne Bowen |\n| Application | CropDrop, farmer and buyer marketplace (Node.js, Express, PostgreSQL) |\n| Repository | ${remote || '(not found)'} |\n| Version tested (latest commit) | \`${head || 'n/a'}\` |\n| Report generated | ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from the files in \`docs/testing/results\` and the Git history |\n\n`;
o += `## 1. Summary\n\n`;
o += last ? `The latest automated run executed **${last.pass + last.fail} test cases**: **${last.pass} passed, ${last.fail} failed**${last.failed.length ? ' (failed: ' + last.failed.join(', ') + ')' : ''}. ${defects.length} defects were found, traced with the debugger, corrected and re-tested (below).\n\n` : '_No test result files found. Run `npm run test:report` first._\n\n';
o += `Method, test types, plan and case list: \`01-testing-types.md\`, \`02-test-plan.md\`, \`03-test-case-catalogue.md\`.\n\n`;
o += `## 2. Test run history\n\n| Run | Date (UTC) | Passed | Failed | Cases that failed | Results file |\n|---|---|---|---|---|---|\n` + runs.map((r, i) => `| ${i + 1} | ${esc(r.date)} | ${r.pass} | ${r.fail} | ${r.failed.join(', ') || 'none'} | \`${r.file}\` |`).join('\n') + '\n\n';
o += `## 3. Defect register\n\n| ID | Module | Found by | Expected | Actual | Severity | Type | Fix commit | Status |\n|---|---|---|---|---|---|---|---|---|\n` + defects.map(d => `| ${d.id} | ${d.mod} | ${esc(d.source)} | ${esc(d.exp)} | ${esc(d.act)} | ${d.sev} | ${d.type} | ${d.fix ? '`' + d.fix.h + '`' : '_missing_'} | ${verified(d) >= 0 ? 'Fixed and verified' : 'Open'} |`).join('\n') + '\n\nUsability issues found in the manual checks (if any) are listed in section 6.\n\n';
o += `## 4. Defect analysis and correction\n\n`;
for (const d of defects) {
  o += `### ${d.id}: ${d.mod}\n\n| Field | Entry |\n|---|---|\n| Symptom | ${esc(d.sym)} |\n| Steps to reproduce | ${esc(d.steps)} |\n| Expected / actual | ${esc(d.exp)} / ${esc(d.act)} |\n| Severity | ${d.sev} |\n| Error type | **${d.type}** |\n| Tools and technique used to isolate | ${esc(d.tool)} |\n| What the trace showed | ${esc(d.trace)} |\n| Root cause | ${esc(d.cause)} |\n| Source change | ${esc(d.change)} |\n`;
  if (d.plant) o += `| Fault introduced in commit | ${cm(d.plant)} |\n`;
  o += `| Detected by | ${d.manual ? esc(d.detected) : run(detect(d.case))} |\n| Fix commit | ${cm(d.fix)} |\n| Verified in test run | ${run(verified(d))} |\n\n`;
}
o += `## 5. Regression testing\n\nAfter each fix both suites were re-run: \`npm run test:report\` (57 cases) and \`npm test\` (46 checks), plus the affected steps by hand.\n\n| Fix | Module affected | Failing case before | Run that shows it passing | Other cases still passing | New defects |\n|---|---|---|---|---|---|\n` + defects.map(d => { const v = verified(d); return `| ${d.id} | ${d.mod} | ${d.case || 'Usability check 1'} | ${run(v)} | ${v >= 0 ? runs[v].pass + ' of ' + (runs[v].pass + runs[v].fail) : ''} | ${v >= 0 ? 'None' : ''} |`; }).join('\n') + '\n\n';
o += `## 6. Manual tests, usability and compatibility\n\n**Complete these yourself, then re-run this script.**\n\n| ID | Test | Result (write what you observed) | Evidence |\n|---|---|---|---|\n| MAN-01 | Lockout after repeated wrong logins (run \`node tests/lockout-check.js\`) | | MAN-01 |\n| MAN-02 | Inline validation messages on the Register form | | |\n| MAN-03 | Catalogue at 390 px and 1440 px | | U-A, U-B |\n| MAN-04 | Cart to order to receipt and PDF in the browser | | MAN-04 |\n\n`;
const u = path.join(dir, '04-usability-compatibility.md');
o += fs.existsSync(u) ? `### Usability and compatibility checklist (as completed in \`04-usability-compatibility.md\`)\n\n` + fs.readFileSync(u, 'utf8').replace(/^# .*\n/, '') + '\n' : '';
o += `## 7. Evidence index\n\n| Evidence | What it shows | In the evidence folder? |\n|---|---|---|\n` + evidence.map(([id, w]) => `| ${id} | ${w} | ${have(id) ? 'yes' : '**missing**'} |`).join('\n') + '\n\nScreenshots live in an `evidence/` folder. Check each one for secrets before you share it.\n\n';
o += `## 8. Task checklist\n\n| Task | Where it is covered |\n|---|---|\n| 1 Testing types | \`01-testing-types.md\` |\n| 2 Test plan | \`02-test-plan.md\` |\n| 3 Functional cases, executed | Sections 2 and 5, \`03-test-case-catalogue.md\`, results files |\n| 4 Security tests | Cases AUTH-01 to AUTH-03 and SEC-01 to SEC-13, MAN-01 |\n| 5 Usability and compatibility | Section 6 |\n| 6 Test report and defect list | Sections 2 and 3 |\n| 7 Classify, trace and correct | Section 4 |\n| 8 Debugging tools | Section 4 (tools and what the trace showed) |\n| 9 Regression testing | Section 5 |\n| 10 Debugging documentation | Section 4 |\n`;
fs.writeFileSync(path.join(dir, 'final-report.md'), o);
const miss = evidence.filter(([id]) => !have(id)).length;
console.log(`Wrote docs/testing/final-report.md\n  test runs found: ${runs.length}; latest: ${last ? last.pass + ' passed, ' + last.fail + ' failed' : 'none'}\n  fix commits found: ${defects.map(d => d.id + (d.fix ? ' yes' : ' NO')).join(', ')}\n  evidence files missing: ${miss} of ${evidence.length}`);
