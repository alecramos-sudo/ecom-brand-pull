# Exploration — 2026-09-08

Started from suraj-xd/brandpull main, package 0.1.4. Ran the published CLI exactly as documented for automation, with raw candidates added:

```bash
npx --yes brandpull https://angelacaglia.com --no-preview --raw -o /tmp/ecom-brand-pull-research/angela-upstream.json
npx --yes brandpull https://gruns.co --no-preview --raw -o /tmp/ecom-brand-pull-research/gruns-upstream.json
```

Both returned branding JSON with no extraction errors. Upstream has a Chromium DOM collector, deterministic processor, optional LLM cleanup and local HTML preview. No Shopify-specific extraction existed. The fork retains this pipeline and adds a separate optional Shopify scan, so its failure cannot erase base branding.

## Baseline findings

- Angela: correct primary SVG logo; fonts appeared as brandbody/brandheading/brandaccent. Palette included payment/app/footer colors; primary component was a newsletter signup button and secondary was announcement markup.
- Grüns: inline SVG logo, Work Sans and Retail Display, green/yellow CTA styles. Some app typography also appeared.
- Original ranking remains unchanged. New theme tokens and ecommerce samples provide direct evidence alongside the heuristic fields.

## Fork live results

| Store | Exposed schema/version | Architecture | Root tokens | Declared color rules | UI samples | CDN logo candidates |
|---|---|---|---:|---:|---:|---:|
| Angela Caglia | Willa 12.0.1 | theme | 96 | 8 | 9 | 2 |
| Grüns | Gruns 1.0.0 | theme | 172 | 3 | 9 | 2 |

Counts reflect one homepage capture and can change with storefront releases, app injection and viewport. A color rule count is not a count of unique merchant schemes.

Angela exposes merchant theme name **Willa LIVE**, schema **Willa 12.0.1**, ID **158209868034**. Its primary/stacked logo SVG URLs have width removed and the original version retained. Font-face sources resolve brandbody/brandheading to aeonik font files and brandaccent to aeonikfono.

Grüns exposes merchant theme name **Live Theme (May 18 2026)**, schema **Gruns 1.0.0**, ID **136914403394**. Both captures include theme metadata and Shopify section wrappers: neither is inferred headless just because it looks custom. Grüns’ primary inline SVG stays in the base logo field; separate CDN logo candidates include a yellow SVG variant and a related-brand footer logo. Candidates are evidence, not asserted brand ownership.

Font-face collection includes declared app and experimentation fonts; it does not assert every declared font is used. Cross-origin stylesheets that CSSOM cannot access are reported. UI kit samples are current visible DOM styles, not a full downloadable theme or interactive component implementation.

## Theme references

Read the owner’s Evil Dawn reference privately to identify token naming conventions; no private source or configuration is included in this public fork. Supporting arbitrary CSS variable names does not establish theme lineage. Public Horizon main inspected at commit 8b42ace57642e45a3a59841d2ae06d386c929e72 uses root palettes and double-hyphen font tokens.

- [Horizon palette](https://github.com/Shopify/horizon/blob/8b42ace57642e45a3a59841d2ae06d386c929e72/snippets/color-palette.liquid)
- [Horizon typography and UI variables](https://github.com/Shopify/horizon/blob/8b42ace57642e45a3a59841d2ae06d386c929e72/snippets/theme-styles-variables.liquid)
- [Shopify image URL transforms and size limits](https://shopify.dev/docs/api/liquid/filters/image_url)

## Verification

Build, TypeScript and Biome checks; browser fixtures for theme metadata, scheme IDs, font faces, visible components, Horizon palette, CDN-only uncertainty and Hydrogen; image tests for modern crops, legacy filenames, vectors, version preservation and unrelated URL rejection. Live CLI captures of both stores and desktop/mobile preview checks supplement these fixtures.
