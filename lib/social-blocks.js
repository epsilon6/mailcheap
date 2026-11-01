export const SOCIAL_NETWORKS = [
	["facebook", "Facebook"], ["instagram", "Instagram"], ["youtube", "YouTube"], ["x", "X"],
	["linkedin", "LinkedIn"], ["tiktok", "TikTok"], ["bluesky", "Bluesky"], ["threads", "Threads"],
	["mastodon", "Mastodon"], ["reddit", "Reddit"], ["pinterest", "Pinterest"], ["discord", "Discord"],
	["telegram", "Telegram"], ["whatsapp", "WhatsApp"],
];
export const IMAGE_DELIVERIES = ["default", "hosted", "embedded"];
export function safeSocialUrl(value) {
	if (typeof value !== "string" || value.length > 2000) return "";
	try {
		const url = new URL(value);
		return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
	} catch { return ""; }
}
const text = (value, max) => String(value ?? "").slice(0, max);
const integer = (value, min, max, fallback) => Number.isInteger(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
export function defaultSocialCatalog(base = "") {
	return SOCIAL_NETWORKS.map(([id, name], index) => ({
		id, name, icon: `${base}/social-icons/${id}-brand-v1.png`,
		blackIcon: `${base}/social-icons/${id}-black-v1.png`, whiteIcon: `${base}/social-icons/${id}-white-v1.png`,
		defaultUrl: "", alt: `Follow us on ${name}`, selected: index < 3,
	}));
}
export function normalizeSocial(value = {}) {
	return {
		align: ["left", "right"].includes(value.align) ? value.align : "center",
		size: integer(value.size, 16, 64, 32), gap: integer(value.gap, 0, 40, 12), padding: integer(value.padding, 0, 100, 12),
		style: ["black", "white"].includes(value.style) ? value.style : "brand",
		delivery: IMAGE_DELIVERIES.includes(value.delivery) ? value.delivery : "default",
		background: /^#[a-f0-9]{6}$/i.test(value.background) ? value.background : "transparent",
		items: (Array.isArray(value.items) ? value.items : []).slice(0, 20).map(item => ({
			id: text(item?.id, 80), name: text(item?.name, 80), alt: text(item?.alt, 200),
			href: safeSocialUrl(item?.href), icon: safeSocialUrl(item?.icon),
			blackIcon: safeSocialUrl(item?.blackIcon), whiteIcon: safeSocialUrl(item?.whiteIcon),
		})),
	};
}
export function newSocialBlock(newsletter, base) {
	const catalog = newsletter?.socialCatalog ?? defaultSocialCatalog(base);
	return normalizeSocial({ items: catalog.filter(item => item.selected).map(item => ({ ...item, href: item.defaultUrl })) });
}
export function encodeSocial(value) { return encodeURIComponent(JSON.stringify(normalizeSocial(value))); }
export function decodeSocial(value) {
	try {
		if (typeof value !== "string" || value.length > 100000) return normalizeSocial();
		return normalizeSocial(JSON.parse(decodeURIComponent(value)));
	} catch { return normalizeSocial(); }
}
export function socialIcon(item, style) { return (style === "black" ? item.blackIcon : style === "white" ? item.whiteIcon : item.icon) || item.icon; }
const escape = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
export function socialHtml(value) {
	const block = normalizeSocial(value);
	const cells = block.items.map((item, index) => {
		const icon = socialIcon(item, block.style);
		const image = icon ? `<img src="${escape(icon)}" alt="${escape(item.alt || item.name)}" width="${block.size}" height="${block.size}" data-image-delivery="${block.delivery}" style="display:block;width:${block.size}px;height:${block.size}px;border:0;outline:none;margin:0;border-radius:0">` : escape(item.name);
		const linked = item.href ? `<a href="${escape(item.href)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">${image}</a>` : image;
		return `<td style="padding:0 ${index === block.items.length - 1 ? 0 : block.gap}px 0 0;border:0;text-align:left;vertical-align:middle">${linked}</td>`;
	}).join("");
	const margin = block.align === "left" ? "0 auto 0 0" : block.align === "right" ? "0 0 0 auto" : "0 auto";
	return `<table role="presentation" style="width:100%;border:0;border-collapse:collapse" width="100%" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td align="${block.align}" style="border:0;text-align:${block.align};padding:${block.padding}px;background-color:${block.background}"><table role="presentation" style="width:auto;border:0;border-collapse:collapse;margin:${margin}" align="${block.align}" cellpadding="0" cellspacing="0" border="0"><tbody><tr>${cells}</tr></tbody></table></td></tr></tbody></table>`;
}
export function expandSocialBlocks(html) {
	return String(html ?? "").replace(/<div\s+data-social="([^"]*)"\s*>[\s\S]*?<\/div>/gi, (_, value) => socialHtml(decodeSocial(value)));
}
export function findSocialProblem(html) {
	for (const match of String(html ?? "").matchAll(/data-social="([^"]*)"/gi)) {
		const block = decodeSocial(match[1]);
		if (!block.items.length || block.items.some(item => !item.href || !item.icon)) return "Add an icon and a destination link to every social network";
	}
	return null;
}
