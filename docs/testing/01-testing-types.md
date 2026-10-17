# Task 1: Testing types for registration, produce catalogue and checkout

CropDrop is a web application with a JSON API, a PostgreSQL database and a browser front end. The table shows which testing types apply to each module and what each one is for **in this application**.

| Testing type | Registration and login | Produce catalogue | Checkout and orders | Purpose for CropDrop |
|---|---|---|---|---|
| **Functional (positive)** | Valid buyer and farmer accounts are created; login succeeds | Search, filter, sort and product detail return the right items | A valid cart becomes an order with the right total and status | Confirms each requirement in the project scenario works as specified. |
| **Boundary value** | Password of 7 and 8 characters; email of 150 and 151 characters | Page size 1; offset past the end; price 0 and 0.01; quantity -1 and 0 | Quantity 0 and -1; ordering exactly the remaining stock and stock plus one | Defects cluster at the edges of allowed ranges. Limits are set in the schema and the validators. |
| **Negative** | Duplicate email, bad phone, malformed email, weak password | No-match search, unknown product id, hidden unapproved and out-of-stock items | Empty cart, unknown product, guest or farmer ordering | Confirms the system refuses wrong input with a clear message instead of failing or accepting it. |
| **Security** | SQL injection in email, password and name; hashed passwords; no account enumeration; CSRF token; session cookie flags; role checks; logout | Wildcard and SQL injection characters in search; fake image uploads; foreign image links | Price tampering; reading another buyer's order; role checks on order status | CropDrop handles accounts and orders, and the paper requires protection against SQL injection and weak authentication. |
| **Integration (API and database)** | Account row stored with a hash; farmer approval changes what can be listed | Approved farmer's listing appears in the public list only after approval | Order, order items and stock change together in one transaction; failed orders roll back | The modules depend on the database. A pass on each part alone does not prove they work together. |
| **Data integrity** | Unique email enforced regardless of letter case | Hidden items never leak into public results | Order totals equal the sum of their items; stock never goes negative | Money and stock must stay correct. |
| **Usability** | Inline error messages, clear next step after registering | Filters are easy to find and reset; empty state is helpful | Cart quantities, totals and the order confirmation are clear | Farmers and buyers may be on phones and not technical. |
| **Compatibility and responsive** | Forms usable at 390 px and 1440 px in two browsers | Product grid reflows without sideways scrolling | Cart layout works on a phone | The non-functional requirement is a site that works on desktop and mobile. |
| **Regression** | Re-run after any fix | Re-run after any fix | Re-run after any fix | Confirms a fix did not break something that worked. |
| **Acceptance (end to end)** | Register, log in | Find a product | Place an order and open the receipt | Confirms a real user can finish the main journey on the deployed site. |

## How they are carried out
* **Automated:** the runner `npm run test:report` executes the functional, boundary, negative, security, integration and data-integrity cases (see `03-test-case-catalogue.md`).
* **Manual:** usability, compatibility and the browser journey are done in the browser and recorded in `04-usability-compatibility.md`.
* **Regression:** `npm test` and `npm run test:report` are re-run after every fix (`06-debugging-regression-documentation.md`).
