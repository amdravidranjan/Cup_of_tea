# Bhavani River Bridge & Approach Road, Sirumugai — demo kit

Everything here is generated from `src/db/flagship-project.ts` by
`npx tsx scripts/build-flagship-kit.ts`. The FMB sheets, the chitta extract,
the valuations and the award all describe the same plots and the same
households, because they are all built from one source. Do not hand-edit
these files — change the source and regenerate.

## Where it is

Sirumugai is a real panchayat town in Mettupalayam taluk, Coimbatore
district, on the banks of the Bhavani River. The bridge is sited on that
crossing, square to the flow. The town's coordinates are as published; the
river centreline and plot boundaries are approximate, laid out to be
geographically coherent rather than digitised from a survey.

The revenue villages, survey numbers, titleholders and every rupee figure
are invented. This is not a real acquisition and describes no real person.

## What is in it

- **60 plots**, 16.0445 ha across 3 revenue villages
- **77 affected families** — 60 titleholders from the record of rights, plus 17 non-titleholders only the SIA census can find
- **12 displaced families** — those who lose a dwelling, not merely land

```
records/     land records the platform reads back on upload
documents/   DPR and SIA report, as PDFs with a real text layer
drawings/    alignment plan, bridge elevation, RoW cross section
templates/   the field guide for each record type
rejected-samples/  files the platform refuses, and why
```

## Order to upload

1. `records/fmb-sketch-*.csv` — one per village. Registers the plots with
   their boundaries. Do these first: a chitta names a survey number, and
   the titleholder can only be attached to a plot that already exists.
2. `records/patta-chitta-extract-mettupalayam.xlsx` — attaches the
   titleholder to each plot. Note the extents are quoted in three
   different units across the file, as a real extract would be.
3. `records/dgps-survey-report.pdf` — the s.12 re-survey, as a PDF with a
   text layer. Reads back the plots re-measured for the acquisition.
4. The supporting records: encumbrances, guideline value, asset valuation,
   legal heirs.
5. `records/patta-chitta-with-errors.csv` — upload this to see the error
   report. Seven rows, each failing for a different reason.

## The point of the rejected samples

The previous document reader derived every value from a hash of the
document id and never opened the file — a blank upload still produced an
owner, a survey number and a plot boundary. Upload anything from
`rejected-samples/` to confirm that is no longer the case.
