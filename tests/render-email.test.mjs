import assert from "node:assert/strict";
import { test } from "node:test";
import { getPresendChecks } from "../lib/presend-checks.js";
import { UNSUBSCRIBE_PLACEHOLDER, renderEmail } from "../lib/render-email.js";

const newsletter = { name: "Jane Doe", postalAddress: "1 Main St, Paris" };

test("markdown emails get a footer with the unsubscribe placeholder and address", () => {
	const { html, text, bytes } = renderEmail({
		markdown: "# Hello\n\nA [link](https://example.com).",
		subject: "Hi",
		previewText: "Preview",
		newsletter,
	});
	assert.match(html, /<h1>Hello<\/h1>/);
	assert.ok(html.includes(UNSUBSCRIBE_PLACEHOLDER));
	assert.ok(html.includes("1 Main St, Paris"));
	assert.ok(text.includes("link (https://example.com)"));
	assert.ok(text.includes(`Unsubscribe: ${UNSUBSCRIBE_PLACEHOLDER}`));
	assert.ok(bytes > 0);
});

test("per-recipient unsubscribe URLs replace the placeholder in text", () => {
	const { html, text } = renderEmail({
		markdown: "Hi",
		newsletter,
		unsubscribeUrl: "https://mail.example.com/unsubscribe?token=abc",
	});
	assert.ok(html.includes("https://mail.example.com/unsubscribe?token=abc"));
	assert.ok(!text.includes(UNSUBSCRIBE_PLACEHOLDER));
});

test("HTML emails keep their design and get the footer before </body>", () => {
	const { html } = renderEmail({
		format: "html",
		html: "<html><body><p>Issue</p></body></html>",
		previewText: "This week",
		newsletter,
	});
	assert.match(html, /<body><div style="display:none/);
	assert.ok(html.indexOf(UNSUBSCRIBE_PLACEHOLDER) < html.indexOf("</body>"));
});

test("HTML emails with their own unsubscribe link are not changed", () => {
	const source = `<html><body><a href="${UNSUBSCRIBE_PLACEHOLDER}">Leave</a></body></html>`;
	assert.equal(renderEmail({ format: "html", html: source, newsletter }).html, source);
});

test("web version has no subscriber footer", () => {
	const { html } = renderEmail({ markdown: "Hello", subject: "Hi", newsletter, isWebVersion: true });
	assert.ok(!html.includes(UNSUBSCRIBE_PLACEHOLDER));
	assert.ok(!html.includes("You're receiving this"));
});

test("emails link to their web version at the top, the web version doesn't", () => {
	const webUrl = "https://news.example.com/p/issue-12";
	const markdownEmail = renderEmail({ markdown: "Hello", subject: "Hi", newsletter, webUrl });
	assert.ok(markdownEmail.html.indexOf(`href="${webUrl}"`) < markdownEmail.html.indexOf("Hello"));
	assert.ok(markdownEmail.html.includes(">Read online</a>"));
	assert.ok(markdownEmail.text.startsWith(`Read online: ${webUrl}\n\nHello`));

	const htmlEmail = renderEmail({
		format: "html",
		html: "<html><body><p>Issue</p></body></html>",
		previewText: "This week",
		newsletter,
		webUrl,
	});
	assert.match(htmlEmail.html, /<body><div style="display:none[^]*?<\/div><div[^>]*><a href="https:\/\/news\.example\.com\/p\/issue-12"/);
	assert.ok(htmlEmail.text.startsWith(`Read online (${webUrl})`), "the hidden preview text stays out of the text part");
	assert.ok(!htmlEmail.text.includes("&zwnj;"));

	assert.ok(!renderEmail({ markdown: "Hello", newsletter, webUrl, isWebVersion: true }).html.includes("Read online"));
	assert.ok(!renderEmail({ markdown: "Hello", newsletter }).html.includes("Read online"));
});

test("generated HTML prints the subject and preview text, and email-only parts stay out of the web version", () => {
	const source =
		"<html><head><title>{{subject}}</title></head><body><table>" +
		"<tr data-email-only><td><h1>{{subject}}</h1><p>{{preview_text}}</p></td></tr>" +
		"<tr><td>Body</td></tr></table></body></html>";
	const values = { format: "html", html: source, subject: "Tools & <b>tricks</b>", previewText: "Week 12", newsletter };

	const email = renderEmail(values).html;
	assert.ok(email.includes("<h1>Tools &amp; &lt;b&gt;tricks&lt;/b&gt;</h1><p>Week 12</p>"));
	assert.ok(!email.includes("{{subject}}") && !email.includes("{{preview_text}}"));

	const web = renderEmail({ ...values, isWebVersion: true }).html;
	assert.ok(!web.includes("<h1>"), "the archive page shows the title itself");
	assert.ok(web.includes("<title>Tools &amp; &lt;b&gt;tricks&lt;/b&gt;</title>"));
	assert.ok(web.includes("<td>Body</td>"));
});

test("presend checks block on missing essentials and sending off", () => {
	const campaign = { subject: "", previewText: "", body: "" };
	const rendered = renderEmail({ markdown: "", newsletter: {} });
	const { blocking } = getPresendChecks({
		campaign,
		newsletter: {},
		rendered,
		senderProblem: "example.com isn't verified yet",
		isSendingEnabled: false,
	});
	assert.deepEqual(
		blocking.map(({ id }) => id),
		["subject", "content", "address", "domain", "sending"]
	);
});

test("presend checks pass when everything is ready", () => {
	const campaign = { subject: "Hello", previewText: "Hi", body: "Text", testSentAt: new Date() };
	const rendered = renderEmail({ markdown: campaign.body, newsletter });
	const { checks, blocking } = getPresendChecks({
		campaign,
		newsletter,
		rendered,
		senderProblem: null,
		isSendingEnabled: true,
	});
	assert.equal(blocking.length, 0);
	assert.ok(checks.every(({ isOk }) => isOk));
});


test("designer image settings preserve size, alt text and safe links in email output", () => {
	const { html } = renderEmail({ format: "rich", html: '<img src="https://example.com/image.png" alt="A garden" data-size-mode="scale" data-scale="58" data-image-link="https://example.com/page" data-image-new-tab="true">', subject: "Hello", newsletter });
	assert.match(html, /width:58%/);
	assert.match(html, /alt="A garden"/);
	assert.match(html, /href="https:\/\/example.com\/page" target="_blank" rel="noopener noreferrer"/);
	assert.doesNotMatch(html, /data-image-link=/);
});

test("designer image links reject executable protocols", () => {
	const { html } = renderEmail({ format: "rich", html: '<img src="https://example.com/image.png" data-image-link="javascript:alert(1)" data-size-mode="fill">', subject: "Hello", newsletter });
	assert.doesNotMatch(html, /javascript:/);
	assert.match(html, /width:100%/);
});

test("heading design survives sanitization and renders safe inline email styles", () => {
 const { html } = renderEmail({ format: "rich", html: '<h2 data-heading-align="center" data-heading-size="40" data-heading-color="#123456">Hello</h2>', subject: "Hello", newsletter });
 assert.match(html, /text-align:center/);
 assert.match(html, /font-size:40px/);
 assert.match(html, /color:#123456/);
 assert.doesNotMatch(html, /data-heading-/);
});
test("heading design rejects CSS injection", () => {
 const { html } = renderEmail({ format: "rich", html: '<h2 data-heading-align="center;position:fixed" data-heading-color="url(https://example.com)">Hello</h2>', subject: "Hello", newsletter });
 assert.doesNotMatch(html, /position:fixed|color:url/);
});

test("paragraph controls preserve safe formatting and inline emphasis", () => {
 const { html } = renderEmail({ format: "rich", html: '<p data-heading-align="center" data-heading-size="18" data-heading-padding="12"><strong>Hello</strong> <a href="https://example.com">there</a></p>', subject: "Hello", newsletter });
 assert.match(html, /text-align:center;font-size:18px;padding:12px/);
 assert.match(html, /<strong>Hello<\/strong>/);
 assert.match(html, /href="https:\/\/example.com"/);
 assert.doesNotMatch(html, /data-heading-/);
});

test("divider design preserves line settings and spacing", () => {
 const { html } = renderEmail({ format: "rich", html: '<hr data-divider-color="#123456" data-divider-line="dashed" data-divider-thickness="13" data-divider-left="24">', subject: "Hello", newsletter });
 assert.match(html, /border-top:13px dashed #123456/);
 assert.match(html, /margin:12px 24px 12px 24px/);
 assert.doesNotMatch(html, /data-divider-/);
});


test("column rows render as presentation tables with validated proportional widths", () => {
 const { html } = renderEmail({ format: "rich", html: '<table data-columns=""><tbody><tr><td data-column-span="6"><h2>Left</h2></td><td data-column-span="6"><p>Right</p><img src="https://example.com/test.png" alt="Test"></td></tr></tbody></table>', subject: "Columns", newsletter });
 assert.match(html, /role="presentation"/);
 assert.match(html, /width:50%;vertical-align:top/);
 assert.match(html, /<h2>Left<\/h2>/);
 assert.match(html, /<p>Right<\/p>/);
});
