# Brand kit display

The display organizes extraction results while retaining the generic collector, processor and JSON fields.

| Before | After | Why |
|---|---|---|
| Theme metadata led the page | Logos lead; platform fits on one line | Inspect the brand before technical evidence |
| Scheme variables were collapsed lists | Separate named scheme cards with background/text/button samples; root palette separate | See each scheme without mixing palettes |
| Aliases and font declarations | Loaded heading/body/control specimens, filename-derived alias labels and grouped font weights | Inspect the hierarchy and download its sources |
| All declared fonts were equal | Hierarchy fonts first; other declarations collapsed | Keep apps and unused declarations out of the primary view |
| Generic components lost their surface | Curated roles preserve captured ancestor backgrounds; extras collapsed | Keep white and transparent controls visible |
| Separate preview servers | Saved-result selector; downloads follow selection | Compare without losing track of the store |
| JSON/debug tabs and scattered actions | Sticky section links; header JSON/token exports; consolidated inspectors | Navigate and export from one page |

## Verification

- Desktop 1440px and mobile 390px: zero horizontal page overflow in the verified desktop/mobile captures; no browser page errors.
- Fonts: available font faces load into the preview. Visible family references do not prove original glyph rendering; unavailable sources fall back.
- Store switcher selects the corresponding JSON; server tests cover selected image downloads and invalid profile IDs.
- Browser tests confirm light/dark scheme isolation and a complete CSS block from the HTTP clipboard fallback.
- Automated tests cover extraction and preview behavior; Biome, TypeScript and build pass. Independent code review found the missing CSS closing brace, fixed with a browser regression test.
- Visual fixes: captured zero/near-zero line heights get a readable specimen value with a note; raw values remain unchanged. White controls retain their surrounding background. No layout shifts from animation were introduced (viewer has no motion).

Generated capture artifacts are excluded from source control. Source image colors are unchanged, so white logos disappear on the light half of their paired comparison by design. Unexposed theme settings and absent hierarchy levels are not invented. Stores without named schemes display a root palette.
