import "server-only";
import sharp from "sharp";
import { videoProvider } from "@/lib/video-blocks";
import { fetchRemoteImage } from "@/lib/remote-image";
import { readEmailImage } from "@/lib/email-image-storage";
import { detectImageType } from "@/lib/image-files";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-image";

export async function videoThumbnail({ accountId, video, download = fetchRemoteImage, readOwned = readEmailImage }) {
	const provider = videoProvider(video.url);
	if (!provider.href) throw new Error("Use an https:// video URL");
	let bytes, title = "";
	if (video.thumbnailUrl) {
		try { const owned = await readOwned(accountId, video.thumbnailUrl); bytes = owned.bytes; }
		catch { throw new Error("Choose a source thumbnail from this account’s image library"); }
	} else {
		if (!provider.endpoint) throw new Error("Upload a custom thumbnail for this video website");
		try {
			const data = await download(provider.endpoint, { maxBytes: 64 * 1024 });
			const metadata = JSON.parse(new TextDecoder().decode(data));
			const thumbnail = metadata.thumbnail_url;
			if (typeof thumbnail !== "string" || !/^https:\/\//i.test(thumbnail) || thumbnail.length > 2000) throw new Error("No thumbnail");
			bytes = await download(thumbnail, { maxBytes: MAX_UPLOAD_BYTES });
			title = typeof metadata.title === "string" ? metadata.title.slice(0, 200) : "";
		} catch { throw new Error("Automatic thumbnail unavailable. Upload a custom thumbnail instead."); }
	}
	if (!detectImageType(bytes) || bytes.length > MAX_UPLOAD_BYTES) throw new Error("Use a PNG, JPEG, GIF or WebP thumbnail under 4 MB");
	return { bytes: await makeVideoPoster(bytes, video), title };
}
export async function makeVideoPoster(bytes, { showPlay = true, playColor = "#18181b" } = {}) {
	const normalized = await sharp(Buffer.from(bytes), { limitInputPixels: 32_000_000, animated: false }).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).png().toBuffer();
	if (!showPlay) return new Uint8Array(normalized);
	const { width, height } = await sharp(normalized).metadata();
	if (width < 32 || height < 32) throw new Error("Use a thumbnail at least 32 pixels wide and tall");
	const size = Math.max(8, Math.min(96, Math.floor(Math.min(width, height) * 0.25)));
	const fill = /^#[a-f0-9]{6}$/i.test(playColor) ? playColor : "#18181b";
	const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="${fill}" fill-opacity="0.88" stroke="white" stroke-width="2"/><path d="M40 29 L72 50 L40 71 Z" fill="white"/></svg>`);
	return new Uint8Array(await sharp(normalized).composite([{ input: overlay, gravity: "centre" }]).png().toBuffer());
}
