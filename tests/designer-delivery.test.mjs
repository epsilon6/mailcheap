import assert from "node:assert/strict";
import { test } from "node:test";
import { renderIssueBody } from "../lib/archive-content.js";
import { cleanRichHtml } from "../lib/clean-html.js";
import { EMBED_PROVIDER_PROBLEM, findEmbedProblem } from "../lib/embed-check.js";
import { renderEmail } from "../lib/render-email.js";

process.env.BETTER_AUTH_SECRET = "test-session-secret-with-at-least-32-characters";
process.env.APP_URL = "https://mail.example.com";

const designed = cleanRichHtml(
	'<h2 data-heading-align="center" data-heading-color="#ff0000" data-heading-font="Georgia">Title</h2>' +
		'<p data-heading-color="red;background:url(https://example.com/x)">Plain</p>' +
		'<hr data-divider-color="#00ff00" data-divider-thickness="4">' +
		'<table data-columns="" role="presentation" width="100%"><tbody><tr>' +
		'<td data-column-span="4" width="33%"><p>Left</p></td>' +
		'<td data-column-span="8" width="66%"><img src="https://example.com/a.png" data-size-mode="scale" data-scale="50" data-image-link="https://example.com/go" data-image-new-tab="true" data-image-delivery="embedded" width="600"></td>' +
		"</tr></tbody></table>"
);

test("the website draws headings, dividers, columns and image settings like the email", () => {
	const { html } = renderIssueBody({ format: "rich", html: designed });
	assert.match(html, /<h2 style="text-align:center;font-family:Georgia,'Times New Roman',serif;color:#ff0000">Title<\/h2>/);
	assert.match(html, /<p>Plain<\/p>/, "an invalid style value is dropped");
	assert.match(html, /<hr style="border:0;border-top:4px solid #00ff00;/);
	assert.match(html, /<table data-columns="" role="presentation" width="100%" style="width:100%;table-layout:fixed;border-collapse:collapse">/);
	assert.match(html, /<td width="33\.33+%" style="width:33\.33+%;vertical-align:top;padding:8px">/);
	assert.match(html, /<a href="https:\/\/example\.com\/go" target="_blank" rel="noopener noreferrer"><img src="https:\/\/example\.com\/a\.png"[^>]* style="width:50%" \/><\/a>/);
	assert.doesNotMatch(html, /data-(?:heading|divider|column-span|size-mode|scale|image-link|image-new-tab|image-delivery)/);
	assert.doesNotMatch(html, /url\(/);
});

test("image links on the website stay http(s) only", () => {
	const { html } = renderIssueBody({ format: "rich", html: '<p><img src="https://example.com/a.png" data-image-link="javascript:alert(1)"></p>' });
	assert.doesNotMatch(html, /javascript:|<a /);
});

test("emails give headings a fallback font and keep column widths in range", () => {
	const { html } = renderEmail({ format: "rich", html: designed, newsletter: { name: "Example" } });
	assert.match(html, /font-family:Georgia,'Times New Roman',serif/);
	assert.match(html, /<td width="66\.66+%" style="width:66\.66+%;vertical-align:top;padding:8px">/);
});

const newsletter = { _id: "000000000000000000000001", accountId: "000000000000000000000002", name: "Example", slug: "example", fromEmail: "news@example.com", postalAddress: "1 Example Street", imageDelivery: "embedded" };
const campaign = { format: "rich", subject: "Example", html: '<p><img src="https://example.com/a.png"></p>' };
const image = async () => ({ bytes: new Uint8Array([1, 2, 3]), contentType: "image/png" });

test("a send stops before it starts when an image chosen as embedded can't be read", async () => {
	const readImage = async () => {
		throw new Error("To embed an image, upload it to this account’s image library first");
	};
	const chosen = { ...campaign, html: '<p><img src="https://example.com/a.png" data-image-delivery="embedded"></p>' };
	assert.match(await findEmbedProblem({ campaign: chosen, newsletter, readImage, providerId: "ses" }), /image library/);
	assert.equal(await findEmbedProblem({ campaign: chosen, newsletter, readImage: image, providerId: "ses" }), null);
});

test("switching the newsletter default to embedded never blocks an older issue", async () => {
	const readImage = async () => {
		throw new Error("To embed an image, upload it to this account’s image library first");
	};
	assert.equal(await findEmbedProblem({ campaign, newsletter, readImage, providerId: "ses" }), null);
});

test("hosted delivery reads nothing, and embedding needs a provider that supports it", async () => {
	let reads = 0;
	const counted = async () => {
		reads += 1;
		return image();
	};
	assert.equal(await findEmbedProblem({ campaign, newsletter: { ...newsletter, imageDelivery: "hosted" }, readImage: counted, providerId: "postshiba" }), null);
	assert.equal(reads, 0);
	assert.equal(await findEmbedProblem({ campaign, newsletter, readImage: counted, providerId: "postshiba" }), EMBED_PROVIDER_PROBLEM);
});
