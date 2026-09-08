import type { LogoCandidate } from "./types"

export function shopifyImageOptions(source: string, pageUrl: string) {
	let url: URL
	try {
		url = new URL(source, pageUrl)
	} catch {
		return null
	}
	if (!/^https?:$/.test(url.protocol)) return null
	const shopifyHost = url.hostname === "cdn.shopify.com" || url.hostname.endsWith(".myshopify.com")
	const sameHost = url.hostname === new URL(pageUrl).hostname
	if (!(shopifyHost || (sameHost && url.pathname.startsWith("/cdn/shop/")))) return null
	if (!/\.(?:avif|webp|png|jpe?g|gif|svg)(?:\.(?:webp|avif))?$/i.test(url.pathname)) return null
	const original = new URL(url)
	for (const key of [
		"width",
		"height",
		"crop",
		"crop_left",
		"crop_top",
		"crop_width",
		"crop_height",
		"pad_color",
		"format",
		"quality",
		"scale",
	]) {
		original.searchParams.delete(key)
	}
	// Legacy img_url transforms live in the filename; the version identifies the asset.
	original.pathname = original.pathname.replace(
		/_(?:(?:\d+x\d*|x\d+)|pico|icon|thumb|small|compact|medium|large|grande|original|master)(?:_crop_(?:top|center|bottom|left|right))?(?:@\d+x)?(?=\.(?:progressive\.)?(?:avif|webp|png|jpe?g|gif|svg)(?:\.(?:webp|avif))?$)/i,
		"",
	)
	const vector = /\.svg$/i.test(original.pathname)
	return {
		source: url.href,
		original: original.href,
		vector,
		verified: false,
		presets: vector
			? []
			: [160, 320, 640, 1280, 2560].map((width) => {
					const preset = new URL(original)
					preset.searchParams.set("width", String(width))
					return { width, url: preset.href }
				}),
	}
}

export function collectShopifyLogos(candidates: LogoCandidate[], selected: string | null | undefined, pageUrl: string) {
	const logos: Array<{
		alt: string
		location: string
		selected: boolean
		asset: NonNullable<ReturnType<typeof shopifyImageOptions>>
	}> = []
	const seen = new Set<string>()
	const ordered = [...candidates].sort((a, b) => Number(b.src === selected) - Number(a.src === selected))
	for (const candidate of ordered) {
		if (
			candidate.src !== selected &&
			!(
				candidate.location !== "body" &&
				(candidate.indicators.altMatch || candidate.indicators.srcMatch || candidate.indicators.classMatch)
			)
		)
			continue
		const asset = shopifyImageOptions(candidate.src, pageUrl)
		if (!asset || seen.has(asset.original)) continue
		seen.add(asset.original)
		logos.push({ alt: candidate.alt, location: candidate.location, selected: candidate.src === selected, asset })
	}
	return logos
}
