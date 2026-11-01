import assert from "node:assert/strict";
import { test } from "node:test";
import { CACHE_BYTES, CACHE_ENTRIES, createImageCache } from "../lib/email-image-storage.js";
import { MAX_INLINE_BYTES, MAX_INLINE_IMAGES } from "../lib/inline-images.js";

function counted({ size = 3, fail = () => false } = {}) {
	const loads = [];
	const load = async (accountId, url) => {
		loads.push(`${accountId}:${url}`);
		if (fail(url)) throw new Error(`Can't read ${url}`);
		return { bytes: new Uint8Array(size), contentType: "image/png" };
	};
	return { loads, load };
}

const urls = (count) => Array.from({ length: count }, (_, index) => `https://example.com/${index}.png`);

test("the cache holds every image one email may embed, within a bounded size", () => {
	assert.ok(CACHE_ENTRIES >= MAX_INLINE_IMAGES);
	assert.ok(CACHE_BYTES >= MAX_INLINE_BYTES);
});

test("an email with the most embedded images reads each once across a batch", async () => {
	const { loads, load } = counted();
	const read = createImageCache({ load });
	for (let recipient = 0; recipient < 5; recipient += 1) {
		for (const url of urls(MAX_INLINE_IMAGES)) await read("account", url);
	}
	assert.equal(loads.length, MAX_INLINE_IMAGES);
});

test("a failed read is kept, so an image that stays hosted isn't read again for each recipient", async () => {
	const { loads, load } = counted({ fail: () => true });
	const read = createImageCache({ load });
	for (let recipient = 0; recipient < 3; recipient += 1) await assert.rejects(read("account", "https://example.com/missing.png"), /Can't read/);
	assert.equal(loads.length, 1);
});

test("entries expire, accounts never share one, and the least recently used goes first", async () => {
	let clock = 0;
	const { loads, load } = counted();
	const read = createImageCache({ load, now: () => clock, entries: 2 });
	await read("one", "https://example.com/a.png");
	await read("two", "https://example.com/a.png");
	assert.equal(loads.length, 2, "each account reads its own copy");

	await read("one", "https://example.com/a.png");
	await read("one", "https://example.com/b.png");
	await read("one", "https://example.com/a.png");
	assert.equal(loads.length, 3, "a was used last, so two:a made room for b");

	clock += 61_000;
	await read("one", "https://example.com/a.png");
	assert.equal(loads.length, 4, "an expired entry is read again");
});

test("the byte bound evicts older images but keeps the one just added", async () => {
	const { loads, load } = counted({ size: 10 });
	const read = createImageCache({ load, maxBytes: 25 });
	for (const url of urls(3)) await read("account", url);
	await read("account", urls(3)[2]);
	assert.equal(loads.length, 3, "the newest image stays");
	await read("account", urls(3)[0]);
	assert.equal(loads.length, 4, "the oldest went to stay under the bound");
});
