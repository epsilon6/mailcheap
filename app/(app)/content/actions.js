"use server";
import { revalidatePath } from "next/cache";
import { runDashboardAction, toFormError } from "@/lib/actions/dashboard";

export async function readImageCampaigns(id, cursor) {
	const { output, failure } = await runDashboardAction("list_image_campaigns", { id, ...(cursor && { cursor }) });
	return failure ? toFormError(failure) : output;
}
export async function saveContentImage(input) {
	const { output, failure } = await runDashboardAction("update_content_image", input);
	if (failure) return toFormError(failure);
	revalidatePath("/content");
	return output;
}
