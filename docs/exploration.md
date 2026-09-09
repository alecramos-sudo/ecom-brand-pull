# Extraction guide

This fork retains the upstream Chromium collector, deterministic processor, optional LLM cleanup, and local preview. Shopify extraction adds evidence alongside the base branding fields; a Shopify-specific failure does not discard the base profile.

## Example workflow

These domains are placeholders, not captured storefronts:

```bash
node bin/brandpull https://store.example.com --no-preview -o store-branding.json
node bin/brandpull https://shop.example.org --no-preview -o shop-branding.json
node bin/brandpull preview store-branding.json --compare shop-branding.json
```

Use `--raw` only when investigating candidate selection. Saved JSON can be previewed repeatedly without rescanning a storefront.

## Interpreting results

Theme name, ID, schema and version are reported only when exposed. A custom appearance does not establish headless architecture or theme ancestry. CDN assets alone are partial evidence of Shopify.

Font aliases may differ from actual family names. Font-face declarations can include app fonts and unused weights. Cross-origin stylesheet restrictions are reported. UI samples describe the scanned page and viewport, not a complete theme inventory.

## Public references

- [Horizon palette](https://github.com/Shopify/horizon/blob/8b42ace57642e45a3a59841d2ae06d386c929e72/snippets/color-palette.liquid)
- [Horizon typography and UI variables](https://github.com/Shopify/horizon/blob/8b42ace57642e45a3a59841d2ae06d386c929e72/snippets/theme-styles-variables.liquid)
- [Shopify image URL transforms and size limits](https://shopify.dev/docs/api/liquid/filters/image_url)
