import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import sharp from "sharp";
import { campaignImageRoles, contentImage, escapeImageSearch, imageCampaignCandidates } from "../lib/content-images.js";
import { encodeVideo } from "../lib/video-blocks.js";
import { encodeSocial } from "../lib/social-blocks.js";
import { escapeHtml } from "../lib/render-email.js";
import { as, signIn, startTestApp } from "./helpers/app.mjs";

const url = "https://images.example.com/photo.png?size=1&v=2";
test("image usage reads encoded blocks, columns and Markdown, with exact parsed URLs", () => {
	const code = `<div data-html-block="">${escapeHtml(`<table><tr><td><img src="${url.replaceAll("&", "&amp;")}"></td></tr></table>`)}</div>`;
	for (const html of [`<table data-columns><tr><td><img src="${url.replaceAll("&", "&amp;")}"></td></tr></table>`, code,
		`<div data-video="${encodeVideo({ url: "https://example.com/video", thumbnail: url })}">Video</div>`,
		`<div data-social="${encodeSocial({ items: [{ icon: url, href: "https://example.com/profile" }] })}">Social</div>`]) {
		assert.deepEqual(campaignImageRoles({ format: "rich", html }, url), ["Email image"]);
	}
	assert.deepEqual(campaignImageRoles({ format: "markdown", markdown: `![Photo](${url})` }, url), ["Email image"]);
	assert.deepEqual(campaignImageRoles({ format: "html", html: `<img src="${url.replaceAll("&", "&amp;")}">`, thumbnailUrl: url }, url), ["Campaign cover", "Email image"]);
	assert.deepEqual(campaignImageRoles({ format: "rich", html: `<p>${url}</p><img src="${url.replaceAll("&", "&amp;")}-other">` }, url), []);
	assert.deepEqual(campaignImageRoles({ format: "rich", html: `<div data-video="${encodeVideo({ url: "https://example.com/watch", thumbnail: "https://example.com/poster.png", sourceThumbnail: url })}"></div>` }, url), ["Video thumbnail source"]);
});
test("legacy records get safe fallback metadata and search punctuation is literal", () => {
	const image = contentImage({ _id: "id", pathname: "images/old.png", url, bytes: 100, contentType: "image/png" });
	assert.equal(image.name, "old.png"); assert.equal(image.width, null); assert.equal(image.folder, "");
	const needle = "a.*[b](c)?$";
	assert.equal(new RegExp(escapeImageSearch(needle)).test(needle), true);
	assert.equal(new RegExp(escapeImageSearch(needle)).test("abbbbbc"), false);
	assert.ok(imageCampaignCandidates(url).$or[1].html.$regex.includes("%3A"));
});
describe("account content library actions", () => {
	let app, account, other, Upload, Campaign, runAction, image, newsletterId, signedIn;
	before(async () => {
		app = await startTestApp();
		const user = await signIn("library@example.com"); signedIn = user; const stranger = await signIn("other-library@example.com");
		const Account = (await import("../models/Account.js")).default;
		account = await Account.findById(user.accountId); other = await Account.findById(stranger.accountId);
		Upload = (await import("../models/Upload.js")).default; Campaign = (await import("../models/Campaign.js")).default;
		({ runAction } = await import("../lib/actions/run-action.js"));
		const Newsletter = (await import("../models/Newsletter.js")).default;
		const newsletter = await Newsletter.create({ accountId: account._id, name: "Sample news", slug: "sample-library", fromEmail: "news@example.com" });
		newsletterId = newsletter._id;
		image = await Upload.create({ accountId: account._id, url, pathname: "images/photo.png", name: "Summer [photo]", fileName: "photo.png", bytes: 500, contentType: "image/png" });
		await Upload.create({ accountId: other._id, url: "https://example.com/private.png", pathname: "other.png", name: "Private", folder: "Private folder", bytes: 100, contentType: "image/png" });
	});
	after(() => app?.stop());
	const call = (name, input, who = account) => runAction(name, { account: who, via: "dashboard", input });
	test("search, folders, ordering and pages stay within the current account", async () => {
		const first = await call("list_content_images", { query: "[photo]" });
		assert.equal(first.total, 1); assert.equal(first.images[0].id, String(image._id)); assert.deepEqual(first.folders, []);
		assert.equal((await call("list_content_images", { query: ".*" })).total, 0);
		await Upload.insertMany(Array.from({ length: 25 }, (_, i) => ({ accountId: account._id, url: `https://example.com/${i}.png`, pathname: `${i}.png`, name: `Asset ${i}`, folder: "Samples", bytes: 1000 + i, contentType: "image/png" })));
		const page1 = await call("list_content_images", { sort: "largest" }); const page2 = await call("list_content_images", { sort: "largest", page: 2 });
		assert.equal(page1.total, 26); assert.equal(page1.images.length, 24); assert.equal(page2.images.length, 2);
		assert.equal(new Set([...page1.images, ...page2.images].map(i => i.id)).size, 26);
		assert.deepEqual(page1.folders, ["Samples"]);
		assert.equal((await call("list_content_images", { folder: "Samples" })).total, 25);
		assert.equal((await call("list_content_images", { folder: "" })).total, 1);
	});
	test("renaming and filing leaves source URLs, original names and campaign content intact", async () => {
		const campaign = await Campaign.create({ accountId: account._id, newsletterId, html: `<img src="${url}">` });
		const result = await call("update_content_image", { id: String(image._id), name: "New display name", folder: "News" });
		assert.equal(result.image.url, url); assert.equal(result.image.fileName, "photo.png");
		assert.equal((await Campaign.findOne({ accountId: account._id, _id: campaign._id })).html, `<img src="${url}">`);
		await assert.rejects(call("update_content_image", { id: String(image._id), name: "Wrong account" }, other), e => e.code === "not_found");
		await assert.rejects(call("list_image_campaigns", { id: String(image._id) }, other), e => e.code === "not_found");
		await assert.rejects(call("update_content_image", { id: { $ne: null }, name: "Bad" }), e => e.code === "validation_failed");
	});
	test("usage excludes other accounts and URL text; includes existing rich, HTML and Markdown campaigns", async () => {
		for (const format of ["rich", "html", "markdown"]) await Campaign.create({ accountId: account._id, newsletterId, subject: format, format, html: `<img src="${url}">`, markdown: `![Photo](${url})` });
		await Campaign.create({ accountId: account._id, newsletterId, subject: "Just text", format: "rich", html: `<p>${url}</p>` });
		await Campaign.create({ accountId: other._id, newsletterId, subject: "Other account", format: "rich", html: `<img src="${url}">` });
		const result = await call("list_image_campaigns", { id: String(image._id) });
		assert.equal(result.campaigns.length, 4);
		assert.ok(result.campaigns.every(c => !["Just text", "Other account"].includes(c.subject)));
		assert.equal(result.nextCursor, null);
		await assert.rejects(call("list_image_campaigns", { id: String(image._id), cursor: "bad" }), e => e.code === "validation_failed");
	});
	test("new uploads record actual dimensions and their supplied filename without changing list_images output", async () => {
		const png = await sharp({ create: { width: 64, height: 32, channels: 3, background: "#abcdef" } }).png().toBuffer();
		const output = await call("upload_image", { base64: png.toString("base64"), fileName: "Sample banner.png" });
		const stored = await Upload.findOne({ accountId: account._id, url: output.url }).lean();
		assert.equal(stored.width, 64); assert.equal(stored.height, 32); assert.equal(stored.fileName, "Sample banner.png");
		const listed = await call("list_images", {});
		assert.deepEqual(Object.keys(listed.images[0]).sort(), ["bytes", "contentType", "createdAt", "id", "url"]);
	});
	test("binary uploads preserve percent-encoded filenames and reject malformed names", async () => {
		const { POST } = await import("../app/api/uploads/route.js");
		const png = await sharp({ create: { width: 80, height: 40, channels: 3, background: "#112233" } }).png().toBuffer();
		const send = name => as(signedIn, () => POST(new Request("http://localhost:3000/api/uploads", { method: "POST", headers: { "content-type": "image/png", "x-original-file-name": name }, body: png })));
		const response = await send(encodeURIComponent("Summer café.png"));
		assert.equal(response.status, 200);
		const body = await response.json();
		const stored = await Upload.findOne({ accountId: account._id, url: body.url }).lean();
		assert.equal(stored.fileName, "Summer café.png");
		assert.equal(stored.width, 80);
		assert.equal((await send("%E0%A4%A")).status, 400);
	});
});
