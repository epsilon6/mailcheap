import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { scoped } from "@/lib/account-scope";
import { getAppUrl } from "@/lib/config";
import { detectImageType } from "@/lib/image-files";
import { MAX_INLINE_BYTES, MAX_INLINE_IMAGES } from "@/lib/inline-images";
import { fetchRemoteImage } from "@/lib/remote-image";
import { SOCIAL_NETWORKS } from "@/lib/social-blocks";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-image";
import Upload from "@/models/Upload";

// Room for every image one email may embed, so a batch reads each once, and a bound on memory however many campaigns send.
export const CACHE_ENTRIES = MAX_INLINE_IMAGES * 2;
export const CACHE_BYTES = MAX_INLINE_BYTES * 2;
const CACHE_MS = 60_000;
const LOCAL_NAME = /^[0-9a-f-]{36}\.(png|jpe?g|gif|webp)$/;
async function boundedFile(file) {
	const { open } = await import("node:fs/promises");
	const handle = await open(file, "r");
	try {
		const stat = await handle.stat();
		if (!stat.isFile() || stat.size > MAX_UPLOAD_BYTES) throw new Error("Embedded image exceeds 4 MB");
		return await handle.readFile();
	} finally { await handle.close(); }
}
async function loadImage(accountId, url) {
	const parsed = new URL(url);
	const builtin = /^\/social-icons\/([a-z]+)-(brand|black|white)-v1\.png$/.exec(parsed.pathname);
	let bytes;
	if (parsed.origin === new URL(getAppUrl()).origin && !parsed.search && builtin && SOCIAL_NETWORKS.some(([id]) => id === builtin[1])) {
		bytes = await readFile(path.join(process.cwd(), "public", "social-icons", path.basename(parsed.pathname)));
	} else {
		const upload = await Upload.findOne(scoped(accountId, { url })).select({ pathname: 1, contentType: 1, bytes: 1 }).lean();
		if (!upload) throw new Error("To embed an image, upload it to this account’s image library first");
		if (upload.bytes > MAX_UPLOAD_BYTES) throw new Error("Embedded image exceeds 4 MB");
		const [folder, name] = upload.pathname.split("/");
		if (["image-assets", "dev-images"].includes(folder) && LOCAL_NAME.test(name) && upload.pathname === `${folder}/${name}`) {
			const directory = folder === "image-assets" ? process.env.IMAGE_STORAGE_DIR : process.env.DEV_IMAGE_STORAGE_DIR;
			if (!directory) throw new Error("Local image storage is unavailable");
			bytes = await boundedFile(path.join(directory, name));
		} else bytes = await fetchRemoteImage(url, { maxBytes: MAX_UPLOAD_BYTES });
	}
	const type = detectImageType(bytes);
	if (!type || bytes.length > MAX_UPLOAD_BYTES) throw new Error("The embedded file is not a supported image under 4 MB");
	return { bytes: new Uint8Array(bytes), contentType: type.contentType };
}
// Bounded, short-lived, account-keyed caching avoids reading an image for every subscriber. A failed read is kept too:
// an image that only follows the newsletter's default stays hosted when it can't be read, and reading it again for each
// subscriber would cost a lookup or a download apiece. Least recently used goes first, never the image just added.
export function createImageCache({ load, now = Date.now, entries = CACHE_ENTRIES, maxBytes = CACHE_BYTES }) {
	const cached = new Map();
	function trim(added) {
		let bytes = 0;
		for (const entry of cached.values()) bytes += entry.bytes;
		for (const [key, entry] of cached) {
			if (cached.size <= entries && bytes <= maxBytes) break;
			if (entry === added) continue;
			bytes -= entry.bytes;
			cached.delete(key);
		}
	}
	return function read(accountId, url) {
		const key = `${accountId}:${url}`;
		const entry = cached.get(key);
		cached.delete(key);
		if (entry && entry.until > now()) {
			cached.set(key, entry);
			return entry.promise;
		}
		const added = { until: now() + CACHE_MS, bytes: 0 };
		added.promise = load(accountId, url).then((image) => {
			added.bytes = image.bytes.length;
			trim(added);
			return image;
		});
		// Callers handle the failure; the cached copy only has to not be reported as unhandled.
		added.promise.catch(() => {});
		cached.set(key, added);
		trim(added);
		return added.promise;
	};
}

export const readEmailImage = createImageCache({ load: loadImage });
