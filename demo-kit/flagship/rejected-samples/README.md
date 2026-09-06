# Files the platform refuses, and why

Rejection is the feature. The previous document reader derived every value
from a hash of the document id and never opened the file, so it would
cheerfully "extract" a titleholder from any of these. It no longer does.

| File | What happens |
|---|---|
| `patta-extract.txt` | Refused: plain text is not a format a revenue office issues. |
| `scanned-patta.png` | Refused: an image carries no machine-readable text. The message names the remedy — export the digital extract, or use the template. |
| `../records/patta-chitta-with-errors.csv` | Read, but seven rows fail. Each gets a row number, the column, the value found, why it was refused, and what was expected. Download the error report to see all of them at once. |

There is no OCR. That is deliberate: rule-based extraction over noisy OCR
output would be strict in name only.
