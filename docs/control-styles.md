# Fonts and control styles across storefronts

Research captured September 8, 2026 on desktop homepages. Results are page/viewport samples, not a complete theme inventory.

## Angela Caglia

The `brandaccent` alias resolves to `aeonikfono-regular.woff2` (400) and `aeonikfono-medium.woff2` (500). CoType describes [Aeonik Fono](https://cotypefoundry.com/our-fonts/aeonik-fono) as proportionally spaced with a mono aesthetic; it should not be classified as a true monospace font from its appearance.

Observed uses include navigation labels, product badges, before/after labels, footer links, and button text. Common sizes were approximately 13px and 16px, weight 500. Buttons can inherit Aeonik on their outer element while a child span uses Fono. Capture text-node styling separately from the control box.

The theme declares a base button palette (`--c-button`, `--c-button-text`), secondary palette (`--c-secondary-button*`), outline palette (`--c-outline-button*`), and link color (`--c-link`). Background/text hover tokens are separate. Primary add-to-bag controls and outline links were observed; secondary definitions exist even when no secondary sample is rendered. Do not fabricate a tertiary tier.

Outline buttons draw rings with `::after` box shadows and use a transparent background. Their outer element may report `border: 0`. Focus styles use concentric box shadows; active rules scale controls to .97. Preserve declarations as source evidence rather than presenting them as tested interactive states.

## Comparison runs

| Store | Platform evidence | Useful distinction |
| --- | --- | --- |
| HiNote | Shopify theme, Horizon 3.4.0 | `BrandHeadFont`/`BrandBodyFont`/`BrandAccentFont` aliases; generated `button--<block-id>` classes are not semantic variants. |
| Allbirds | Shopify theme, allbirds-theme 1.231.12 | Geograph plus Akkurat Mono; `btn-primary`, `btn-secondary`, and `btn-outline-*` naming. |
| Grüns | Shopify theme, Gruns 1.0.0 | Work Sans and Retail Display; primary/secondary classes coexist with custom controls and app styles. |
| Gymshark | Partial Shopify signals only | CDN evidence alone is insufficient to assert platform or headless architecture. Generic upstream branding remains available. |

## General extraction model

- Preserve family aliases, font source files, and direct text usages independently of heading/body hierarchy. A computed stack does not prove which file rendered.
- Keep function (`button`, `link`, `addToCart`) separate from explicit variant (`primary`, `secondary`, `tertiary`, `outline`, `text`) and default appearance (`filled`, `outline`, `decorated`, `underlined`, `text`).
- Variant evidence is the actual matching class. Never derive a hierarchy from marketing copy or a generated block ID.
- Capture control box styles, descendant text styles, nearest solid ancestor background, and generated pseudo-element styles separately. The preview approximates empty absolute pseudo-element borders, shadows, and fills; complex artwork remains in the inspector.
- Keep declared button/link rules, source stylesheet, and enclosing conditions. These can expose unused variants and hover/focus/active/disabled declarations without claiming those states were exercised.
- Bound samples to 36 button styles, 18 links, 120 font usages, and 400 control rules. Results can omit later or inaccessible CSS; this is an observed kit, not a lossless site clone.

The preview marks variant availability as observed, declared only, or not found, and retains original data in JSON. No storefront interactions that submit forms or add products are performed.
