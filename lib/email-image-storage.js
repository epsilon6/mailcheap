import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { scoped } from "@/lib/account-scope";
import { getAppUrl } from "@/lib/config";
import { detectImageType } from "@/lib/image-files";
import { fetchRemoteImage } from "@/lib/remote-image";
import { SOCIAL_NETWORKS } from "@/lib/social-blocks";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-image";
import Upload from "@/models/Upload";

const cached = new Map();
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
// Bounded, short-lived, account-keyed caching avoids downloading an image for every subscriber.
export function readEmailImage(accountId, url) {
	const key = `${accountId}:${url}`;
	const entry = cached.get(key);
	if (entry && entry.until > Date.now()) return entry.promise;
	if (cached.size >= 24) cached.delete(cached.keys().next().value);
	const promise = loadImage(accountId, url).catch(error => { cached.delete(key); throw error; });
	cached.set(key, { until: Date.now() + 60_000, promise });
	return promise;
}
