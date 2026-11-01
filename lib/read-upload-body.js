// Bound the stream as it arrives, rather than buffering an oversized request before checking it.
export async function readUploadBody(request, maxBytes) {
	if (Number(request.headers.get("content-length")) > maxBytes) throw new RangeError("Upload is too large");
	if (!request.body) return Buffer.alloc(0);
	const reader = request.body.getReader();
	const chunks = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.length;
			if (size > maxBytes) { await reader.cancel(); throw new RangeError("Upload is too large"); }
			chunks.push(value);
		}
		return Buffer.concat(chunks, size);
	} finally { reader.releaseLock(); }
}
