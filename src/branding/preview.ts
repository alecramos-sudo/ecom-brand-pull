import { spawn } from "node:child_process"
import { createServer, type Server, type ServerResponse } from "node:http"
import { previewHtml } from "./preview-page"
import type { BrandingProfile } from "./types"

interface PreviewOptions {
	port?: number
	open?: boolean
	compare?: BrandingProfile[]
}

function imageUrl(profile: BrandingProfile, key: string): string | null {
	const images = profile.images ?? {}
	const match = key.match(/^shopify-logo-(\d+)$/)
	if (match) return profile.shopify?.logos[Number(match[1])]?.asset.original ?? null
	if (key === "logo") return profile.logo || images.logo || null
	if (key === "favicon") return images.favicon || null
	if (key === "ogImage") return images.ogImage || null
	return null
}

function slug(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/^https?:\/\//, "")
			.replace(/^www\./, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "brand"
	)
}

function profileSlug(profile: BrandingProfile): string {
	if (profile.brandName) return slug(profile.brandName)
	const url = profile.finalUrl || profile.url
	if (!url) return "brand"
	try {
		return slug(new URL(url).hostname)
	} catch {
		return slug(url)
	}
}

function extensionFor(contentType: string, src: string): string {
	const mime = contentType.toLowerCase().split(";")[0]?.trim()
	if (mime === "image/svg+xml") return "svg"
	if (mime === "image/png") return "png"
	if (mime === "image/jpeg") return "jpg"
	if (mime === "image/webp") return "webp"
	if (mime === "image/gif") return "gif"
	if (mime === "image/x-icon" || mime === "image/vnd.microsoft.icon") return "ico"

	try {
		const ext = new URL(src).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]
		if (ext && !["html", "php", "aspx"].includes(ext.toLowerCase())) return ext.toLowerCase()
	} catch {
		const ext = src.match(/\.([a-z0-9]{2,5})(?:$|[?#])/i)?.[1]
		if (ext) return ext.toLowerCase()
	}
	return "bin"
}

function imageFilename(profile: BrandingProfile, key: string, contentType: string, src: string): string {
	const names: Record<string, string> = {
		logo: "logo",
		favicon: "favicon",
		ogImage: "og-image",
	}
	return `${profileSlug(profile)}-${names[key] ?? slug(key)}.${extensionFor(contentType, src)}`
}

function dataUrlResponse(profile: BrandingProfile, key: string, src: string): Response {
	const comma = src.indexOf(",")
	if (comma === -1) return new Response("Bad data URL", { status: 400 })
	const meta = src.slice("data:".length, comma)
	const contentType = meta.split(";")[0] || "application/octet-stream"
	const payload = src.slice(comma + 1)
	const body = meta.includes(";base64") ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload))
	return new Response(body, {
		headers: {
			"content-type": contentType,
			"content-disposition": `attachment; filename="${imageFilename(profile, key, contentType, src)}"`,
			"cache-control": "no-store",
		},
	})
}

async function downloadImage(profile: BrandingProfile, key: string): Promise<Response> {
	const src = imageUrl(profile, key)
	if (!src) return new Response("Image not found", { status: 404 })
	if (src.startsWith("data:")) return dataUrlResponse(profile, key, src)

	let resolved = src
	try {
		resolved = new URL(src, profile.finalUrl || profile.url).href
	} catch {
		return new Response("Bad image URL", { status: 400 })
	}

	const response = await fetch(resolved, {
		headers: {
			"user-agent": "brandpull-preview/0.1",
		},
	})
	if (!response.ok) return new Response(`Could not fetch image: HTTP ${response.status}`, { status: 502 })

	const contentType = response.headers.get("content-type") || "application/octet-stream"
	return new Response(response.body, {
		headers: {
			"content-type": contentType,
			"content-disposition": `attachment; filename="${imageFilename(profile, key, contentType, resolved)}"`,
			"cache-control": "no-store",
		},
	})
}

async function sendNodeResponse(res: ServerResponse, response: Response): Promise<void> {
	const headers: Record<string, string> = {}
	response.headers.forEach((value, key) => {
		headers[key] = value
	})
	res.writeHead(response.status, headers)
	if (!response.body) {
		res.end()
		return
	}
	res.end(Buffer.from(await response.arrayBuffer()))
}

export function previewResponse(profiles: BrandingProfile[], requestUrl: string): Response | Promise<Response> {
	const url = new URL(requestUrl)
	if (url.pathname === "/profiles.json")
		return Response.json(profiles.map((p, index) => ({ index, name: p.brandName || p.url || `Result ${index + 1}` })))
	const index = Number(url.searchParams.get("profile") ?? 0)
	if (!Number.isInteger(index) || index < 0 || !profiles[index]) return new Response("Unknown profile", { status: 404 })
	const profile = profiles[index]!
	if (url.pathname === "/branding.json") {
		return Response.json(profile, {
			headers: {
				"cache-control": "no-store",
			},
		})
	}
	if (url.pathname === "/download") {
		return downloadImage(profile, url.searchParams.get("image") ?? "")
	}
	if (url.pathname === "/" || url.pathname === "/index.html") {
		return new Response(previewHtml(), {
			headers: {
				"content-type": "text/html; charset=utf-8",
				"cache-control": "no-store",
			},
		})
	}
	return new Response("Not found", { status: 404 })
}

async function listen(server: Server, port: number): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const onError = (error: Error) => {
			server.off("listening", onListening)
			reject(error)
		}
		const onListening = () => {
			server.off("error", onError)
			resolve()
		}
		server.once("error", onError)
		server.once("listening", onListening)
		server.listen(port)
	})
}

async function startServer(
	profiles: BrandingProfile[],
	port: number,
	attempts = 20,
): Promise<{ server: Server; url: string }> {
	for (let offset = 0; offset < attempts; offset++) {
		const candidatePort = port + offset
		const server = createServer(async (request, response) => {
			try {
				const host = request.headers.host || `localhost:${candidatePort}`
				const requestUrl = new URL(request.url || "/", `http://${host}`).href
				await sendNodeResponse(response, await previewResponse(profiles, requestUrl))
			} catch (error) {
				await sendNodeResponse(
					response,
					new Response(error instanceof Error ? error.message : "Preview server error", { status: 500 }),
				)
			}
		})
		try {
			await listen(server, candidatePort)
			return { server, url: `http://localhost:${candidatePort}` }
		} catch (error) {
			server.close()
			if (!isAddressInUse(error) || offset === attempts - 1) throw error
			process.stderr.write(`  Port ${candidatePort} is in use, trying ${candidatePort + 1}...\n`)
		}
	}
	throw new Error("No available preview port found")
}

function isAddressInUse(error: unknown): boolean {
	if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") return true
	const message = error instanceof Error ? error.message : String(error)
	return message.includes("EADDRINUSE") || message.includes("Address already in use")
}

export async function serveBrandingPreview(profile: BrandingProfile, options: PreviewOptions = {}): Promise<void> {
	const { server, url } = await startServer([profile, ...(options.compare ?? [])], options.port ?? 4177)
	const label = options.open === false ? "Preview server running" : "Opening preview"
	process.stderr.write(`  ${label}: ${url}\n`)
	process.stderr.write("  Press Ctrl+C to stop the preview server.\n")

	if (options.open !== false) {
		openBrowser(url)
	}

	await new Promise<void>((resolve) => {
		const stop = () => {
			server.close()
			process.stderr.write("\n  Preview server stopped.\n")
			resolve()
		}
		process.once("SIGINT", stop)
		process.once("SIGTERM", stop)
	})
}

function openBrowser(url: string): void {
	const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open"
	const args = process.platform === "win32" ? ["/c", "start", "", url] : [url]
	const child = spawn(command, args, {
		detached: true,
		stdio: "ignore",
	})
	child.unref()
}
