import { afterAll, beforeAll, expect, test } from "bun:test"
import { type Browser, chromium } from "playwright"
import { captureHoverStates } from "./hover"
import { extractShopifyFromPage } from "./shopify"
import { collectShopifyLogos, shopifyImageOptions } from "./shopify-assets"

let browser: Browser
beforeAll(async () => {
	browser = await chromium
		.launch({ headless: true })
		.catch(() => chromium.launch({ headless: true, channel: "chrome" }))
})
afterAll(async () => {
	await browser?.close()
})

async function scan(html: string) {
	const page = await browser.newPage()
	try {
		await page.route("**/*", (route) => route.abort())
		await page.setContent(html)
		return await page.evaluate(extractShopifyFromPage)
	} finally {
		await page.close()
	}
}

test("a CDN image alone cannot establish Shopify commerce or headless", async () => {
	const result = await scan('<img src="https://cdn.shopify.com/s/files/1/logo.png">')
	expect(result.detected).toBe(false)
	expect(result.status).toBe("possible")
	expect(result.headless).toBeNull()
})

test("theme metadata, arbitrary scheme IDs, font aliases and visible ecommerce samples", async () => {
	const result =
		await scan(`<script>window.Shopify={shop:'example.myshopify.com',theme:{id:42,name:'Launch September',schema_name:'Dawn',schema_version:'15.4.0',theme_store_id:887,role:'main'}}</script>
	<style>
	@font-face {font-family:brandheading;src:url(https://example.com/title.woff2);font-weight:500}
	:root,.color-scheme-a12b {--c-background:250, 245, 240;--f-heading-family:brandheading;--btn-radius:8px}
	@media(min-width:1px){.color-scheme-dark {--c-background:12, 12, 12;--c-foreground:255, 255, 255}}
	button {background:rgb(10,80,30);border-radius:8px;padding:12px} .hidden {display:none}
	</style><main id="shopify-section-template"><div class="color-scheme-a12b"><button name="add">Add to bag</button><button class="hidden" name="add">Hidden</button></div></main>`)
	expect(result.detected).toBe(true)
	expect(result.headless).toBe(false)
	expect(result.theme).toMatchObject({ name: "Launch September", schemaName: "Dawn", version: "15.4.0", id: 42 })
	expect(result.colorSchemes).toHaveLength(2)
	expect(result.colorSchemes[1]?.variables["--c-background"]).toBe("12, 12, 12")
	expect(result.rootTokens["--f-heading-family"]).toBe("brandheading")
	expect(result.fontFaces[0]?.src).toContain("https://example.com/title.woff2")
	expect(result.uiKit.filter((x) => x.kind === "addToCart")).toHaveLength(1)
	expect(result.uiKit.find((x) => x.kind === "addToCart")?.styles["border-radius"]).toBe("8px")
})

test("Shopify without theme evidence keeps architecture and version unknown", async () => {
	const result = await scan('<script>window.Shopify={shop:"demo.myshopify.com"}</script>')
	expect(result.detected).toBe(true)
	expect(result.architecture).toBe("unknown")
	expect(result.theme).toBeNull()
})

test("typography hierarchy samples visible headings and controls without inventing absent levels", async () => {
	const result = await scan(`<script>window.Shopify={shop:'example.myshopify.com'}</script>
	<style>
	body {font-family:Georgia; font-size:18px;line-height:1.5}
	h1 {font-family:brandheading,serif;font-size:48px;font-weight:500;line-height:1.2;letter-spacing:2px;text-transform:uppercase}
	.hidden {display:none} .transparent {opacity:0} .invisible {visibility:hidden}
	</style><h1 class="hidden">Hidden title</h1><div class="transparent"><h1>Transparent title</h1><h3>Hidden third level</h3></div>
	<h1>Visible title</h1><h2 class="invisible">Hidden second level</h2><h2>Visible subtitle</h2>
	<p>Paragraph sample</p><button>Shop now</button><label for="email">Email address</label><input id="email" placeholder="Your email">`)
	expect(result.typographyHierarchy.map((entry) => entry.role)).toEqual([
		"h1",
		"h2",
		"body",
		"paragraph",
		"button",
		"input",
		"label",
	])
	expect(result.typographyHierarchy.find((entry) => entry.role === "h1")).toMatchObject({
		family: "brandheading, serif",
		size: "48px",
		weight: "500",
		lineHeight: "57.6px",
		letterSpacing: "2px",
		textTransform: "uppercase",
		text: "VISIBLE TITLE",
	})
	expect(result.typographyHierarchy.find((entry) => entry.role === "body")).toMatchObject({
		family: "Georgia",
		size: "18px",
		lineHeight: "27px",
	})
	expect(result.typographyHierarchy.find((entry) => entry.role === "input")?.text).toBe("Your email")
})

test("font faces retain aliases, deduplicate declarations and classify visible stack usage", async () => {
	const result = await scan(`<script>window.Shopify={shop:'example.myshopify.com'}</script>
	<style>
	@font-face {font-family:brandheading;src:url(https://example.com/actual-family.woff2);font-weight:500}
	@font-face {font-family:brandheading;src:url(https://example.com/actual-family.woff2);font-weight:500}
	@font-face {font-family:'Fallback Alias';src:url(https://example.com/fallback.woff2)}
	@font-face {font-family:hiddenfont;src:url(https://example.com/hidden.woff2)}
	@font-face {font-family:unusedfont;src:url(https://example.com/unused.woff2)}
	h1 {font-family:brandheading,'Fallback Alias',serif}
	.hidden {opacity:0;font-family:hiddenfont}
	</style><h1>Title</h1><div class="hidden"><p>Hidden copy</p></div>`)
	expect(result.fontFaces).toHaveLength(4)
	expect(result.fontFaces.find((face) => face.family === "brandheading")).toMatchObject({
		usedOnPage: true,
		source: "inline",
		src: 'url("https://example.com/actual-family.woff2")',
	})
	expect(result.fontFaces.find((face) => face.family.includes("Fallback Alias"))?.usedOnPage).toBe(true)
	expect(result.fontFaces.find((face) => face.family === "hiddenfont")?.usedOnPage).toBe(false)
	expect(result.fontFaces.find((face) => face.family === "unusedfont")?.usedOnPage).toBe(false)
})

test("typography prefers visible main content and falls back for absent main roles", async () => {
	const result = await scan(`<script>window.Shopify={shop:'example.myshopify.com'}</script>
	<header><h1>Utility title</h1><button>Country</button><label>Region</label><h3>Fallback heading</h3></header>
	<main><h1 style="display:none">Hidden title</h1><h1>Product title</h1><button>Add to bag</button><label>Email</label></main>`)
	expect(result.typographyHierarchy.find((entry) => entry.role === "h1")?.text).toBe("Product title")
	expect(result.typographyHierarchy.find((entry) => entry.role === "button")?.text).toBe("Add to bag")
	expect(result.typographyHierarchy.find((entry) => entry.role === "label")?.text).toBe("Email")
	expect(result.typographyHierarchy.find((entry) => entry.role === "h3")?.text).toBe("Fallback heading")
})

test("transparent UI samples retain ancestor background and unknown context stays null", async () => {
	const result = await scan(`<script>window.Shopify={shop:'example.myshopify.com'}</script>
	<style>button{background:transparent;color:white} .dark{background:#123456}</style>
	<main><section class="dark"><div><button>Light text</button></div></section><button>No painted ancestor</button></main>`)
	const samples = result.uiKit.filter((entry) => entry.kind === "button")
	expect(samples).toHaveLength(2)
	expect(samples[0]).toMatchObject({
		contextBackground: "rgb(18, 52, 86)",
		styles: { color: "rgb(255, 255, 255)", "background-color": "rgba(0, 0, 0, 0)" },
	})
	expect(samples[1]?.contextBackground).toBeNull()
})

test("UI input samples exclude checkbox and radio controls", async () => {
	const result = await scan(`<script>window.Shopify={shop:'example.myshopify.com'}</script><main>
	<input type="checkbox"><input type="radio"><input type="range"><input type="file"><input type="submit">
	<input type="email" class="email" placeholder="Email"></main>`)
	expect(result.uiKit.filter((entry) => entry.kind === "input")).toHaveLength(1)
	expect(result.uiKit.find((entry) => entry.kind === "input")?.classes).toBe("email")
})

test("Hydrogen generator is positive headless evidence", async () => {
	const result = await scan('<meta name="generator" content="Shopify Hydrogen">')
	expect(result.headless).toBe(true)
})

test("Horizon palette and double-hyphen typography are retained without invented schemes", async () => {
	const result = await scan(
		`<script>window.Shopify={shop:"demo.myshopify.com"}</script><style>:root {--color-background:#fff;--font-heading--family:Georgia;--style-border-radius-inputs:12px}</style>`,
	)
	expect(result.colorSchemes[0]?.selector).toBe(":root")
	expect(result.renderedSchemes).toHaveLength(0)
	expect(result.rootTokens["--font-heading--family"]).toBe("Georgia")
	expect(result.rootTokens["--style-border-radius-inputs"]).toBe("12px")
})

test("original and preset image URLs remove transforms while retaining version", () => {
	const result = shopifyImageOptions(
		"/cdn/shop/files/logo.png?v=123&width=200&height=80&crop=region&crop_left=4&crop_top=5&crop_width=50&crop_height=20&quality=30",
		"https://example.com",
	)!
	expect(result.original).toBe("https://example.com/cdn/shop/files/logo.png?v=123")
	expect(result.presets.find((p) => p.width === 1280)?.url).toBe(
		"https://example.com/cdn/shop/files/logo.png?v=123&width=1280",
	)
	expect(result.verified).toBe(false)
})

test("legacy resize/crop suffixes are removed and SVG stays vector", () => {
	expect(
		shopifyImageOptions("https://cdn.shopify.com/s/files/1/logo_200x100_crop_center@2x.png?v=1", "https://example.com")
			?.original,
	).toBe("https://cdn.shopify.com/s/files/1/logo.png?v=1")
	const svg = shopifyImageOptions("/cdn/shop/files/logo.svg?width=600&v=2", "https://example.com")!
	expect(svg.vector).toBe(true)
	expect(svg.presets).toEqual([])
	expect(svg.original).toBe("https://example.com/cdn/shop/files/logo.svg?v=2")
})

test("non-Shopify URLs and embedded SVG are not rewritten", () => {
	for (const source of [
		"https://example.org/cdn/shop/files/logo.png",
		"https://cdn.shopify.com.evil.test/logo.png",
		"data:image/svg+xml,abc",
		"/logo_200x.png",
	])
		expect(shopifyImageOptions(source, "https://example.com")).toBeNull()
})

test("legacy sizes are removed before negotiated and progressive extensions", () => {
	for (const extension of ["png.webp", "jpg.avif", "progressive.jpg"]) {
		const result = shopifyImageOptions(
			`https://cdn.shopify.com/s/files/1/logo_200x200_crop_center.${extension}?v=1`,
			"https://example.com",
		)!
		expect(result.original).toBe(`https://cdn.shopify.com/s/files/1/logo.${extension}?v=1`)
		expect(result.presets[0]?.url).toBe(`https://cdn.shopify.com/s/files/1/logo.${extension}?v=1&width=160`)
	}
})

test("deduplicated image variants preserve the selected candidate and its metadata", () => {
	const candidate = (width: number, alt: string) => ({
		src: `https://example.com/cdn/shop/files/logo.png?v=1&width=${width}`,
		alt,
		isSvg: false,
		isVisible: true,
		location: "header" as const,
		position: { top: 0, left: 0, width, height: 50 },
		indicators: { inHeader: true, altMatch: true, srcMatch: true, classMatch: true, hrefMatch: true },
		source: "img",
	})
	const mobile = candidate(160, "Mobile logo")
	const desktop = candidate(640, "Selected desktop logo")
	const logos = collectShopifyLogos([mobile, desktop], desktop.src, "https://example.com")
	expect(logos).toHaveLength(1)
	expect(logos[0]).toMatchObject({ selected: true, alt: "Selected desktop logo", asset: { source: desktop.src } })
})

test("accent descendants, explicit variants, pseudo outlines and declared states survive extraction", async () => {
	const result = await scan(`<script>window.Shopify={shop:'example.myshopify.com'}</script><style>
 .button {background:transparent;border:0;font-family:Arial}
 .button span,.accent {font-family:brandaccent;font-size:13px}
 .button::after {content:"";position:absolute;inset:1px;box-shadow:0 0 0 1px red}
 .button--secondary:hover {color:blue}
 @media(min-width:900px){.button--tertiary {color:green}}
 </style><main><button class="button button--outline"><span>Shop now</span><span class="visually-hidden">opens in a new tab</span></button><a class="button-secondary" href="/shop">Learn more</a><a href="/about">About us</a><p class="accent">Small details</p></main>`)
	const button = result.uiKit.find((x) => x.kind === "button")!
	expect(button.variant).toBe("outline")
	expect(button.text).toBe("Shop now")
	expect(result.uiKit.some((x) => x.kind === "button" && x.variant === "secondary")).toBe(true)
	expect(button.treatment).toBe("decorated")
	expect(button.textStyles["font-family"]).toBe("brandaccent")
	expect(button.pseudoElements["::after"]?.["box-shadow"]).toContain("1px")
	expect(result.uiKit.filter((x) => x.kind === "link")).toHaveLength(1)
	expect(result.fontUsage.some((x) => x.family === "brandaccent" && x.tag === "span")).toBe(true)
	expect(result.controlRules.find((x) => x.selector === ".button--tertiary")?.conditions).toEqual([
		"(min-width: 900px)",
	])
	expect(result.controlRules.some((x) => x.selector.includes(":hover"))).toBe(true)
	expect(result.uiKit.some((x) => x.variant === "tertiary")).toBe(false)
})

test("opaque colors ending in a zero blue channel remain filled and provide background context", async () => {
	const result = await scan(
		`<script>window.Shopify={shop:'example.myshopify.com'}</script><style>main{background:rgb(0,0,0)}button{background:rgb(255,0,0);border:0}a{color:white}</style><main><button>Buy</button><a href="/help">Help</a></main>`,
	)
	expect(result.uiKit.find((x) => x.kind === "button")?.treatment).toBe("filled")
	expect(result.uiKit.find((x) => x.kind === "link")?.contextBackground).toBe("rgb(0, 0, 0)")
})

test("logo variants reject product and editorial alt text mentioning logos or branding", () => {
	const candidate = (file: string, alt: string) => ({
		src: `https://example.com/cdn/shop/files/${file}`,
		alt,
		isSvg: false,
		isVisible: true,
		location: "header" as const,
		position: { top: 0, left: 0, width: 300, height: 300 },
		indicators: { inHeader: true, altMatch: true, srcMatch: false, classMatch: false, hrefMatch: false },
		source: "img",
	})
	const selected = candidate("wordmark.svg", "Example Store logo")
	const photo = candidate("pdp.webp", "Pouch with Example Store logo and fruit")
	const article = candidate("article.png", "Discover the branding behind Example Store")
	const variant = candidate("logo-white.svg", "")
	expect(
		collectShopifyLogos([selected, photo, article, variant], selected.src, "https://example.com").map(
			(l) => l.asset.original,
		),
	).toEqual([selected.src, variant.src])
})

test("CSS hover capture includes descendant text, pseudo borders and restores the source", async () => {
	const page = await browser.newPage()
	try {
		await page.setContent(
			`<script>window.Shopify={shop:'test.myshopify.com'}</script><style>button{background:white;transition:background-color .2s}.group:hover button{background:red}button:hover span{color:blue}button::after{content:"";box-shadow:0 0 0 1px black}button:hover::after{box-shadow:0 0 0 3px blue}</style><main class="group"><button><span>Shop now</span></button></main>`,
		)
		const base = await page.evaluate(extractShopifyFromPage)
		const captured = await captureHoverStates(page, base.uiKit)
		const item = captured.find((x) => x.kind === "button")!
		expect("hover" in item && item.hover?.styles["background-color"]).toBe("rgb(255, 0, 0)")
		expect("hover" in item && item.hover?.textStyles.color).toBe("rgb(0, 0, 255)")
		expect("hover" in item && item.hover?.pseudoElements["::after"]?.["box-shadow"]).toContain("3px")
		expect(await page.locator("button").evaluate((el) => el.matches(":hover"))).toBe(false)
	} finally {
		await page.close()
	}
})
