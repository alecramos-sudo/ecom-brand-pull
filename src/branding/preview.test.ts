import { expect, test } from "bun:test"
import { chromium } from "playwright"
import { previewResponse } from "./preview"
import { previewHtml } from "./preview-page"

const profiles = [
	{ brandName: "Angela", logo: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E" },
	{ brandName: "Grüns", logo: "data:image/svg+xml,%3Csvg%20id%3D%22gruns%22%3E%3C/svg%3E" },
]
test("preview switcher enumerates saved results and serves selected JSON", async () => {
	expect(await (await previewResponse(profiles, "http://localhost/profiles.json")).json()).toEqual([
		{ index: 0, name: "Angela" },
		{ index: 1, name: "Grüns" },
	])
	expect(await (await previewResponse(profiles, "http://localhost/branding.json?profile=1")).json()).toEqual(
		profiles[1],
	)
	expect((await previewResponse(profiles, "http://localhost/?profile=2")).status).toBe(404)
	expect((await previewResponse(profiles, "http://localhost/?profile=NaN")).status).toBe(404)
})
test("image downloads follow the selected store", async () => {
	const result = await previewResponse(profiles, "http://localhost/download?profile=1&image=logo")
	expect(await result.text()).toBe('<svg id="gruns"></svg>')
	expect(result.headers.get("content-disposition")).toContain("gr-ns-logo.svg")
})

test("rendered schemes stay separate and HTTP token copying yields complete CSS", async () => {
	const browser = await chromium
		.launch({ headless: true })
		.catch(() => chromium.launch({ headless: true, channel: "chrome" }))
	const page = await browser.newPage()
	try {
		const fixture = {
			brandName: "Scheme test",
			shopify: {
				detected: true,
				rootTokens: { "--c-background": "255,255,255" },
				colorSchemes: [
					{
						selector: ".color-light",
						variables: {
							"--c-background": "255,255,255",
							"--c-foreground": "0,0,0",
							"--c-button": "0,0,0",
							"--c-button-text": "255,255,255",
							"--c-secondary-button": "220,220,220",
							"--c-secondary-button-text": "0,0,0",
							"--c-outline-button-text": "0,0,0",
						},
					},
					{ selector: ".color-dark", variables: { "--c-background": "0,0,0", "--c-foreground": "255,255,255" } },
				],
				fontFaces: [],
			},
		}
		await page.route("**/*", (route) => {
			const path = new URL(route.request().url()).pathname
			if (path === "/profiles.json") return route.fulfill({ json: [{ index: 0, name: "Scheme test" }] })
			if (path === "/branding.json") return route.fulfill({ json: fixture })
			if (path === "/") return route.fulfill({ contentType: "text/html", body: previewHtml() })
			return route.abort()
		})
		await page.goto("http://preview.test/")
		await page.getByRole("heading", { name: "Logos", exact: true }).waitFor()
		expect(
			await page
				.locator(".scheme-sample")
				.evaluateAll((elements) => elements.map((el) => getComputedStyle(el).backgroundColor)),
		).toEqual(["rgb(255, 255, 255)", "rgb(0, 0, 0)"])
		expect(
			await page
				.locator(".scheme-sample")
				.first()
				.locator("[data-scheme-variant]")
				.evaluateAll((elements) => elements.map((el) => el.getAttribute("data-scheme-variant"))),
		).toEqual(["Primary", "Secondary", "Outline"])
		expect(await page.locator(".scheme-sample").nth(1).locator("[data-scheme-variant]").count()).toBe(0)
		await page.evaluate(() => {
			Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true })
			document.execCommand = () => {
				;(document.body as HTMLElement).dataset.copied = (document.activeElement as HTMLTextAreaElement).value
				return true
			}
		})
		await page.getByRole("button", { name: "Copy tokens", exact: true }).click()
		expect(await page.locator("body").getAttribute("data-copied")).toBe(":root {\n  --c-background: 255,255,255;\n}\n")
	} finally {
		await page.close()
		await browser.close()
	}
})
