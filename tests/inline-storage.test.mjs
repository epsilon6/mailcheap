import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SESv2Client } from "@aws-sdk/client-sesv2";
import { putImage } from "../lib/image-storage.js";
import { GET } from "../app/api/image-assets/[name]/route.js";
import { readEmailImage } from "../lib/email-image-storage.js";
import Upload from "../models/Upload.js";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const account = "000000000000000000000001";
const other = "000000000000000000000002";
function env(values) {
	const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
	Object.assign(process.env, values);
	return () => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } };
}

test("persistent local images have immutable public URLs while embedding requires account ownership", async () => {
	const dir = await mkdtemp(path.join(os.tmpdir(), "mailcheap-images-"));
	const restore = env({ IMAGE_STORAGE_DIR: dir, APP_URL: "https://example.com" });
	const lookup = mock.method(Upload, "findOne", filter => ({ select() { return this; }, async lean() {
		assert.ok([account, other].includes(String(filter.accountId)));
		assert.equal(filter.url, stored.url);
		return String(filter.accountId) === account && filter.url === stored.url ? { pathname: stored.pathname, contentType: "image/png", bytes: PNG.length } : null;
	} }));
	let stored;
	try {
		stored = await putImage(`accounts/${account}/images/example.png`, PNG, "image/png");
		const second = await putImage(`accounts/${account}/images/example.png`, PNG, "image/png");
		assert.notEqual(stored.url, second.url);
		const name = path.basename(stored.pathname);
		assert.deepEqual(new Uint8Array(await readFile(path.join(dir, name))), PNG);
		const response = await GET(new Request(stored.url), { params: Promise.resolve({ name }) });
		assert.equal(response.status, 200); assert.equal(response.headers.get("content-type"), "image/png");
		assert.match(response.headers.get("cache-control"), /immutable/);
		assert.deepEqual(new Uint8Array(await response.arrayBuffer()), PNG);
		assert.equal((await GET(new Request("https://example.com"), { params: Promise.resolve({ name: "../secret.png" }) })).status, 404);
		assert.equal((await readEmailImage(account, stored.url)).contentType, "image/png");
		await assert.rejects(readEmailImage(other, stored.url), /this account/);
		assert.ok(lookup.mock.calls.some(call => String(call.arguments[0].accountId) === other));
	} finally { lookup.mock.restore(); restore(); await rm(dir, { recursive: true, force: true }); }
});

test("SES receives CID attachments together with tenant, tags and unsubscribe headers", async () => {
	const restore = env({ SENDING_ENABLED: "true", SES_ACCESS_KEY_ID: "dummy", SES_SECRET_ACCESS_KEY: "dummy" });
	let input;
	const send = mock.method(SESv2Client.prototype, "send", async command => { input = command.input; return { MessageId: "test" }; });
	try {
		const { sendSesEmail } = await import("../lib/ses.js");
		const attachment = { RawContent: PNG, ContentDisposition: "INLINE", ContentId: "logo", FileName: "logo.png", ContentType: "image/png", ContentTransferEncoding: "BASE64" };
		await sendSesEmail({ from: "sender@example.com", to: "reader@example.com", subject: "Example", html: '<img src="cid:logo">', text: "Example", headers: { "List-Unsubscribe": "<https://example.com/unsubscribe>" }, tags: [{ name: "kind", value: "test" }], tenantName: "mc-test", configurationSet: "mc-test", attachments: [attachment] });
		assert.deepEqual(input.Content.Simple.Attachments, [attachment]);
		assert.equal(input.TenantName, "mc-test"); assert.equal(input.ConfigurationSetName, "mc-test");
		assert.deepEqual(input.EmailTags, [{ Name: "kind", Value: "test" }]);
		assert.ok(input.Content.Simple.Headers.some(header => header.Name === "List-Unsubscribe"));
	} finally { send.mock.restore(); restore(); }
});
