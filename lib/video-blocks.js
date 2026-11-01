import { IMAGE_DELIVERIES, safeSocialUrl } from "./social-blocks.js";

export const VIDEO_SERVICES = ["YouTube", "TikTok", "Vimeo", "Loom", "Dailymotion", "Wistia", "Twitch", "Facebook", "Instagram", "X", "Other video website"];
const escape = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const number = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Math.round(Number(value)))) : fallback;
const color = (value, fallback) => /^#[a-f0-9]{6}$/i.test(value) ? value : fallback;
export function videoProvider(value) {
	const href = safeSocialUrl(value);
	if (!href) return { name: "Video", href: "", host: "", endpoint: null };
	const url = new URL(href);
	const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
	const base = { href, host, name: "Other video website", endpoint: null };
	if (host === "youtu.be" || ["youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
		const id = host === "youtu.be" ? url.pathname.split("/")[1] : url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
		return { ...base, name: "YouTube", endpoint: /^[\w-]{11}$/.test(id || "") ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}` : null };
	}
	if (host === "vimeo.com" || host === "player.vimeo.com") return { ...base, name: "Vimeo", endpoint: /^\/(?:video\/)?\d+/.test(url.pathname) ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(href)}` : null };
	if (host === "loom.com") return { ...base, name: "Loom", endpoint: /^\/(share|embed)\/[a-f0-9]{32}/i.test(url.pathname) ? `https://www.loom.com/v1/oembed?url=${encodeURIComponent(href)}` : null };
	if (["tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].includes(host)) return { ...base, name: "TikTok", endpoint: `https://www.tiktok.com/oembed?url=${encodeURIComponent(href)}` };
	if (["dailymotion.com", "dai.ly"].includes(host)) return { ...base, name: "Dailymotion", endpoint: `https://www.dailymotion.com/services/oembed?format=json&url=${encodeURIComponent(href)}` };
	if (host === "wistia.com" || host.endsWith(".wistia.com") || host === "wistia.net" || host.endsWith(".wistia.net")) return { ...base, name: "Wistia", endpoint: `https://fast.wistia.com/oembed?format=json&url=${encodeURIComponent(href)}` };
	if (host === "twitch.tv" || host === "clips.twitch.tv") return { ...base, name: "Twitch" };
	if (["facebook.com", "fb.watch"].includes(host)) return { ...base, name: "Facebook" };
	if (host === "instagram.com") return { ...base, name: "Instagram" };
	if (["x.com", "twitter.com"].includes(host)) return { ...base, name: "X" };
	return base;
}
export function normalizeVideo(value = {}) {
	return {
		id: String(value.id || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80),
		url: safeSocialUrl(value.url), thumbnail: safeSocialUrl(value.thumbnail), sourceThumbnail: safeSocialUrl(value.sourceThumbnail),
		thumbnailKind: value.thumbnailKind === "custom" ? "custom" : "automatic",
		title: String(value.title ?? "").slice(0, 200), alt: String(value.alt ?? "").slice(0, 300),
		newTab: value.newTab !== false, responsive: value.responsive !== false, showPlay: value.showPlay !== false,
		playColor: color(value.playColor, "#18181b"), posterPlay: value.posterPlay === true, posterColor: color(value.posterColor, "#18181b"),
		delivery: IMAGE_DELIVERIES.includes(value.delivery) ? value.delivery : "default",
		align: ["left", "right"].includes(value.align) ? value.align : "center",
		width: number(value.width, 10, 100, 100), radius: number(value.radius, 0, 100, 0),
		background: color(value.background, "transparent"), borderColor: color(value.borderColor, "#18181b"),
		borderStyle: ["solid", "dashed", "dotted"].includes(value.borderStyle) ? value.borderStyle : "none",
		borderWidth: number(value.borderWidth, 0, 20, 0),
		top: number(value.top, 0, 100, 12), bottom: number(value.bottom, 0, 100, 12), left: number(value.left, 0, 100, 0), right: number(value.right, 0, 100, 0),
	};
}
export function encodeVideo(value) { return encodeURIComponent(JSON.stringify(normalizeVideo(value))); }
export function decodeVideo(value) {
	try { return typeof value === "string" && value.length <= 30000 ? normalizeVideo(JSON.parse(decodeURIComponent(value))) : normalizeVideo(); }
	catch { return normalizeVideo(); }
}
export function videoHtml(value) {
	const video = normalizeVideo(value);
	const provider = videoProvider(video.url);
	const margin = video.align === "left" ? "0 auto 0 0" : video.align === "right" ? "0 0 0 auto" : "0 auto";
	const alt = video.alt || video.title || `Watch video${provider.href ? ` on ${provider.name}` : ""}`;
	const thumbnail = video.thumbnail
		? `<img src="${escape(video.thumbnail)}" alt="${escape(alt)}"${video.title ? ` title="${escape(video.title)}"` : ""} data-image-delivery="${video.delivery}" width="${Math.round(600 * video.width / 100)}" style="display:block;width:100%;max-width:100%;height:auto;outline:none;margin:0;border:0;border-radius:${video.radius}px">`
		: `<span style="display:block;padding:48px 16px;background:#f4f4f5;color:#52525b;text-align:center">&#9654; ${escape(video.title || "Add a video URL and thumbnail")}</span>`;
	const content = video.url ? `<a href="${escape(video.url)}"${video.newTab ? ' target="_blank" rel="noopener noreferrer"' : ""} style="display:block;text-decoration:none">${thumbnail}</a>` : thumbnail;
	const border = `${video.borderWidth}px ${video.borderStyle} ${video.borderColor}`;
	return `<table role="presentation" width="100%" style="width:100%;border:0;border-collapse:collapse" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td align="${video.align}" style="border:0;padding:${video.top}px ${video.right}px ${video.bottom}px ${video.left}px;text-align:${video.align};background:${video.background}"><table role="presentation" align="${video.align}" width="${video.width}%" style="width:${video.width}%;${video.responsive ? "max-width:600px;" : ""}margin:${margin};border:0;border-collapse:separate"><tbody><tr><td style="padding:0;border:${border};border-radius:${video.radius}px">${content}</td></tr></tbody></table></td></tr></tbody></table>`;
}
export function expandVideoBlocks(html) {
	return String(html ?? "").replace(/<div\s+data-video="([^"]*)"\s*>[\s\S]*?<\/div>/gi, (_, value) => videoHtml(decodeVideo(value)));
}
export function findVideoProblem(html) {
	for (const match of String(html ?? "").matchAll(/data-video="([^"]*)"/gi)) {
		const video = decodeVideo(match[1]);
		if (!video.url || !video.thumbnail) return "Add a video URL and a thumbnail to every video block";
		if (video.showPlay !== video.posterPlay || (video.showPlay && video.playColor !== video.posterColor)) return "Apply thumbnail settings to every video block before sending";
	}
	return null;
}
