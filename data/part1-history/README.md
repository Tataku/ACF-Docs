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

The S&P 500 figures are Damodaran's published annual returns, used here for computation only; the index itself is licensed by S&P Dow Jones Indices.
