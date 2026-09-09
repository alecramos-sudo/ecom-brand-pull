# Fonts and control styles

## Supported patterns

Font aliases such as `brandbody`, `brandheading`, and `brandaccent` can appear independently of heading levels. Capture descendant text styles separately from control boxes. A mono-like appearance does not prove fixed-width spacing.

Button palettes may use `--c-button*`, `--c-secondary-button*`, `--c-outline-button*`, or Horizon-style `--color-primary-button-*` and `--color-secondary-button-*` tokens. Generated `button--<block-id>` classes do not establish semantic variants.

Outlines may use pseudo-element shadows instead of borders. Hover may change text, fills, borders, transforms, or underline dimensions. Missing variants remain absent.

## General extraction model

- Preserve family aliases, font source files, and direct text usages independently of heading/body hierarchy. A computed stack does not prove which file rendered.
- Keep function (`button`, `link`, `addToCart`) separate from explicit variant (`primary`, `secondary`, `tertiary`, `outline`, `text`) and default appearance (`filled`, `outline`, `decorated`, `underlined`, `text`).
- Variant evidence is the actual matching class. Never derive a hierarchy from marketing copy or a generated block ID.
- Capture control box styles, descendant text styles, nearest solid ancestor background, and generated pseudo-element styles separately. The preview approximates empty absolute pseudo-element borders, shadows, and fills; complex artwork remains in the inspector.
- Keep declared button/link rules, source stylesheet, and enclosing conditions. These can expose unused variants and hover/focus/active/disabled declarations without claiming focus, active, or disabled states were exercised. CSS hover is captured through Chromium forced pseudo-states on the element and its ancestors. JavaScript mouse handlers are not simulated.
- Bound samples to 36 button styles, 18 links, 120 font usages, and 400 control rules. Results can omit later or inaccessible CSS; this is an observed kit, not a lossless site clone.

The preview marks variant availability as observed, declared only, or not found, and retains original data in JSON. Hover-capable specimens apply their captured style differences on pointer entry or keyboard focus and restore their original styles on exit. Scheme specimens use exposed hover tokens. No storefront interactions that submit forms or add products are performed.
