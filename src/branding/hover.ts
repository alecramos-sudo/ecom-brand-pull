import type { Page } from "playwright"
import type { extractShopifyFromPage } from "./shopify"

type Item = ReturnType<typeof extractShopifyFromPage>["uiKit"][number]

export async function captureHoverStates(page: Page, items: Item[]) {
	const cdp = await page.context().newCDPSession(page)
	try {
		await cdp.send("DOM.enable")
		await cdp.send("CSS.enable")
		const { root } = await cdp.send("DOM.getDocument")
		const result: Array<
			Item & {
				hover?: {
					styles: Record<string, string>
					textStyles: Record<string, string>
					pseudoElements: Record<string, Record<string, string>>
					source: string
				} | null
			}
		> = []
		const diff = (base: Record<string, string>, next: Record<string, string>, keys = Object.keys(base)) =>
			Object.fromEntries(keys.filter((key) => base[key] !== next[key]).map((key) => [key, next[key]!]))
		for (const item of items) {
			if (!["button", "link", "addToCart", "input", "productCard"].includes(item.kind)) {
				result.push(item)
				continue
			}
			const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: item.domPath })
			if (!nodeId) {
				result.push(item)
				continue
			}
			const forced: number[] = []
			try {
				const parts = item.domPath.split(" > ")
				for (let i = 1; i <= parts.length; i++) {
					const found =
						i === parts.length
							? { nodeId }
							: await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: parts.slice(0, i).join(" > ") })
					if (found.nodeId) {
						await cdp.send("CSS.forcePseudoState", { nodeId: found.nodeId, forcedPseudoClasses: ["hover"] })
						forced.push(found.nodeId)
					}
				}
				const hover = await page.evaluate(
					async ({ selector, keys }) => {
						const el = document.querySelector(selector)
						if (!el) return null
						await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
						// Finish CSS transitions without waiting their wall-clock duration.
						for (const animation of el.getAnimations({ subtree: true })) {
							if (animation instanceof CSSTransition)
								try {
									animation.finish()
								} catch {}
						}
						const read = (element: Element, pseudo?: string) =>
							Object.fromEntries(keys.map((key) => [key, getComputedStyle(element, pseudo).getPropertyValue(key)]))
						const text =
							[el, ...el.querySelectorAll("span,strong,em")].find(
								(candidate) =>
									candidate.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
									!candidate.closest(".visually-hidden,.sr-only") &&
									[...candidate.childNodes].some(
										(node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
									),
							) || el
						return {
							styles: read(el),
							textStyles: read(text),
							pseudoElements: Object.fromEntries(["::before", "::after"].map((pseudo) => [pseudo, read(el, pseudo)])),
							source: "computed CSS :hover",
						}
					},
					{
						selector: item.domPath,
						keys: [
							...new Set([
								...Object.keys(item.styles),
								"content",
								"display",
								"position",
								"inset",
								"width",
								"height",
								"opacity",
								"transform",
								"text-decoration",
								"text-underline-offset",
							]),
						],
					},
				)
				if (hover) {
					hover.styles = diff(item.styles, hover.styles)
					hover.textStyles = diff(item.textStyles, hover.textStyles)
					hover.pseudoElements = Object.fromEntries(
						Object.entries(hover.pseudoElements)
							.filter(
								([key, value]) => item.pseudoElements[key] || !["none", "normal"].includes(value.content || "none"),
							)
							.map(([key, value]) => [
								key,
								diff(item.pseudoElements[key] || {}, value, Object.keys(item.pseudoElements[key] || value)),
							]),
					)
				}
				const changed =
					hover &&
					(Object.keys(hover.styles).length ||
						Object.keys(hover.textStyles).length ||
						Object.values(hover.pseudoElements).some((values) => Object.keys(values).length))
				result.push(changed ? { ...item, hover } : item)
			} finally {
				for (const id of forced.reverse())
					await cdp.send("CSS.forcePseudoState", { nodeId: id, forcedPseudoClasses: [] }).catch(() => undefined)
			}
		}
		return result
	} finally {
		await cdp.detach()
	}
}
