# Part 1 history data

Snapshots of public data used by Part 1 (Foundation & Philosophy) and recomputed by `tests/part1-history.test.mjs` through `scripts/part1-history.mjs`. The files are not edited by hand: when a source revises its data, replace the file and record the new retrieval date here.

| File | Source | Retrieved |
|---|---|---|
| `damodaran-annual-returns.csv` | Aswath Damodaran (NYU Stern), *Historical Returns on Stocks, Bonds and Bills* (updated January 5, 2026): S&P 500 including dividends, and the US Treasury bond (10-year), annual, 1928 to 2025 | 2026-10-01 |
| `cpi-u-nsa-december.csv` | US Bureau of Labor Statistics, CPI for All Urban Consumers, not seasonally adjusted (FRED series CPIAUCNS), December values | 2026-10-01 |
| `cpi-u-nsa-monthly-2025-2026.csv` | The same series, January to August of 2025 and 2026 (October 2025 was not published) | 2026-10-01 |
| `fedfunds-monthly.csv` | Federal Reserve, effective federal funds rate, monthly average (FRED series FEDFUNDS) | 2026-10-01 |
| `core-pce-index-monthly.csv` | Bureau of Economic Analysis, PCE price index excluding food and energy (FRED series PCEPILFE) | 2026-10-01 |
| `federal-debt-and-interest.csv` | Office of Management and Budget via FRED: federal debt held by the public as percent of GDP (FYPUGDA188S, 1939 to 2025) and federal interest outlays as percent of GDP (FYOIGDA188S, 1980 to 2025). FRED divides fiscal-year figures by calendar-year GDP. | 2026-09-30 and 2026-10-01 |
| `shiller-ie-data-monthly.csv` | Robert J. Shiller, *ie_data.xls* (shillerdata.com): monthly S&P Composite price (average of daily closes), dividend (annual rate) and 10-year Treasury yield, January 1960 to June 2026, the last month with a reported dividend; later months are left out, never estimated. Upstream is Shiller; the retrieval path is the public feed github.com/adambnash-afk/shiller-data, which downloads the current workbook and validates the parse. Written by `scripts/import-shiller-mirror.mjs`; the feed commit, the SHA-256 of the file read and the cutoff are in `shiller-ie-data-monthly.source.json`. Checked against an earlier copy of the workbook: identical on all 776 shared months. | 2026-10-02 |
| `gs10-monthly.csv` | Federal Reserve H.15 via FRED, 10-year Treasury constant-maturity yield, monthly average (series GS10), January 2020 to September 2026. Extends Shiller's yield column, which is the same series. | 2026-10-02 |

The S&P 500 figures are Damodaran's published annual returns, used here for computation only; the index itself is licensed by S&P Dow Jones Indices.

Shiller's series is used for computation only, as Damodaran's is; the S&P Composite is licensed by S&P Dow Jones Indices. `scripts/stock-bond-correlation.mjs` states the method and its approximations: monthly averages rather than month-end values on both sides, and a constant-maturity par bond rather than a traded bond.
