import "server-only";
import * as z from "zod";
import { scoped } from "@/lib/account-scope";
import { defineAction } from "@/lib/actions/define-action";
import { actionError } from "@/lib/actions/errors";
import { afterCursor, dateOutput, encodeCursor } from "@/lib/actions/shared";
import { campaignImageRoles, contentImage, CONTENT_PAGE_SIZE, CONTENT_SORTS, escapeImageSearch, imageCampaignCandidates } from "@/lib/content-images";
import Campaign, { CAMPAIGN_STATUSES } from "@/models/Campaign";
import Upload from "@/models/Upload";

const GROUP = "Images";
const imageId = z.string().regex(/^[a-f0-9]{24}$/i).describe("The uploaded image's ID");
const Image = z.object({
	id: z.string(), url: z.string(), name: z.string(), fileName: z.string(), folder: z.string(),
	contentType: z.string(), bytes: z.number(), width: z.number().nullable(), height: z.number().nullable(), createdAt: dateOutput,
});
async function findImage(account, id) {
	const image = await Upload.findOne(scoped(account, { _id: id })).lean();
	if (!image) throw actionError("not_found", "Image not found");
	return image;
}
export const contentActions = [
	defineAction({
		name: "list_content_images", title: "List content images", group: GROUP,
		description: "Lists this account's uploaded images with names, folders and stored dimensions. Search names and file paths, filter by type or folder, and sort by date, name or size. Existing files stay at their permanent URLs.",
		http: { method: "GET", path: "/content/images" }, readOnly: true, tryWithoutPlan: true,
		input: z.object({
			query: z.string().trim().max(100).optional().describe("Literal text to find in display names, filenames or stored paths"), folder: z.string().trim().max(80).optional().describe("Only this folder; an empty string selects unfiled images; omit for every folder"),
			type: z.enum(["image/png", "image/jpeg", "image/gif", "image/webp"]).optional().describe("Only images of this MIME type"),
			sort: z.enum(["newest", "oldest", "name", "largest"]).optional().describe("Sort order; newest by default"),
			page: z.number().int().min(1).max(10000).optional().describe("One-based page number, 24 images per page"),
		}),
		output: z.object({ images: z.array(Image), total: z.number(), page: z.number(), pageSize: z.number(), folders: z.array(z.string()) }),
		handler: async ({ account, input }) => {
			const conditions = [];
			if (input.query) {
				const pattern = escapeImageSearch(input.query);
				conditions.push({ $or: ["name", "fileName", "pathname"].map(key => ({ [key]: { $regex: pattern, $options: "i" } })) });
			}
			if (input.folder !== undefined) conditions.push(input.folder ? { folder: input.folder } : { $or: [{ folder: "" }, { folder: null }] });
			if (input.type) conditions.push({ contentType: input.type });
			const filter = scoped(account, conditions.length ? { $and: conditions } : {});
			const page = input.page || 1;
			const [images, total, folders] = await Promise.all([
				Upload.find(filter).sort(CONTENT_SORTS[input.sort || "newest"]).skip((page - 1) * CONTENT_PAGE_SIZE).limit(CONTENT_PAGE_SIZE).lean(),
				Upload.countDocuments(filter),
				Upload.distinct("folder", scoped(account, { folder: { $gt: "" } })),
			]);
			return { images: images.map(contentImage), total, page, pageSize: CONTENT_PAGE_SIZE, folders: folders.sort().slice(0, 200) };
		},
	}),
	defineAction({
		name: "update_content_image", title: "Update content image", group: GROUP,
		description: "Changes an uploaded image's display name and folder. Does not rename, replace or delete its file or alter its permanent URL, existing campaigns, image delivery or alt text.",
		http: { method: "PATCH", path: "/content/images/{id}" }, tryWithoutPlan: true,
		input: z.object({ id: imageId, name: z.string().trim().min(1).max(200).describe("New display name; does not change the original filename or URL"), folder: z.string().trim().max(80).optional().describe("Folder label, empty to unfile, or omitted to keep the current folder") }),
		output: z.object({ image: Image }),
		handler: async ({ account, input }) => {
			await findImage(account, input.id);
			const image = await Upload.findOneAndUpdate(scoped(account, { _id: input.id }), { $set: { name: input.name, ...(input.folder !== undefined && { folder: input.folder }) } }, { returnDocument: "after" }).lean();
			if (!image) throw actionError("not_found", "Image not found");
			return { image: contentImage(image) };
		},
	}),
	defineAction({
		name: "list_image_campaigns", title: "List image campaigns", group: GROUP,
		description: "Shows saved campaigns in this account that reference an uploaded image: rich text, Code/HTML, Markdown, Social/Video blocks, video source thumbnails and campaign covers. Does not count recipient opens or clicks. Pages scan at most 100 candidate campaigns; follow nextCursor until null, even if a page has no exact matches.",
		http: { method: "GET", path: "/content/images/{id}/campaigns" }, readOnly: true, tryWithoutPlan: true,
		rateLimit: { limit: 60, window: "1 m" }, limitDashboard: true,
		input: z.object({ id: imageId, cursor: z.string().max(200).optional().describe("nextCursor from the previous usage page; omit for the first page") }),
		output: z.object({ image: Image, campaigns: z.array(z.object({ id: z.string(), subject: z.string(), status: z.enum(CAMPAIGN_STATUSES), createdAt: dateOutput, roles: z.array(z.string()) })), nextCursor: z.string().nullable() }),
		handler: async ({ account, input }) => {
			const image = await findImage(account, input.id);
			const filter = scoped(account, { $and: [imageCampaignCandidates(image.url), ...(input.cursor ? [afterCursor(input.cursor, "createdAt")] : [])] });
			const candidates = await Campaign.find(filter).select("subject status format html markdown thumbnailUrl createdAt").sort({ createdAt: -1, _id: -1 }).limit(101).maxTimeMS(10000).lean();
			const page = candidates.slice(0, 100);
			const campaigns = page.flatMap(campaign => {
				const roles = campaignImageRoles(campaign, image.url);
				return roles.length ? [{ id: String(campaign._id), subject: campaign.subject || "Untitled", status: campaign.status, createdAt: campaign.createdAt.toISOString(), roles }] : [];
			});
			const last = page.at(-1);
			return { image: contentImage(image), campaigns, nextCursor: candidates.length > 100 ? encodeCursor(last.createdAt, last._id) : null };
		},
	}),
];
