# Ecom Brand Pull

A focused public fork of [suraj-xd/brandpull](https://github.com/suraj-xd/brandpull) for Shopify storefronts. Keeps Brandpull’s Chromium extraction, branding JSON, optional LLM pass, and local visual preview; adds a `shopify` field and Shopify preview sections. Original MIT license and attribution are retained.

## Run this fork

The fork is not published to npm. `npx brandpull` still runs upstream.

```bash
git clone https://github.com/alecramos-sudo/ecom-brand-pull.git
cd ecom-brand-pull
bun install
bun run build
node bin/brandpull https://angelacaglia.com --no-preview -o angela-branding.json
node bin/brandpull https://gruns.co
```

Requires Node.js 20+, Bun for development/builds, and Chromium. Install Chromium with `npx playwright install chromium` if needed; installed Google Chrome is also supported as a fallback. After building, `npm link` exposes `ecom-brand-pull` and the legacy `brandpull` alias.

## Compare results in one preview

```bash
node bin/brandpull preview angela-branding.json --compare gruns-branding.json --no-open
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

[Font and control-style research](docs/control-styles.md) · [Exploration notes and live results](docs/exploration.md) · [Shopify image URL reference](https://shopify.dev/docs/api/liquid/filters/image_url) · [Horizon palette](https://github.com/Shopify/horizon/blob/8b42ace57642e45a3a59841d2ae06d386c929e72/snippets/color-palette.liquid) · [Horizon typography](https://github.com/Shopify/horizon/blob/8b42ace57642e45a3a59841d2ae06d386c929e72/snippets/theme-styles-variables.liquid)

---

## Upstream README

The following instructions describe the original `brandpull` npm package. The fork keeps the same options; substitute `ecom-brand-pull` after linking locally.


Brandpull extracts clean branding JSON: logos, favicons, OG images, colors, fonts, typography, spacing, and component styles.

https://github.com/user-attachments/assets/ccfb76e1-86fa-4d51-9875-edcb4c56237c

## Try It

```bash
npx brandpull https://exa.ai
```

This saves `exa-ai-branding.json` and opens a local visual preview.

For agents or scripts, skip the preview server:

```bash
npx brandpull https://exa.ai --no-preview
```

## Install

```bash
npm install -g brandpull

bun install -g brandpull
```

## Quick Start

```bash
# Extract branding JSON, save it, and open the local preview
brandpull https://exa.ai

# Save to a custom file
brandpull https://exa.ai -o exa-branding.json

# Reopen an existing branding JSON file
brandpull preview exa-branding.json
```

## For Agents

Use `--no-preview` when an agent needs the branding JSON without starting the local HTML preview server.

```bash
brandpull https://exa.ai --no-preview
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
# Save exa-ai-branding.json and open the preview
brandpull https://exa.ai

# Save the branding profile
brandpull branding https://ramp.com -o ramp-branding.json

# Capture debug candidates and inspect them visually
brandpull branding https://exa.ai --raw --web-preview

# Preview a local JSON file without scraping again
brandpull preview ramp-branding.json

# Use the optional LLM cleanup pass
OPENAI_API_KEY=... brandpull branding https://linear.app --llm -o linear-branding.json
```

## How Branding Works

Branding mode renders the page in Chromium, waits for it to settle, then collects computed styles and page metadata from the live DOM. It pulls logo candidates from images and SVGs, captures favicons and OG images, samples colors from real elements, reads typography stacks, and snapshots buttons/inputs with their rendered CSS.

The processor then scores those candidates into a stable profile. If navigation, image loading, or optional LLM enhancement fails, the command still returns JSON with diagnostics so you can see what happened in the preview.

## Output Shape

```json
{
  "brandName": "Exa",
  "url": "https://exa.ai/",
  "logo": "https://exa.ai/...",
  "images": {
    "favicon": "https://exa.ai/favicon.ico",
    "ogImage": "https://exa.ai/..."
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
