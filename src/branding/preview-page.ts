// Serialized into the preview page; runtime helpers stay inside this function.
function previewApp() {
	const app = document.getElementById("app")!
	const state: {
		data: any
		profiles: any[]
		index: number
		dark: boolean
		fontNames: Map<string, string>
		fontStatus: string
		request: number
	} = { data: null, profiles: [], index: 0, dark: false, fontNames: new Map(), fontStatus: "", request: 0 }
	const esc = (value: unknown) =>
		String(value ?? "").replace(
			/[&<>"']/g,
			(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
		)
	const cleanFamily = (v: string) => v.trim().replace(/^["']|["']$/g, "")
	const safeUrl = (v: string, image = false) => {
		try {
			const u = new URL(v, location.href)
			return /^https?:$/.test(u.protocol) || (image && /^data:image\//i.test(v)) ? u.href : ""
		} catch {
			return ""
		}
	}
	const link = (label: string, url: string) =>
		safeUrl(url) ? `<a target="_blank" rel="noreferrer" href="${esc(safeUrl(url))}">${esc(label)}</a>` : esc(label)
	const endpoint = (path: string) => `${path}?profile=${state.index}`
	const inspect = (label: string, data: unknown) =>
		`<details class="inspect"><summary>${esc(label)}</summary><pre>${esc(JSON.stringify(data, null, 2))}</pre></details>`
	const section = (id: string, title: string, note: string, body: string) =>
		`<section id="${id}"><div class="section-head"><h2>${title}</h2><p>${note}</p></div>${body}</section>`
	const empty = (text: string) => `<p class="empty">${esc(text)}</p>`
	const css = (values: Record<string, unknown>) =>
		Object.entries(values)
			.filter(
				([k, v]) =>
					[
						"background",
						"background-color",
						"color",
						"border",
						"border-color",
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
					].includes(k) &&
					typeof v === "string" &&
					!/[;{}]|url\s*\(/i.test(v) &&
					CSS.supports(k, v),
			)
			.map(([k, v]) => `${k}:${v}`)
			.join(";")
	const resolve = (value: string, vars: Record<string, string>): string => {
		let result = value
		for (let i = 0; i < 6 && result.includes("var("); i++)
			result = result.replace(
				/var\((--[\w-]+)(?:,\s*([^()]+))?\)/g,
				(_, name, fallback) => vars[name] || fallback || "",
			)
		return result
	}
	const color = (v: string, vars: Record<string, string>) => {
		let s = resolve(v || "", vars).trim()
		if (/^\d+(?:\.\d+)?(?:\s*,\s*|\s+)\d+(?:\.\d+)?(?:\s*,\s*|\s+)\d+(?:\.\d+)?$/.test(s)) s = `rgb(${s})`
		return !/[;{}]|url\s*\(/i.test(s) && CSS.supports("color", s) ? s : ""
	}
	const getColor = (vars: Record<string, string>, names: string[]) =>
		names.map((n) => color(vars[n] || "", vars)).find(Boolean) || ""
	const swatches = (vars: Record<string, string>) =>
		`<div class="swatches">${Object.entries(vars)
			.map(([name, v]) => {
				const c = color(v, vars)
				return c
					? `<div class="swatch"><i style="${esc(css({ background: c }))}"></i><span>${esc(name.replace(/^--(?:c-|color-)/, ""))}</span><code>${esc(c)}</code></div>`
					: ""
			})
			.join("")}</div>`
	function schemeCard(name: string, vars: Record<string, string>, source: unknown, active: boolean) {
		const bg = getColor(vars, ["--c-background", "--color-background", "--color-base", "--color-off-white"])
		const fg = getColor(vars, ["--c-foreground", "--color-foreground", "--color-fg-primary", "--color-base-content"])
		const button = getColor(vars, [
			"--c-button",
			"--color-button",
			"--color-primary-button-background",
			"--color-primary-base",
			"--color-primary",
		])
		const buttonText = getColor(vars, [
			"--c-button-text",
			"--color-button-text",
			"--color-primary-button-text",
			"--color-primary-content",
		])
		const sample =
			bg && fg
				? `<div class="scheme-sample" style="${esc(css({ background: bg, color: fg }))}"><span class="eyebrow">${active ? "Used on this page" : "Declared scheme"}</span><div class="scheme-title">A closer look.</div><p>Background and foreground together.</p>${button && buttonText ? `<span class="sample-button" style="${esc(css({ background: button, color: buttonText }))}">Shop the collection</span>` : "<small>Button colors not exposed</small>"}</div>`
				: empty("Incomplete semantic colors; inspect the available tokens below.")
		return `<article class="card"><div class="card-head"><h3>${esc(name)}</h3>${active ? '<span class="pill">In use</span>' : ""}</div>${sample}<div class="card-body">${swatches(Object.fromEntries(Object.entries(vars).filter(([k]) => /^(--c-|--color-)(background|foreground|button|button-text|primary-base|primary-content|base|base-content)$/.test(k))))}${inspect("CSS values & source", source)}</div></article>`
	}
	function colorsPanel() {
		const s = state.data.shopify || {}
		const grouped = new Map<string, any>()
		for (const rule of s.colorSchemes || [])
			for (const match of rule.selector.matchAll(/\.color-([\w-]+)/g)) {
				const className = `color-${match[1]}`
				const old = grouped.get(className) || { variables: {}, rules: [] }
				grouped.set(className, { variables: { ...old.variables, ...rule.variables }, rules: [...old.rules, rule] })
			}
		const schemes = [...grouped]
			.map(([name, entry], i) => {
				const rendered = (s.renderedSchemes || []).find((r: any) => r.className === name)
				const uuid = /[0-9a-f]{8}-[0-9a-f]{4}/i.test(name)
				const title = uuid ? `Custom scheme ${i + 1}` : name.replace(/^color-/, "").replaceAll("-", " ")
				return schemeCard(
					title,
					rendered?.variables || entry.variables,
					{ selector: `.${name}`, declared: entry.rules, rendered: rendered || null },
					!!rendered,
				)
			})
			.join("")
		const root = s.rootTokens || {}
		const palette = Object.fromEntries(Object.entries(root).filter(([k]) => /^--(?:color-|c-)/.test(k))) as Record<
			string,
			string
		>
		return section(
			"colors",
			"Shopify color schemes",
			"Each scheme keeps its own background, text and button colors.",
			`<div class="grid two">${schemes || empty("No named Shopify color schemes were exposed. This store uses a root palette instead.")}</div>${Object.keys(palette).length ? `<h3 class="subhead">Root palette</h3><p class="muted">Computed tokens for the scanned page. Kept separate from named schemes.</p>${grouped.size ? "" : schemeCard("Current page palette", palette, { variables: palette }, true)}<details class="inspect"><summary>All palette colors (${Object.keys(palette).length})</summary>${swatches(palette)}</details>` : swatches(state.data.colors || {})}`,
		)
	}
	function logosPanel() {
		const d = state.data
		const found = (d.shopify?.logos || []).map((l: any, i: number) => ({
			...l,
			key: `shopify-logo-${i}`,
			src: l.asset.source,
		}))
		if (d.logo && !found.some((l: any) => l.selected))
			found.unshift({ src: d.logo, alt: "Primary logo", selected: true, key: "logo" })
		const cards = found
			.map(
				(l: any, i: number) =>
					`<article class="card"><div class="card-head"><h3>${esc(l.selected ? "Primary logo" : l.alt || `Logo variant ${i + 1}`)}</h3><span class="pill">${/svg/i.test(l.src) ? "Vector" : "Raster"}</span></div><div class="logo-pair"><div class="logo-stage light"><img src="${esc(safeUrl(l.src, true))}" alt="${esc(l.alt || "Logo on light background")}"><small>Light</small></div><div class="logo-stage dark"><img src="${esc(safeUrl(l.src, true))}" alt="${esc(l.alt || "Logo on dark background")}"><small>Dark</small></div></div><div class="card-body"><div class="actions"><a href="${endpoint("/download")}&image=${esc(l.key)}">Download original</a>${(l.asset?.presets || []).map((p: any) => link(`${p.width}px`, p.url)).join("")}</div><p class="fine">${l.asset ? "Original and preset URLs are inferred; dimensions depend on the source asset." : "Original extracted SVG or image."}</p>${inspect("Asset evidence", l)}</div></article>`,
			)
			.join("")
		return section(
			"logos",
			"Logos",
			"Original artwork, shown unchanged on light and dark surfaces.",
			`<div class="grid two">${cards || empty("No logo found in this capture.")}</div><details class="inspect"><summary>Favicon & social image</summary><div class="grid two">${["favicon", "ogImage"].map((key) => (d.images?.[key] ? `<div class="card card-body"><img class="aux-image" src="${esc(safeUrl(d.images[key], true))}" alt="${key}"><a href="${endpoint("/download")}&image=${key}">Download ${key}</a></div>` : "")).join("")}</div></details>`,
		)
	}
	const fontUrls = (font: any) =>
		[...String(font.src || "").matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => safeUrl(m[1]!)).filter(Boolean)
	const fontLabel = (family: string) => {
		const face = (state.data.shopify?.fontFaces || []).find(
			(f: any) => cleanFamily(f.family).toLowerCase() === cleanFamily(family).toLowerCase(),
		)
		if (!/^brand(?:body|heading|accent)$/i.test(cleanFamily(family)) || !face) return cleanFamily(family)
		const url = fontUrls(face)[0]
		if (!url) return cleanFamily(family)
		let filename = new URL(url).pathname.split("/").pop() || family
		try {
			filename = decodeURIComponent(filename)
		} catch {}
		return filename
			.replace(/\.(woff2?|ttf|otf)$/i, "")
			.replace(/[-_](regular|medium|bold|light|semibold|italic|variable|normal).*$/i, "")
			.replace(/[-_]/g, " ")
			.replace(/\b\w/g, (c) => c.toUpperCase())
	}
	const specimenFamily = (stack: string) =>
		stack
			.split(",")
			.map((f) =>
				state.fontNames.has(cleanFamily(f).toLowerCase())
					? `"${state.fontNames.get(cleanFamily(f).toLowerCase())}"`
					: cleanFamily(f) === "sans-serif"
						? "sans-serif"
						: `"${cleanFamily(f).replaceAll('"', "")}"`,
			)
			.join(",")
	function typePanel() {
		const d = state.data,
			s = d.shopify || {}
		const captured = s.typographyHierarchy || []
		const typography = d.typography || {}
		const hierarchy = captured.length
			? captured
			: Object.entries(typography.fontSizes || {}).map(([role, size]) => ({
					role,
					size,
					family:
						(role === "body" ? typography.fontFamilies?.primary : typography.fontFamilies?.heading) || "sans-serif",
					weight: "400",
					lineHeight: "normal",
					letterSpacing: "normal",
					textTransform: "none",
					source: "Legacy profile; weight and line height are preview defaults",
				}))
		const specimens: Record<string, string> = {
			h1: "The details make the difference.",
			h2: "A closer look at the essentials.",
			h3: "Thoughtfully considered.",
			h4: "Made for the everyday.",
			h5: "The finer details",
			h6: "A little more context",
			body: "Good design starts with the details. A clear hierarchy makes every word easier to read.",
			paragraph: "Good design starts with the details. A clear hierarchy makes every word easier to read.",
			button: "Explore the collection",
			input: "Your email address",
			label: "Email address",
		}
		const rows = hierarchy
			.map((t: any) => {
				const normalized = Number.parseFloat(t.lineHeight) < Number.parseFloat(t.size) * 0.8
				const size = Number.parseFloat(t.size)
				const metrics = `${Number.isFinite(size) ? `${Math.round(size * 10) / 10}px` : t.size} · ${t.weight} weight`
				return `<article class="type-row"><div><span class="eyebrow">${esc(t.role)}</span><h3>${esc(fontLabel(t.family.split(",")[0]))}</h3><p class="fine">${esc(metrics)}</p></div><div class="type-specimen" style="${esc(css({ "font-family": specimenFamily(t.family), "font-size": t.size, "font-weight": String(t.weight), "line-height": normalized ? "1.15" : t.lineHeight, "letter-spacing": t.letterSpacing, "text-transform": t.textTransform }))}">${esc(specimens[t.role] || "The finer details")}</div><div class="type-details">${normalized ? '<p class="fine">Specimen line height adjusted for readability; captured value retained below.</p>' : ""}${inspect("Observed typography", t)}</div></article>`
			})
			.join("")
		const fonts = s.fontFaces || []
		const hierarchyFamilies = new Set<string>(
			hierarchy.flatMap((t: any) => t.family.split(",").map((family: string) => cleanFamily(family).toLowerCase())),
		)
		const observed = fonts.filter(
			(f: any) => f.usedOnPage && hierarchyFamilies.has(cleanFamily(f.family).toLowerCase()),
		)
		const other = fonts.filter((f: any) => !observed.includes(f))
		const fontCards = (faces: any[]) => {
			const groups = new Map<string, any[]>()
			for (const face of faces) {
				const family = cleanFamily(face.family)
				groups.set(family, [...(groups.get(family) || []), face])
			}
			return `<div class="grid two">${[...groups]
				.map(
					([family, entries]) =>
						`<div class="card card-body"><h3>${esc(fontLabel(family))}</h3><p class="fine">CSS family: ${esc(family)}</p><div class="actions">${entries
							.map((f) =>
								fontUrls(f)
									.map((url) => link(`${f.weight || "400"} ${f.style || "normal"}`, url))
									.join(""),
							)
							.join("")}</div>${inspect("Font declarations", entries)}</div>`,
				)
				.join("")}</div>`
		}
		return section(
			"type",
			"Font hierarchy",
			"Neutral specimens using observed sizes, weights and font families. Exact source text stays in the inspectors.",
			`<p class="fine" role="status">${esc(state.fontStatus || "Loading observed font files…")} Alias display names use source filenames.</p><div class="type-list">${rows || empty("This saved result has no hierarchy capture. Re-scan the page to collect it.")}</div><h3 class="subhead">Fonts used by this hierarchy</h3>${fontCards(observed)}<details class="inspect"><summary>Other declared fonts (${other.length})</summary><p class="muted">May include apps, unused weights and experiments. A declaration alone does not establish use.</p>${fontCards(other)}</details>`,
		)
	}
	function kitPanel() {
		const captured = state.data.shopify?.uiKit || []
		const items = captured.length
			? captured
			: Object.entries(state.data.components || {}).map(([name, value]) => {
					const item = value as any
					return {
						kind: name === "input" ? "input" : "button",
						tag: name === "input" ? "input" : "button",
						text: item.text || name,
						contextBackground: state.data.colors?.background,
						source: "Base branding profile",
						styles: {
							"background-color": item.background,
							color: item.textColor,
							"border-color": item.borderColor,
							"border-radius": item.borderRadius,
							"box-shadow": item.shadow,
						},
					}
				})
		const selected: any[] = []
		const used = new Set<any>()
		const take = (label: string, kind: string, rank?: (item: any) => number) => {
			const candidates = items.filter((x: any) => x.kind === kind && !used.has(x))
			if (rank) candidates.sort((a: any, b: any) => rank(b) - rank(a))
			const item = candidates[0]
			if (item) {
				selected.push({ label, item })
				used.add(item)
			}
		}
		const rank = (x: any) =>
			(/shop|discover|explore|buy|start|add to/i.test(x.text) ? 5 : 0) -
			(/play|skip|close|next|previous/i.test(x.text) ? 5 : 0) +
			(x.text ? 1 : 0)
		take("Primary CTA", "button", rank)
		take("Secondary CTA", "button", rank)
		take("Add to cart", "addToCart")
		take("Input", "input")
		take("Product card", "productCard")
		const sample = (label: string, item: any) => {
			const styles = { ...item.styles, "font-family": specimenFamily(item.styles["font-family"] || "sans-serif") }
			const content =
				item.kind === "input"
					? `<input readonly aria-label="Input style sample" placeholder="Your email" style="${esc(css(styles))}">`
					: `<div class="sample-control" style="${esc(css(styles))}">${esc(item.text || label)}</div>`
			return `<article class="card card-body"><h3>${esc(label)}</h3><div class="component-stage" style="${esc(css({ background: item.contextBackground || "" }))}">${content}</div><p class="fine">Source: ${esc(item.tag)} · ${esc(item.kind)}</p>${inspect("Source element & styles", item)}</article>`
		}
		const remaining = items.filter((x: any) => !used.has(x))
		return section(
			"ui-kit",
			"UI kit",
			"Representative storefront styles. CTA labels are preview roles; inspect the source to confirm context.",
			`<div class="grid two">${selected.map((x) => sample(x.label, x.item)).join("") || empty("No ecommerce components captured.")}</div><details class="inspect"><summary>More samples (${remaining.length})</summary><div class="grid two">${remaining.map((item: any) => sample(item.kind, item)).join("")}</div></details>`,
		)
	}
	function detailsPanel() {
		const d = state.data
		return (
			section(
				"store",
				"Store details",
				"Theme metadata and extraction evidence.",
				`${inspect("Theme & platform", { theme: d.shopify?.theme, architecture: d.shopify?.architecture, shop: d.shopify?.shop, evidence: d.shopify?.evidence })}<details class="inspect"><summary>Diagnostics & raw candidates</summary>${inspect("Extraction notes", { limitations: d.shopify?.limitations, inaccessibleStylesheets: d.shopify?.inaccessibleStylesheets, diagnostics: d.diagnostics })}${inspect("All root tokens", d.shopify?.rootTokens)}${inspect("Raw candidates", d.debug || "Re-run with --raw to capture candidates.")}${inspect("Base branding heuristics", { colors: d.colors, typography: d.typography, components: d.components, confidence: d.confidence })}</details>`,
			) +
			section(
				"json",
				"JSON",
				"Full extraction, ready to download or inspect.",
				`<div class="actions"><a download="branding.json" href="${endpoint("/branding.json")}">Download JSON</a><button data-copy="json">Copy JSON</button></div>${inspect("View full JSON", d)}`,
			)
		)
	}
	function render() {
		const d = state.data
		if (!d) return
		document.documentElement.classList.toggle("viewer-dark", state.dark)
		document.title = `${d.brandName || "Branding"} — Ecom Brand Pull`
		const s = d.shopify || {},
			t = s.theme || {}
		app.innerHTML = `<header><div class="shell"><div class="topline"><span class="eyebrow">Ecom Brand Pull</span>${state.profiles.length > 1 ? `<label class="switcher">Store <select id="store-select">${state.profiles.map((p) => `<option value="${p.index}" ${p.index === state.index ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>` : ""}</div><div class="title-row"><div><h1>${esc(d.brandName || "Brand kit")}</h1><p class="muted">${link(d.finalUrl || d.url || "", d.finalUrl || d.url || "")}</p><p class="summary">${esc([s.detected ? "Shopify" : s.status || "Website", t.schemaName, t.version, s.architecture === "theme" ? "Theme storefront" : s.architecture === "headless" ? "Headless storefront" : "Architecture unknown"].filter(Boolean).join(" · "))}</p></div><div class="actions"><a class="primary" download="branding.json" href="${endpoint("/branding.json")}">Download JSON</a><button data-copy="tokens">Copy tokens</button><button id="theme-toggle" aria-label="Toggle preview appearance">${state.dark ? "Light view" : "Dark view"}</button></div></div></div></header><nav aria-label="Brand kit sections"><div class="shell nav-links">${[
			["logos", "Logos"],
			["colors", "Color schemes"],
			["type", "Typography"],
			["ui-kit", "UI kit"],
			["store", "Store details"],
			["json", "JSON"],
		]
			.map(([id, label]) => `<a href="#${id}">${label}</a>`)
			.join(
				"",
			)}</div></nav><main class="shell">${logosPanel() + colorsPanel() + typePanel() + kitPanel() + detailsPanel()}</main><div id="notice" role="status" class="notice" hidden></div>`
		document.getElementById("store-select")?.addEventListener("change", (e) => {
			load(Number((e.target as HTMLSelectElement).value))
			window.scrollTo(0, 0)
		})
		document.getElementById("theme-toggle")?.addEventListener("click", () => {
			state.dark = !state.dark
			render()
		})
		app.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((b) => {
			b.addEventListener("click", () => copy(b.dataset.copy!))
		})
		app.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
			img.addEventListener(
				"error",
				() => {
					img.replaceWith(
						Object.assign(document.createElement("p"), {
							className: "fine",
							textContent: "Image unavailable — use its source link.",
						}),
					)
				},
				{ once: true },
			)
		})
	}
	async function copy(kind: string) {
		const value =
			kind === "json"
				? JSON.stringify(state.data, null, 2)
				: `:root {\n${Object.entries(state.data.shopify?.rootTokens || {})
						.map(([k, v]) => `  ${k}: ${v};`)
						.join("\n")}\n}\n`
		let ok = false
		try {
			if (navigator.clipboard) {
				await navigator.clipboard.writeText(value)
				ok = true
			}
		} catch {}
		if (!ok) {
			const area = document.createElement("textarea")
			area.value = value
			area.style.cssText = "position:fixed;left:-9999px"
			document.body.append(area)
			area.select()
			ok = document.execCommand("copy")
			area.remove()
		}
		const notice = document.getElementById("notice")!
		notice.textContent = ok ? "Copied to clipboard" : "Copy unavailable. Use Download JSON instead."
		notice.hidden = false
		setTimeout(() => {
			notice.hidden = true
		}, 3000)
	}
	async function loadFonts(request: number) {
		const faces = (state.data.shopify?.fontFaces || []).filter((f: any) => f.usedOnPage)
		const names = new Map<string, string>()
		let loaded = 0,
			failed = 0
		await Promise.all(
			faces.map(async (f: any) => {
				const family = cleanFamily(f.family).toLowerCase()
				if (!names.has(family)) names.set(family, `ecom-font-${request}-${names.size}`)
				const urls = fontUrls(f)
				if (!urls.length) return
				try {
					const font = new FontFace(names.get(family)!, urls.map((u) => `url(${JSON.stringify(u)})`).join(","), {
						weight: f.weight || "400",
						style: f.style || "normal",
						display: "swap",
					})
					await Promise.race([
						font.load(),
						new Promise((_, reject) => setTimeout(() => reject(new Error("Font timeout")), 5000)),
					])
					if (state.request === request) document.fonts.add(font)
					loaded++
				} catch {
					failed++
				}
			}),
		)
		if (state.request !== request) return
		state.fontNames = names
		state.fontStatus = `${loaded} font faces loaded${failed ? `; ${failed} unavailable, using fallbacks` : ""}.`
		render()
	}
	async function load(index: number) {
		const request = ++state.request
		state.index = index
		state.fontNames = new Map()
		state.fontStatus = "Loading observed font files…"
		try {
			const response = await fetch(`/branding.json?profile=${index}`)
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			const data = await response.json()
			if (state.request !== request) return
			state.data = data
			history.replaceState(null, "", `?profile=${index}${location.hash}`)
			render()
			void loadFonts(request)
		} catch (e) {
			if (state.request === request)
				app.innerHTML = `<main class="shell"><h1>Could not load this result</h1><p>${esc(e)}</p></main>`
		}
	}
	fetch("/profiles.json")
		.then((r) => {
			if (!r.ok) throw new Error(`HTTP ${r.status}`)
			return r.json()
		})
		.then((profiles) => {
			state.profiles = profiles
			const requested = Number(new URLSearchParams(location.search).get("profile") || 0)
			return load(profiles.some((p: any) => p.index === requested) ? requested : 0)
		})
		.catch((e) => {
			app.innerHTML = `<main class="shell"><h1>Preview unavailable</h1><p>${esc(e)}</p></main>`
		})
}

export function previewHtml() {
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ecom Brand Pull</title><style>
@font-face{font-family:Geist;src:url(https://cdn.jsdelivr.net/npm/geist@1.7.0/dist/fonts/geist-sans/Geist-Variable.woff2);font-display:swap;font-weight:100 900}
*{box-sizing:border-box}html{scroll-padding-top:80px}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 Geist,system-ui,sans-serif}:root{--bg:#fafaf9;--surface:#fff;--text:#20201f;--muted:#6b6b65;--line:#deded8;--soft:#f2f2ee}.viewer-dark{--bg:#171716;--surface:#222220;--text:#f2f2ed;--muted:#b5b5ac;--line:#42423b;--soft:#2d2d28;color-scheme:dark}a{color:inherit;text-underline-offset:3px;overflow-wrap:anywhere}button,select,input{font:inherit}button,select,.actions a{min-height:40px}button,select{color:inherit;background:var(--surface);border:1px solid var(--line);border-radius:7px;padding:8px 12px;cursor:pointer}a:focus-visible,button:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid currentColor;outline-offset:4px}button:hover,.actions a:hover{background:var(--soft)}h1,h2,h3,p{margin:0}h1{font-size:32px;letter-spacing:-1px;line-height:1.2}h2{font-size:23px;letter-spacing:-.5px}h3{font-size:15px;font-weight:600}.shell{max-width:1240px;margin:auto;padding:0 32px}header{background:var(--surface);border-bottom:1px solid var(--line);padding:28px 0}.topline,.title-row,.card-head{display:flex;justify-content:space-between;gap:20px}.topline{align-items:center;margin-bottom:24px}.title-row{align-items:flex-start}.title-row p{margin-top:8px}.eyebrow{font-size:11px;letter-spacing:1.2px;text-transform:uppercase;font-weight:600}.muted,.section-head p{color:var(--muted)}.summary{font-size:12px}.switcher{display:flex;align-items:center;gap:10px;color:var(--muted)}select{max-width:260px}.actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.actions a{display:inline-flex;align-items:center;border:1px solid var(--line);padding:8px 12px;border-radius:7px;text-decoration:none}.actions .primary{background:var(--text);color:var(--surface);border-color:var(--text)}nav{position:sticky;top:0;z-index:5;background:var(--surface);border-bottom:1px solid var(--line)}.nav-links{display:flex;gap:26px;overflow:auto;white-space:nowrap}.nav-links a{padding:17px 0;text-decoration:none;font-size:13px}.nav-links a:hover{text-decoration:underline}section{padding:40px 0;border-bottom:1px solid var(--line);scroll-margin-top:20px}.section-head{margin-bottom:22px}.section-head p{margin-top:5px;font-size:13px}.grid{display:grid;gap:18px}.two{grid-template-columns:repeat(2,minmax(0,1fr))}.card{min-width:0;overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:10px}.card-head{padding:16px 20px;align-items:center}.card-body{padding:20px}.pill{font-size:10px;white-space:nowrap;border:1px solid var(--line);border-radius:20px;padding:3px 8px;color:var(--muted)}.logo-pair{display:grid;grid-template-columns:1fr 1fr}.logo-stage{position:relative;display:flex;align-items:center;justify-content:center;height:160px;padding:30px}.logo-stage.light{background:#f5f5f1;color:#444}.logo-stage.dark{background:#242421;color:#ddd}.logo-stage img{max-width:100%;max-height:90px;object-fit:contain}.logo-stage small{position:absolute;bottom:10px;left:16px;font-size:10px}.fine{color:var(--muted);font-size:11px;line-height:1.6;margin-top:10px}.inspect{margin-top:16px;font-size:12px}.inspect>summary{cursor:pointer;padding:8px 0;color:var(--muted);overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:480px;overflow:auto;background:var(--soft);padding:16px;border-radius:6px;font:11px/1.6 ui-monospace,monospace}code{font:10px/1.4 ui-monospace,monospace}.swatches{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:12px}.swatch{display:flex;flex-direction:column;gap:5px;min-width:0;font-size:10px;overflow-wrap:anywhere}.swatch i{display:block;height:34px;border:1px solid #8885;border-radius:5px}.swatch code{color:var(--muted)}.scheme-sample{padding:28px;min-height:220px}.scheme-title{font-size:30px;letter-spacing:-1px;font-weight:500;margin:15px 0 5px}.scheme-sample p{font-size:13px}.sample-button{display:inline-block;padding:11px 16px;border-radius:5px;margin-top:22px;font-size:12px}.subhead{margin:30px 0 10px}.type-list{margin-top:20px}.type-row{display:grid;grid-template-columns:200px minmax(0,1fr);gap:20px;padding:24px 0;border-bottom:1px solid var(--line)}.type-row h3{margin-top:6px}.type-specimen{overflow-wrap:anywhere;max-height:280px;overflow:auto}.type-details{grid-column:2}.type-details .inspect{margin:0}.type-details pre{max-height:220px}.component-stage{padding:24px;overflow:auto;margin-top:16px;border-radius:6px;border:1px solid var(--line)}.sample-control{display:inline-block;max-width:100%;overflow-wrap:anywhere}.component-stage input{max-width:100%;min-height:44px}.empty{padding:20px;color:var(--muted);font-size:13px;border:1px dashed var(--line);border-radius:8px}.aux-image{display:block;max-width:100%;height:110px;object-fit:contain;margin-bottom:12px}.notice{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--surface);padding:12px 20px;border-radius:8px;z-index:10;max-width:90vw}
@media(max-width:700px){.shell{padding:0 18px}header{padding:20px 0}.title-row{flex-direction:column}.topline{align-items:flex-start}.switcher{flex-direction:column;align-items:flex-start;gap:3px;font-size:11px}select{max-width:185px;font-size:12px}h1{font-size:27px}.two{grid-template-columns:minmax(0,1fr)}.nav-links{gap:22px}.type-row{grid-template-columns:minmax(0,1fr);gap:12px}.type-details{grid-column:1}.type-specimen{max-height:240px}.logo-stage{height:140px;padding:20px}section{padding:30px 0}.actions{gap:6px}.actions a,button{font-size:12px}.scheme-sample{padding:24px}.card-body{padding:16px}}
</style></head><body><div id="app"><main class="shell"><p>Loading brand kit…</p></main></div><script>(${previewApp.toString()})()</script></body></html>`
}
