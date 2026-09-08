// This function is serialized into Chromium: keep all runtime helpers inside it.
export function extractShopifyFromPage() {
	const globals = window as unknown as {
		Shopify?: { shop?: string; theme?: Record<string, unknown> }
		ShopifyAnalytics?: { meta?: { theme?: Record<string, unknown> } }
	}
	const shop = globals.Shopify?.shop
	const theme = globals.Shopify?.theme
	const analyticsTheme = globals.ShopifyAnalytics?.meta?.theme
	const evidence: string[] = []
	const resources = [
		...document.querySelectorAll<HTMLScriptElement | HTMLLinkElement | HTMLImageElement>(
			"script[src],link[href],img[src]",
		),
	].map((el) => el.getAttribute("src") || el.getAttribute("href") || "")
	const sections = !!document.querySelector('[id^="shopify-section-"]')
	const validShop = typeof shop === "string" && /^[a-z0-9-]+\.myshopify\.com$/i.test(shop)
	const cdn = resources.some((url) => /(?:cdn\.shopify\.com\/s\/files\/|\/cdn\/shop\/)/.test(url))
	const hydrogen = !!document.querySelector('script[src*="/hydrogen/"],meta[name="generator"][content*="Hydrogen"]')
	if (validShop) evidence.push("Shopify.shop myshopify.com domain")
	if (theme) evidence.push("Shopify.theme metadata")
	if (sections) evidence.push("Shopify section wrappers")
	if (cdn) evidence.push("Shopify CDN assets (also usable by non-Shopify sites)")
	if (hydrogen) evidence.push("Hydrogen generator or runtime")
	const detected = validShop || (!!theme && sections) || hydrogen
	const headless = detected && theme && sections ? false : hydrogen ? true : null
	const string = (value: unknown) => (typeof value === "string" ? value : null)
	const scalar = (value: unknown) => (typeof value === "string" || typeof value === "number" ? value : null)
	const properties = (style: CSSStyleDeclaration, pattern: RegExp) => {
		const result: Record<string, string> = {}
		for (const key of Array.from(style)) {
			if (pattern.test(key)) result[key] = style.getPropertyValue(key).trim()
		}
		return result
	}
	const tokenPattern =
		/^--(?:color-|c-|gradient-|font-|f-|h[1-6]-|body-|heading-|button|btn-|input|i-|p-crd-|product-card|card-|style-|pills-|me-|border-|radius-|spacing-|page-width)/
	const rootTokens = properties(getComputedStyle(document.documentElement), tokenPattern)
	const colorSchemes: Array<{ selector: string; source: string; variables: Record<string, string> }> = []
	const fontFaces: Array<{ family: string; weight: string; style: string; src: string; source: string }> = []
	const inaccessibleStylesheets: string[] = []
	const seenSheets = new Set<CSSStyleSheet>()
	const walkSheet = (sheet: CSSStyleSheet) => {
		if (seenSheets.has(sheet)) return
		seenSheets.add(sheet)
		const source = sheet.href || "inline"
		try {
			walkRules(sheet.cssRules, source)
		} catch {
			inaccessibleStylesheets.push(source)
		}
	}
	const walkRules = (rules: CSSRuleList, source: string) => {
		for (const rule of Array.from(rules)) {
			if (rule instanceof CSSFontFaceRule) {
				const style = rule.style
				const src = style.getPropertyValue("src").replace(/url\(["']?([^"')]+)["']?\)/g, (_match, path: string) => {
					try {
						return `url("${new URL(path, source === "inline" ? document.baseURI : source).href}")`
					} catch {
						return _match
					}
				})
				fontFaces.push({
					family: style.getPropertyValue("font-family"),
					weight: style.getPropertyValue("font-weight"),
					style: style.getPropertyValue("font-style"),
					src,
					source,
				})
			}
			if (rule instanceof CSSStyleRule) {
				const variables = properties(rule.style, /^--(?:color-|c-|gradient-)/)
				if (Object.keys(variables).length && /:root|\.color-[\w-]+/.test(rule.selectorText)) {
					colorSchemes.push({ selector: rule.selectorText, source, variables })
				}
			}
			if (rule instanceof CSSImportRule && rule.styleSheet) walkSheet(rule.styleSheet)
			if ("cssRules" in rule) walkRules((rule as CSSGroupingRule).cssRules, source)
		}
	}
	if (detected) for (const sheet of Array.from(document.styleSheets)) walkSheet(sheet)
	const activeSchemes = [
		...new Set(
			[...document.querySelectorAll('[class*="color-"]')].flatMap((el) =>
				[...el.classList].filter((name) => /^color-[\w-]+$/.test(name)),
			),
		),
	].slice(0, 100)
	const renderedSchemes = activeSchemes.map((name) => {
		const el = document.getElementsByClassName(name)[0]!
		const style = getComputedStyle(el)
		return {
			className: name,
			variables: properties(style, /^--(?:color-|c-|gradient-)/),
			background: style.backgroundColor,
			color: style.color,
		}
	})
	const componentSelectors: Record<string, string> = {
		button: 'main button,main a.button,main a.btn,main a[class*="button--"],main a[href*="/collections/"]',
		addToCart:
			'button[name="add"],button[type="submit"][form*="product"],.product-form__submit,.add-to-cart-btn,add-to-cart-component button',
		input: 'main input:not([type="hidden"]),main select,main textarea',
		productCard: "product-card,.product-card,.card-wrapper,.p-crd",
		price: ".price,.product-price,product-price",
		badge: ".badge,.product-badge,.card__badge",
	}
	const uiKit: Array<{
		kind: string
		selector: string
		tag: string
		classes: string
		text: string
		styles: Record<string, string>
	}> = []
	if (detected)
		for (const [kind, selector] of Object.entries(componentSelectors)) {
			const seen = new Set<string>()
			for (const el of Array.from(document.querySelectorAll(selector))) {
				const box = el.getBoundingClientRect()
				const computed = getComputedStyle(el)
				if (!box.width || !box.height || computed.visibility === "hidden" || computed.opacity === "0") continue
				const styles: Record<string, string> = {}
				for (const key of [
					"background-color",
					"color",
					"border",
					"border-radius",
					"box-shadow",
					"font-family",
					"font-size",
					"font-weight",
					"line-height",
					"letter-spacing",
					"text-transform",
					"padding",
					"gap",
				])
					styles[key] = computed.getPropertyValue(key)
				const fingerprint = JSON.stringify(styles)
				if (seen.has(fingerprint)) continue
				seen.add(fingerprint)
				uiKit.push({
					kind,
					selector,
					tag: el.tagName.toLowerCase(),
					classes: el.getAttribute("class") || "",
					text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
					styles,
				})
				if (seen.size >= 6) break
			}
		}
	return {
		detected,
		status: detected ? "detected" : cdn || theme || sections ? "possible" : "not-detected",
		evidence,
		shop: validShop ? shop : null,
		headless,
		architecture: headless === false ? "theme" : headless === true ? "headless" : "unknown",
		theme: theme
			? {
					id: scalar(theme.id),
					name: string(theme.name),
					role: string(theme.role),
					themeStoreId: scalar(theme.theme_store_id),
					schemaName: string(theme.schema_name ?? analyticsTheme?.schema_name),
					version: string(theme.schema_version ?? analyticsTheme?.schema_version),
				}
			: null,
		rootTokens: detected ? rootTokens : {},
		colorSchemes,
		renderedSchemes: detected ? renderedSchemes : [],
		fontFaces,
		uiKit,
		limitations: [
			"Public storefront evidence only; unpublished theme settings and unused templates are unavailable.",
			"Missing theme metadata does not prove a headless storefront. Version is reported only when exposed.",
			"CSS rules are declared values; rendered schemes and UI samples reflect the current page and viewport.",
			...(inaccessibleStylesheets.length ? ["Some stylesheets could not be read through the browser CSSOM."] : []),
		],
		inaccessibleStylesheets,
	}
}
