# shcheck (Package)

## Package Identity
Core implementation of the security header checking logic.

## Setup & Run
- Run directly: `python3 shcheck.py <url>`
- Install from root: `pip install .`

## Patterns & Conventions
- **Network**: Uses `urllib` (standard lib) exclusively. Avoid `requests` to keep deps zero.
- **CLI Args**: Uses `optparse` (legacy). **DO NOT** mix with `argparse`.
- **Colors**: Uses manual ANSI codes in `darkcolours` / `lightcolours` classes.
- **Output**:
  - `log()` function handles standard output (suppressed if JSON mode).
  - JSON output is constructed in a dictionary and dumped at the end.

## Key Files
- **Main Script**: `shcheck.py`
  - `sec_headers`: Dictionary of security headers to check.
  - `main()`: Orchestration logic.
  - `report()`: Printing the summary.

## Common Gotchas
- **Deprecated Headers**: Some headers are marked 'deprecated' in `sec_headers` (e.g., `X-XSS-Protection`).
- **SSL**: Uses custom context to allow disabling verification (`-d` flag).
- **User Agent**: Hardcoded in `client_headers` global variable.

## Development Tasks
- **Add new header**: Add to `sec_headers` dictionary.
- **Add CLI flag**: Add `parser.add_option` in `parse_options()`.
