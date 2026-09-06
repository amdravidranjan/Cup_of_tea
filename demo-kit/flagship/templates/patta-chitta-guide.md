# Patta / Chitta / Adangal extract — upload template

**Issued by:** Revenue Department (taluk office)
**Why it is on the file:** Record of Rights — identifies who holds the land and how much of it
**One row per:** titleholder

Fill one row per titleholder. Column headings must match the names below; case, spacing and the listed alternate spellings are all accepted. Extra columns are kept but ignored.

| Column | Required | What goes in it | Example |
|---|---|---|---|
| **Patta Number** _(also accepted: Patta No, Patta No., PattaNo)_ | Yes | The patta under which the land is held. | `1247` |
| **Survey Number** _(also accepted: Survey No, Survey No., S.No, SurveyNo, Field Number)_ | Yes | The plot this patta covers. This is what links the titleholder to the boundary on the FMB sheet. | `112/2A` |
| **Holder Name** _(also accepted: Name, Owner Name, Pattadar, Pattadar Name, Holder)_ | Yes | Name of the person holding the patta, as printed. | `R. Murugan` |
| **Village** _(also accepted: Revenue Village, Village Name)_ | Yes | Revenue village in which the plot lies. | `Kizhakku Sirumugai` |
| **Extent** _(also accepted: Area, Extent (Ha), Extent Ha, Area (Ha), Acreage)_ | Yes | The area held. A bare number is read as hectares; anything else must name its unit. | `0.8400` |
| **Land Classification** _(also accepted: Classification, Land Type, Tharam)_ | No | Nanjai (wet), punjai (dry), manavari (rain-fed) or house site. Drives guideline value, so it is not cosmetic. One of: NANJAI, PUNJAI, MANAVARI, HOUSE_SITE. | `NANJAI` |
| **Category** _(also accepted: Social Category, Community)_ | No | Social category of the household, for Schedule II entitlements. One of: landowner, livelihood-loser, tenant. | `landowner` |
| **Household Size** _(also accepted: Members, Family Members, No of Members)_ | No | Number of people in the household. | `5` |
| **Entitlement Basis** _(also accepted: Basis, s.3(c) Basis)_ | No | Which limb of s.3(c) makes this household an affected family. A patta names a titleholder, so this defaults to S3C_I_LANDOWNER. One of: S3C_I_LANDOWNER, S3C_II_LIVELIHOOD, S3C_III_FOREST_RIGHTS, S3C_IV_FOREST_WATER_DEPENDENT, S3C_V_ASSIGNED_LAND, S3C_VI_URBAN_RESIDENT. | `S3C_I_LANDOWNER` |
| **Aadhaar** _(also accepted: Aadhaar Number, UID, Aadhar)_ | No | Masked before storage — the full number is never written to the database. A full number here is checksum-verified, then masked. | `XXXX-XXXX-4417` |
| **Ration Card** _(also accepted: Ration Card Number, RC Number)_ | No | Ration card number, used to corroborate household size. | `TN0412876` |
| **Mobile** _(also accepted: Phone, Mobile Number, Contact)_ | No | Mobile number for statutory notices. | `9445012345` |

## Accepted file formats

`.csv`, `.xlsx`, `.docx`, and `.pdf` **with a text layer**. A scanned image — a photograph of a document, or a PDF that is only a picture of a page — cannot be read, and is rejected with that reason rather than guessed at. Export the digital extract from e-Sevai, or fill in this template.

## How extents are read

A bare number is hectares. Any other unit must be named: `2.08 acres`, `37 cents`, `840 sqm`. The hectare-are-square metre form a chitta prints (`0-84-00`) is also read.
