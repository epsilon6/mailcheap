import { open } from "node:fs/promises";
import path from "node:path";
import { detectImageType } from "@/lib/image-files";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-image";
// Immutable, unguessable URLs intentionally serve newsletter assets without a dashboard session.
export async function GET(request, { params }) {
	if (!process.env.IMAGE_STORAGE_DIR) return new Response(null, { status: 404 });
	const { name } = await params;
	if (!/^[0-9a-f-]{36}\.(png|jpe?g|gif|webp)$/.test(name)) return new Response(null, { status: 404 });
	let file;
	try {
		file = await open(path.join(process.env.IMAGE_STORAGE_DIR, name), "r");
		const stat = await file.stat();
		if (!stat.isFile() || stat.size > MAX_UPLOAD_BYTES) return new Response(null, { status: 404 });
		const bytes = await file.readFile();
		const type = detectImageType(bytes);
		if (!type) return new Response(null, { status: 404 });
		return new Response(bytes, { headers: { "Content-Type": type.contentType, "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=31536000, immutable", "Access-Control-Allow-Origin": "*" } });
	} catch (error) { if (error.code === "ENOENT") return new Response(null, { status: 404 }); throw error; }
	finally { await file?.close(); }
}
