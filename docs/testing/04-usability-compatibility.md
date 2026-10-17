# Task 5: Usability and compatibility checks

**Page tested:** Produce catalogue, `/catalogue` (also check the cart page if time allows).
**Combinations tested (minimum: two screen sizes and/or two browsers):**

| Run | Browser and version | Screen size |
|---|---|---|
| A | Google Chrome ______ | 1440 x 900 |
| B | Google Chrome ______ | 390 x 844 (phone) |
| C | Microsoft Edge or Firefox ______ | 1440 x 900 |

**How to change screen size:** press F12, then Ctrl+Shift+M (device toolbar). Choose Responsive and type the width, or pick a phone such as iPhone 14. Find the browser version under Settings, About.

## Checklist (mark Pass, Fail or Issue for each run, and add a screenshot name)

| # | Check | How | Run A | Run B | Run C | Notes and screenshot |
|---|---|---|---|---|---|---|
| 1 | Layout does not scroll sideways | Scroll the page, look for a horizontal scrollbar | | | | |
| 2 | Navigation works | Menu button on the phone, links on desktop; each link opens the right page | | | | |
| 3 | Product cards reflow | 4 columns on desktop, 2 on phone, no overlapping text | | | | |
| 4 | Text is readable | Body text at least about 14 px, good contrast on dark background | | | | |
| 5 | Search and filters usable | Type "toma", pick a category chip, change Sort | | | | |
| 6 | Empty state | Search "zzzz": a clear message and a way to clear filters | | | | |
| 7 | Add to cart | Tap the + button on a card; cart count increases; confirmation shown | | | | |
| 8 | Touch targets | Buttons are easy to hit with a thumb (about 40 px or larger) | | | | |
| 9 | Images load | Product photos show; a missing photo falls back to an icon | | | | |
| 10 | Forms (Register page) | Tab through fields; error messages show under the right field | | | | |
| 11 | Keyboard use | Tab reaches every control with a visible focus outline | | | | |
| 12 | Speed | The catalogue is usable within about 2 seconds after the page loads | | | | |

## Issues observed
Record every layout, navigation or interaction problem. If there are none, say so and state what you looked for.

| ID | Page | Run | What was wrong | Expected | Severity | Screenshot |
|---|---|---|---|---|---|---|
| U1 | | | | | | |

Anything marked Fail or Issue goes into the defect register in `05-test-report-and-defects.md`.

## Usability heuristics applied (one line each, your observation)
* **Visibility of status:** does the user see that an item was added, an order was placed?
* **Error messages:** do they say what went wrong and how to fix it?
* **Consistency:** same button style and wording on every page?
* **Recovery:** can a filter be cleared; can a cart item be removed?
