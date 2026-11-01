import HeaderPage from "@/components/HeaderPage";
import ContentLibrary from "@/components/ContentLibrary";
import LinkHelp from "@/components/LinkHelp";
import { runAction } from "@/lib/actions/run-action";
import { requireAccount } from "@/lib/auth";

export const metadata = { title: "Content" };
export default async function ContentPage({ searchParams }) {
	const { account, user } = await requireAccount();
	const params = await searchParams;
	const value = key => typeof params[key] === "string" ? params[key] : "";
	const filters = {
		query: value("q").slice(0, 100), sort: ["newest", "oldest", "name", "largest"].includes(value("sort")) ? value("sort") : "newest",
		folder: value("folder"), type: value("type"),
	};
	const page = Math.min(10000, Math.max(1, Math.floor(Number(value("page")) || 1)));
	const result = await runAction("list_content_images", { account, user, via: "dashboard", input: {
		query: filters.query, sort: filters.sort, page,
		...(filters.folder && { folder: filters.folder === "__unfiled" ? "" : filters.folder.slice(0, 80) }),
		...(["image/png", "image/jpeg", "image/gif", "image/webp"].includes(filters.type) && { type: filters.type }),
	} });
	return <><HeaderPage title="Content"><LinkHelp article="writing" section="content-library">About your image library</LinkHelp></HeaderPage><ContentLibrary data={result} filters={filters} /></>;
}
