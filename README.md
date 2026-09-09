# Ecom Brand Pull

A focused public fork of [suraj-xd/brandpull](https://github.com/suraj-xd/brandpull) for Shopify storefronts. Keeps Brandpull’s Chromium extraction, branding JSON, optional LLM pass, and local visual preview; adds a `shopify` field and Shopify preview sections. Original MIT license and attribution are retained.

All example domains and store identities below are placeholders. Substitute a storefront URL to run a real scan.

## Run this fork

The fork is not published to npm. `npx brandpull` still runs upstream.

```bash
git clone https://github.com/alecramos-sudo/ecom-brand-pull.git
cd ecom-brand-pull
bun install
bun run build
node bin/brandpull https://store.example.com --no-preview -o store-branding.json
node bin/brandpull https://shop.example.org
```

Requires Node.js 20+, Bun for development/builds, and Chromium. Install Chromium with `npx playwright install chromium` if needed; installed Google Chrome is also supported as a fallback. After building, `npm link` exposes `ecom-brand-pull` and the legacy `brandpull` alias.

## Compare results in one preview

```bash
node bin/brandpull preview store-branding.json --compare shop-branding.json --no-open
```

For a synthetic demo without scanning a website:

```bash
node bin/brandpull preview docs/examples/store.json --compare docs/examples/shop.json --no-open
```

Repeat `--compare` to add more saved results. The store selector switches the kit, JSON and image downloads together. You can also use `--compare` with a new URL capture when opening its preview.

The viewer leads with original logo variants, separate Shopify scheme cards and a root palette, font hierarchy specimens, and curated ecommerce controls. It loads available font files, keeps aliases and exact source styles in inspectors, and collapses other font declarations and diagnostics. Root tokens can be copied as CSS, including over HTTP remote previews. Older JSON remains viewable; re-scan to add hierarchy and background-context fields.

## Shopify additions

- **Detection and architecture:** evidence from Shopify’s runtime, section markup, CDN and Hydrogen. `headless` is `false` for a confirmed theme storefront, `true` for positive Hydrogen evidence, and `null` when unknown. CDN assets alone yield `possible`, not confirmed Shopify.
- **Theme:** merchant name/ID/role and exposed schema name/version/theme-store ID. Missing metadata stays `null`; a renamed theme is not assumed to be Dawn or Horizon.
- **Logo assets:** selected and header/footer logo candidates on Shopify’s CDN, observed URL, inferred original-size URL and 160–2560px width presets. Preserves the asset’s `v` parameter, removes resize/crop transforms, supports legacy filename sizes, and keeps SVGs as vectors. URLs are generated, not availability-verified; Shopify cannot upscale beyond the source and may re-encode images. Inline SVGs remain in the original `logo` output.
- **Color schemes and palettes:** declared `:root`/`.color-*` rules, active scheme classes and their computed values, supporting Dawn-style `--color-*`, abbreviated `--c-*`, and Horizon palettes. Declared rules can include inactive media-query values; use rendered samples for the current viewport.
- **Typography:** root font tokens and `@font-face` aliases, weights, styles and source URLs, including custom aliases such as `brandheading` and Horizon’s double-hyphen tokens.
- **Ecommerce UI kit:** visible button, add-to-cart, input, product-card, price and badge samples with computed color, border, radius, typography, spacing and shadow. Samples come from the requested page; visit a product page to capture its controls.

This is a public storefront scan, not an Admin API export. Unpublished settings, theme source and unused templates are unavailable. Cross-origin stylesheet restrictions are listed in `inaccessibleStylesheets`; partial Shopify failures are recorded without discarding base branding. Original branding heuristics are unchanged and can still rank app/footer styles highly.

```bash
bun run check
bun test
```

[Font and control-style research](docs/control-styles.md) · [Extraction guide](docs/exploration.md) · [Shopify image URL reference](https://shopify.dev/docs/api/liquid/filters/image_url) · [Horizon palette](https://github.com/Shopify/horizon/blob/8b42ace57642e45a3a59841d2ae06d386c929e72/snippets/color-palette.liquid) · [Horizon typography](https://github.com/Shopify/horizon/blob/8b42ace57642e45a3a59841d2ae06d386c929e72/snippets/theme-styles-variables.liquid)

---

## Upstream README

The following instructions describe the original `brandpull` npm package. The fork keeps the same options; substitute `ecom-brand-pull` after linking locally.


Brandpull extracts clean branding JSON: logos, favicons, OG images, colors, fonts, typography, spacing, and component styles.


## Try It

```bash
npx brandpull https://example.com
```

This saves `example-com-branding.json` and opens a local visual preview.

For agents or scripts, skip the preview server:

```bash
npx brandpull https://example.com --no-preview
```

## Install

```bash
npm install -g brandpull

bun install -g brandpull
```

## Quick Start

```bash
# Extract branding JSON, save it, and open the local preview
brandpull https://example.com

# Save to a custom file
brandpull https://example.com -o example-branding.json

# Reopen an existing branding JSON file
brandpull preview example-branding.json
```

## For Agents

Use `--no-preview` when an agent needs the branding JSON without starting the local HTML preview server.

```bash
brandpull https://example.com --no-preview
```

The default command is human-friendly and opens the preview. The `--no-preview` flag keeps it automation-friendly while still saving the JSON file.

## Branding Commands

```bash
brandpull <url> [options]
brandpull branding <url> [options]
brandpull brand <url> [options]
brandpull preview <file.json> [options]
```

Options:

```txt
-o, --out <file>    Write branding JSON to a file instead of stdout
--web-preview       Open a local browser preview for the branding JSON
--no-preview        Save JSON without starting the local preview server
--preview-port <n>  Preferred preview server port (default: 4177)
--no-open           Start preview server without opening a browser
--llm               Use optional OpenAI enhancement when OPENAI_API_KEY is set
--raw               Include raw logo/button/background candidates
--wait <ms>         Extra page settle wait (default: 2000)
--timeout <ms>      Page navigation timeout (default: 30000)
```

If the preview port is already busy, `brandpull` automatically tries the next port.

## Examples

```bash
# Save example-com-branding.json and open the preview
brandpull https://example.com

# Save the branding profile
brandpull branding https://example.org -o example-org-branding.json

# Capture debug candidates and inspect them visually
brandpull branding https://example.com --raw --web-preview

# Preview a local JSON file without scraping again
brandpull preview example-org-branding.json

# Use the optional LLM cleanup pass
OPENAI_API_KEY=... brandpull branding https://example.net --llm -o example-net-branding.json
```

## How Branding Works

Branding mode renders the page in Chromium, waits for it to settle, then collects computed styles and page metadata from the live DOM. It pulls logo candidates from images and SVGs, captures favicons and OG images, samples colors from real elements, reads typography stacks, and snapshots buttons/inputs with their rendered CSS.

The processor then scores those candidates into a stable profile. If navigation, image loading, or optional LLM enhancement fails, the command still returns JSON with diagnostics so you can see what happened in the preview.

## Output Shape

```json
{
  "brandName": "Example Store",
  "url": "https://example.com/",
  "logo": "https://example.com/...",
  "images": {
    "favicon": "https://example.com/favicon.ico",
    "ogImage": "https://example.com/..."
  },
  "colors": {
    "primary": "#ffffff",
    "accent": "#e5e5e5",
    "background": "#0a0a0a",
    "textPrimary": "#ffffff"
  },
  "fonts": [],
  "typography": {},
  "components": {},
  "confidence": {}
}
```

## Requirements

- Node.js 20+
- Playwright browser dependencies for rendered branding extraction

Bun is only used for local development and publishing builds.

## License

MIT

### Speed and model costs

Normal scans and saved previews use Chromium/local code, with no LLM calls or AI tokens. `--llm` explicitly enables optional OpenAI enhancement. Diagnostics record whether it ran. Model usage in an assistant developing this tool is separate from scan costs.

The network-idle wait is capped at four seconds, followed by the existing two-second settle window. Visibility results are cached within a single synchronous Shopify extraction. `--wait` can increase the settle wait for slow-loading pages. Reuse saved JSON when changing the preview; a live re-scan is unnecessary. Omit `--raw` for smaller exports (it is already off by default).

Scheme cards show button/link color-token specimens only when the relevant tokens are exposed. These use neutral geometry; actual captured control shapes remain in the UI kit. Extra logo variants require logo-specific evidence; product alt text mentioning a logo is insufficient.

Hover-capable UI specimens replay captured CSS hover differences, including text and pseudo-element styling. Color schemes use exposed hover tokens. Keyboard focus previews the same hover state; native focus/disabled states and JavaScript mouse handlers are not captured.
