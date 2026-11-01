import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSocial, encodeSocial, decodeSocial, socialHtml, expandSocialBlocks, findSocialProblem, defaultSocialCatalog, newSocialBlock } from "../lib/social-blocks.js";
import { cleanRichHtml } from "../lib/clean-html.js";
import { renderEmail, findButtonProblem, hasContent } from "../lib/render-email.js";
import { renderIssueBody } from "../lib/archive-content.js";
import { prepareInlineImages, MAX_INLINE_BYTES } from "../lib/inline-images.js";

const item = { id: "example", name: "Example", alt: "Our profile", icon: "https://example.com/icon.png", href: "https://example.com/profile?a=1&b=2" };
const social = { items: [item], align: "right", size: 32, delivery: "embedded" };
const marker = config => `<div data-social="${encodeSocial(config)}"><span>Social links</span></div>`;

test("social blocks round trip through the rich cleaner and render linked icons with safe styles", () => {
	const cleaned = cleanRichHtml(marker(social));
	assert.deepEqual(decodeSocial(cleaned.match(/data-social="([^"]*)"/)[1]), normalizeSocial(social));
	const rendered = renderEmail({ format: "rich", html: cleaned, newsletter: { name: "Example" } });
	assert.match(rendered.html, /href="https:\/\/example.com\/profile\?a=1&amp;b=2"/);
	assert.match(rendered.html, /data-image-delivery="embedded"/);
	assert.match(rendered.html, /alt="Our profile"/);
	assert.doesNotMatch(rendered.html, /data-social=/);
	assert.match(rendered.text, /https:\/\/example.com\/profile/);
	assert.equal(hasContent(marker(social)), true);
});
test("social configuration rejects script URLs and escapes names and alternate text", () => {
	const html = socialHtml({ items: [{ ...item, href: "javascript:alert(1)", icon: "data:image/svg+xml,bad", name: '<script>alert(1)</script>', alt: '\" onerror=\"bad' }], background: "url(bad)", size: 999 });
	assert.doesNotMatch(html, /<script|javascript:|data:image|url\(bad\)/);
	assert.match(html, /&lt;script&gt;/);
	assert.equal(normalizeSocial({ size: 999 }).size, 64);
	assert.equal(decodeSocial("%garbage").items.length, 0);
	assert.equal(decodeSocial("null").items.length, 0);
});
test("missing social destinations hold sending, and existing blocks keep copied defaults", () => {
	const catalog = defaultSocialCatalog("https://example.com");
	const block = newSocialBlock({ socialCatalog: catalog }, "https://example.com");
	assert.ok(findSocialProblem(marker(block)));
	assert.ok(findButtonProblem(marker(block)));
	catalog[0].defaultUrl = "https://example.com/new";
	assert.equal(block.items[0].href, "");
	assert.equal(findSocialProblem(marker(social)), null);
	assert.match(expandSocialBlocks(marker(social)), /align="right"/);
});
test("per-image delivery overrides the default, deduplicates CID parts and leaves tracking external", async () => {
	let reads = 0;
	const source = '<img src="https://example.com/a.png" data-image-delivery="embedded"><img src="https://example.com/a.png" data-image-delivery="embedded"><img src="https://example.com/b.png" data-image-delivery="hosted"><img src="https://example.com/pixel">';
	const original = { html: source, text: "Original text" };
	const email = await prepareInlineImages(original, { delivery: "embedded", readImage: async () => { reads++; return { bytes: new Uint8Array([1, 2, 3]), contentType: "image/png" }; } });
	assert.equal(reads, 1); assert.equal(email.attachments.length, 1);
	assert.equal(email.attachments[0].ContentDisposition, "INLINE");
	assert.equal((email.html.match(/src="cid:/g) || []).length, 2);
	assert.match(email.html, /src="https:\/\/example.com\/b.png"/);
	assert.match(email.html, /src="https:\/\/example.com\/pixel"/);
	assert.doesNotMatch(email.html, /data-image-delivery/);
	assert.equal(original.html, source); assert.equal(email.text, original.text);
});
test("default delivery applies only to marked images and failures never silently fall back", async () => {
	const email = { html: '<img src="https://example.com/a.png" data-image-delivery="default">' };
	const readImage = async () => { throw new Error("Not owned"); };
	assert.equal((await prepareInlineImages(email, { readImage })).attachments, undefined);
	await assert.rejects(prepareInlineImages(email, { delivery: "embedded", readImage }), /Not owned/);
	await assert.rejects(prepareInlineImages(email, { delivery: "embedded", readImage: async () => ({ bytes: new Uint8Array(MAX_INLINE_BYTES + 1), contentType: "image/png" }) }), /8 MB/);
});
test("legacy image blocks retain the delivery override and HTML code blocks still render", () => {
	const stored = cleanRichHtml('<img src="https://example.com/a.png" data-image-delivery="embedded"><div data-html-block="">&lt;p style="color:red"&gt;Custom code&lt;/p&gt;</div>');
	const result = renderEmail({ format: "rich", html: stored });
	assert.match(result.html, /data-image-delivery="embedded"/);
	assert.match(result.html, /Custom code/);
	assert.equal(cleanRichHtml('<img src="https://example.com/a.png" data-image-delivery="bad">').includes("data-image-delivery"), false);
});

test("public archive social blocks keep hosted sources and presentation layout", () => {
	const body = renderIssueBody({ format: "rich", html: marker(social) }).html;
	assert.match(body, /src="https:\/\/example.com\/icon.png"/);
	assert.match(body, /width:auto/);
	assert.match(body, /align="right"/);
	assert.doesNotMatch(body, /src="cid:|data-social=/);
});
