import { readFile } from "node:fs/promises";
import path from "node:path";
import { scoped } from "@/lib/account-scope";
import { getCurrentAccount } from "@/lib/auth";
import Upload from "@/models/Upload";

// Development images are visible only to their account, through the signed-in dashboard.
export async function GET(request, { params }) {
	if (process.env.NODE_ENV !== "development" || !process.env.DEV_IMAGE_STORAGE_DIR) return new Response(null, { status: 404 });
	const { name } = await params;
	if (!/^[0-9a-f-]{36}\.(png|jpe?g|gif|webp)$/.test(name)) return new Response(null, { status: 404 });
	const current = await getCurrentAccount();
	if (!current) return new Response(null, { status: 401 });
	const upload = await Upload.findOne(scoped(current.account, { pathname: `dev-images/${name}` })).lean();
	if (!upload) return new Response(null, { status: 404 });
	try {
		const bytes = await readFile(path.join(process.env.DEV_IMAGE_STORAGE_DIR, name));
		return new Response(bytes, { headers: { "Content-Type": upload.contentType, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
	} catch (error) {
		if (error.code === "ENOENT") return new Response(null, { status: 404 });
		throw error;
	}
}
