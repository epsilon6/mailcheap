import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { readUploadBody } from "../lib/read-upload-body.js";
import { videoProvider, normalizeVideo, encodeVideo, decodeVideo, videoHtml, findVideoProblem } from "../lib/video-blocks.js";
import { videoThumbnail, makeVideoPoster } from "../lib/video-thumbnails.js";
import { cleanRichHtml } from "../lib/clean-html.js";
import { renderEmail, findButtonProblem } from "../lib/render-email.js";
import { renderIssueBody } from "../lib/archive-content.js";
import { prepareInlineImages } from "../lib/inline-images.js";

const video = { id: "test-video", url: "https://www.youtube.com/watch?v=abcdefghijk", thumbnail: "https://example.com/poster.png", title: "An example video", alt: "Watch our example video", showPlay: true, posterPlay: true, delivery: "embedded", width: 75, align: "right" };
const marker = config => `<div data-video="${encodeVideo(config)}"><span>Video</span></div>`;
const png = () => sharp({ create: { width: 400, height: 240, channels: 3, background: "#336699" } }).png().toBuffer();

test("provider recognition covers common URLs and refuses spoofed and unsafe endpoints", () => {
	for (const [url, expected] of [
		["https://youtu.be/abcdefghijk?t=3", "YouTube"], ["https://www.youtube.com/shorts/abcdefghijk", "YouTube"],
		["https://vimeo.com/123456789", "Vimeo"], ["https://www.loom.com/share/0123456789abcdef0123456789abcdef", "Loom"],
		["https://www.tiktok.com/@example/video/123456789", "TikTok"], ["https://dai.ly/x123456", "Dailymotion"],
		["https://example.wistia.com/medias/abc123", "Wistia"], ["https://twitch.tv/example", "Twitch"],
		["https://www.facebook.com/watch/?v=123", "Facebook"], ["https://instagram.com/reel/abc", "Instagram"], ["https://x.com/example/status/123", "X"],
		["https://example.com/video.mp4", "Other video website"],
	]) assert.equal(videoProvider(url).name, expected);
	assert.equal(videoProvider("https://youtube.com.evil.example/watch?v=abcdefghijk").endpoint, null);
	assert.equal(videoProvider("https://example.com/?url=https://youtube.com").endpoint, null);
	assert.equal(videoProvider("javascript:alert(1)").href, "");
	assert.equal(videoProvider("https://user:secret@youtube.com/watch?v=abcdefghijk").href, "");
});
test("video settings round trip through cleaning, preserve links/alt/delivery and render without a player", async () => {
	const cleaned = cleanRichHtml(marker(video));
	assert.deepEqual(decodeVideo(cleaned.match(/data-video="([^"]*)"/)[1]), normalizeVideo(video));
	const email = renderEmail({ format: "rich", html: cleaned });
	assert.match(email.html, /href="https:\/\/www.youtube.com\/watch\?v=abcdefghijk"/);
	assert.match(email.html, /alt="Watch our example video"/);
	assert.match(email.html, /data-image-delivery="embedded"/);
	assert.match(email.html, /width:75%/);
	assert.match(email.html, /align="right"/);
	assert.doesNotMatch(email.html, /<iframe|<video|<script|data-video=/);
	assert.match(email.text, /youtube.com/);
	const attached = await prepareInlineImages(email, { readImage: async () => ({ bytes: new Uint8Array(await png()), contentType: "image/png" }) });
	assert.equal(attached.attachments.length, 1);
	assert.match(attached.html, /src="cid:/);
	const web = renderIssueBody({ format: "rich", html: cleaned }).html;
	assert.match(web, /src="https:\/\/example.com\/poster.png"/);
	assert.doesNotMatch(web, /src="cid:/);
});
test("unsafe video settings are normalized, escaped and held before sending", () => {
	const html = videoHtml({ ...video, url: "javascript:alert(1)", thumbnail: "data:image/svg+xml,bad", title: '<script>bad</script>', background: "url(bad)", borderColor: 'red;position:fixed', borderStyle: 'solid;display:none', width: 999 });
	assert.doesNotMatch(html, /<script|javascript:|data:image|position:fixed|url\(bad\)/);
	assert.match(html, /&lt;script&gt;/);
	assert.equal(normalizeVideo({ width: 999 }).width, 100);
	assert.ok(findVideoProblem(marker({})));
	assert.ok(findButtonProblem(marker({})));
	assert.ok(findVideoProblem(marker({ ...video, showPlay: false })));
	assert.equal(findVideoProblem(marker(video)), null);
	assert.equal(decodeVideo("null").url, "");
});
test("automatic thumbnail import uses provider metadata, downloads only the image and ignores embed HTML", async () => {
	const source = await png(); const requests = [];
	const result = await videoThumbnail({ accountId: "dummy", video: { url: video.url, showPlay: true }, download: async (url, options) => {
		requests.push({ url, maxBytes: options.maxBytes });
		return requests.length === 1 ? new TextEncoder().encode(JSON.stringify({ thumbnail_url: "https://example.com/source.png", title: "Example title", html: '<script>never execute</script>' })) : source;
	} });
	assert.equal(requests.length, 2);
	assert.match(requests[0].url, /^https:\/\/www.youtube.com\/oembed\?/);
	assert.equal(requests[0].maxBytes, 65536);
	assert.equal(result.title, "Example title");
	const output = await sharp(result.bytes).metadata();
	assert.equal(output.format, "png"); assert.equal(output.width, 400);
});
test("custom thumbnails use owned images and missing provider thumbnails have a clear fallback", async () => {
	const source = await png(); let read = false;
	const result = await videoThumbnail({ accountId: "account-a", video: { url: "https://example.com/video", thumbnailUrl: "https://example.com/custom.png", showPlay: false }, readOwned: async (account, url) => { read = true; assert.equal(account, "account-a"); assert.equal(url, "https://example.com/custom.png"); return { bytes: source }; }, download: async () => { throw new Error("Network must not be used"); } });
	assert.equal(read, true); assert.ok(result.bytes.length);
	await assert.rejects(videoThumbnail({ accountId: "b", video: { url: video.url, thumbnailUrl: "https://example.com/private.png" }, readOwned: async () => { throw new Error("unowned"); } }), /this account/);
	await assert.rejects(videoThumbnail({ accountId: "a", video: { url: "https://www.tiktok.com/@example/video/123" }, download: async () => new TextEncoder().encode('{"html":"<iframe>"}') }), /custom thumbnail/);
	await assert.rejects(videoThumbnail({ accountId: "a", video: { url: "https://example.com/video" } }), /custom thumbnail/);
});
test("the play button is baked into the raster and oversized originals are resized", async () => {
	const original = await png();
	const plain = await makeVideoPoster(original, { showPlay: false });
	const overlay = await makeVideoPoster(original, { showPlay: true, playColor: "#ff0000" });
	assert.notDeepEqual(plain, overlay);
	const center = async bytes => sharp(bytes).extract({ left: 195, top: 115, width: 10, height: 10 }).raw().toBuffer();
	assert.notDeepEqual(await center(plain), await center(overlay));
	const large = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: "#000000" } }).png().toBuffer();
	assert.equal((await sharp(await makeVideoPoster(large)).metadata()).width, 1200);
});

test("upload request limits are enforced while streaming even without a length header", async () => {
	const request = new Request("https://example.com/api/uploads", { method: "POST", body: "small" });
	assert.equal((await readUploadBody(request, 8)).toString(), "small");
	const oversized = new Request("https://example.com/api/uploads", { method: "POST", body: "too much data" });
	await assert.rejects(readUploadBody(oversized, 4), RangeError);
	const declared = new Request("https://example.com/api/uploads", { method: "POST", headers: { "content-length": "999" }, body: "x" });
	await assert.rejects(readUploadBody(declared, 4), RangeError);
});
