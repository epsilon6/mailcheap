import { redirect } from "next/navigation";
import FormSocialSettings from "@/components/FormSocialSettings";
import HeaderPage from "@/components/HeaderPage";
import LayoutNarrow from "@/components/LayoutNarrow";
import { scoped } from "@/lib/account-scope";
import { getAppUrl } from "@/lib/config";
import { ADD_NEWSLETTER_PATH } from "@/lib/newsletters";
import { SETTINGS_PARENT } from "@/lib/newsletter-sections";
import { getSelectedNewsletter } from "@/lib/selected-newsletter";
import { serialize } from "@/lib/serialize";
import Newsletter from "@/models/Newsletter";
export const metadata = { title: "Social networks and images" };
export default async function SocialSettingsPage() {
	const { account, selected } = await getSelectedNewsletter();
	if (!selected) redirect(ADD_NEWSLETTER_PATH);
	const newsletter = await Newsletter.findOne(scoped(account, { _id: selected._id })).select({ socialCatalog: 1, imageDelivery: 1 }).lean();
	return <LayoutNarrow><HeaderPage title="Social networks and images" parent={SETTINGS_PARENT} /><FormSocialSettings newsletter={serialize(newsletter)} baseUrl={getAppUrl()} /></LayoutNarrow>;
}
