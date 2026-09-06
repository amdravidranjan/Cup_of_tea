# FMB sketch (Field Measurement Book) — upload template

**Issued by:** Survey & Settlement Department
**Why it is on the file:** The cadastral record of the plot's shape, dimensions and adjoining survey numbers
**One row per:** plot

Fill one row per plot. Column headings must match the names below; case, spacing and the listed alternate spellings are all accepted. Extra columns are kept but ignored.

| Column | Required | What goes in it | Example |
|---|---|---|---|
| **Survey Number** _(also accepted: Survey No, Survey No., S.No, Field Number)_ | Yes | The plot this sheet measures. | `112/2A` |
| **Village** _(also accepted: Revenue Village, Village Name)_ | Yes | Revenue village in which the plot lies. | `Kizhakku Sirumugai` |
| **Extent** _(also accepted: Area, Extent (Ha), Measured Area)_ | Yes | Measured area of the plot. A bare number is read as hectares. | `0.8400` |
| **Boundary Coordinates** _(also accepted: Boundary, Coordinates, Corner Points, Vertices)_ | Yes | The corners of the plot as longitude latitude pairs, separated by semicolons, walking the boundary in order. The first point need not be repeated at the end. | `76.9012 11.0341; 76.9021 11.0341; 76.9021 11.0332; 76.9012 11.0332` |
| **Land Classification** _(also accepted: Classification, Land Type, Tharam)_ | No | Nanjai, punjai, manavari or house site. One of: NANJAI, PUNJAI, MANAVARI, HOUSE_SITE. | `PUNJAI` |
| **Adjoining Survey Numbers** _(also accepted: Adjoining, Neighbours, Abutting Survey Numbers)_ | No | The plots this one touches, separated by semicolons. An FMB sheet identifies a plot by its neighbours as much as by its corners. | `112/1; 112/3; 113/1` |

## Accepted file formats

`.csv`, `.xlsx`, `.docx`, and `.pdf` **with a text layer**. A scanned image — a photograph of a document, or a PDF that is only a picture of a page — cannot be read, and is rejected with that reason rather than guessed at. Export the digital extract from e-Sevai, or fill in this template.

## How extents are read

A bare number is hectares. Any other unit must be named: `2.08 acres`, `37 cents`, `840 sqm`. The hectare-are-square metre form a chitta prints (`0-84-00`) is also read.

## Checks across the whole row

- `boundary-encloses-area`
- `extent-matches-boundary`
