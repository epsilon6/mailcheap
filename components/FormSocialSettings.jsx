"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from "lucide-react";
import { saveSocialSettings } from "@/app/(app)/newsletters/actions";
import { Button } from "@/components/ui/button";
import { defaultSocialCatalog } from "@/lib/social-blocks";
import { uploadImageFile } from "@/lib/upload-image";
import { toast } from "@/lib/toast";

export default function FormSocialSettings({ newsletter, baseUrl }) {
	const [catalog, setCatalog] = useState(newsletter.socialCatalog ?? defaultSocialCatalog(baseUrl));
	const [delivery, setDelivery] = useState(newsletter.imageDelivery || "hosted");
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(null);
	function update(index, changes) { setCatalog(items => items.map((item, i) => i === index ? { ...item, ...changes } : item)); }
	function move(index, step) { setCatalog(items => { const next = [...items]; [next[index], next[index + step]] = [next[index + step], next[index]]; return next; }); }
	async function upload(index, key, file) {
		if (!file) return;
		setUploading(`${index}:${key}`);
		try { const { url } = await uploadImageFile(file); update(index, { [key]: url }); }
		catch (error) { toast.error(error.message); }
		finally { setUploading(null); }
	}
	async function save(event) {
		event.preventDefault(); setSaving(true);
		try {
			const result = await saveSocialSettings(newsletter._id, { imageDelivery: delivery, socialCatalog: catalog });
			if (result.error) toast.error(result.error); else toast.success("Social and image settings saved");
		} catch { toast.error("Settings were not saved. Try again."); }
		finally { setSaving(false); }
	}
	return <form onSubmit={save} className="space-y-6">
		<section className="rounded-xl border p-5 space-y-3"><h2 className="font-semibold">Image delivery</h2><label className="grid gap-2 text-sm">Default for images and social blocks<select className="rounded-md border bg-background p-2" value={delivery} onChange={event => setDelivery(event.target.value)}><option value="hosted">Hosted images</option><option value="embedded">Embed images in email</option></select></label><p className="text-sm text-muted-foreground">Each image and social block can override this. Embedded copies travel with SES emails; hosted copies remain for editing and web previews. Keep emails small for faster delivery.</p></section>
		<section className="space-y-4"><div><h2 className="font-semibold">Available social networks</h2><p className="text-sm text-muted-foreground">Choose the networks included in new blocks and optional default profile links. Leave a link blank to require it in the campaign. Existing blocks keep their saved icons and links.</p></div>
		{catalog.map((item, index) => <article key={item.id} className="rounded-xl border p-5 space-y-4">
			<div className="flex items-center gap-3"><div className="rounded bg-zinc-200 p-2">{item.icon && <Image src={item.icon} alt="" width={28} height={28} unoptimized />}</div><strong className="flex-1">{item.name || "New network"}</strong><button type="button" aria-label={`Move ${item.name} up`} disabled={index === 0 || uploading !== null} onClick={() => move(index, -1)}><ArrowUp size={16} /></button><button type="button" aria-label={`Move ${item.name} down`} disabled={index === catalog.length - 1 || uploading !== null} onClick={() => move(index, 1)}><ArrowDown size={16} /></button><button type="button" className="text-red-600" disabled={uploading !== null} aria-label={`Remove ${item.name} from catalog`} onClick={() => setCatalog(items => items.filter((_, i) => i !== index))}><Trash2 size={16} /></button></div>
			<div className="grid gap-3 sm:grid-cols-2"><Field label="Network name" value={item.name} onChange={value => update(index, { name: value })} required /><Field label="Default profile URL (optional)" type="url" value={item.defaultUrl} onChange={value => update(index, { defaultUrl: value })} /><Field label="Alt text" value={item.alt} onChange={value => update(index, { alt: value })} /></div>
			<div className="grid gap-3 sm:grid-cols-3">{[["icon", "Color icon"], ["blackIcon", "Black icon (optional)"], ["whiteIcon", "White icon (optional)"]].map(([key, label]) => <label className="grid gap-2 text-xs" key={key}>{label}<span className="flex items-center gap-2 rounded-md border p-2"><Upload size={14} /><input className="min-w-0 w-full text-xs" type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={uploading !== null} onChange={event => upload(index, key, event.target.files?.[0])} /></span>{uploading === `${index}:${key}` && <span>Uploading…</span>}</label>)}</div>
			<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(item.selected)} onChange={event => update(index, { selected: event.target.checked })} />Include in new social blocks</label>
		</article>)}
		<Button type="button" variant="outline" disabled={catalog.length >= 30 || uploading !== null} onClick={() => setCatalog(items => [...items, { id: `custom-${crypto.randomUUID()}`, name: "", icon: "", blackIcon: "", whiteIcon: "", defaultUrl: "", alt: "", selected: true }])}><Plus size={16} />Add a network</Button>
		</section><div className="sticky bottom-3 rounded-xl border bg-background p-4 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Icon replacements use new files so delivered emails keep working.</p><Button disabled={saving || uploading !== null}>{saving ? "Saving…" : "Save settings"}</Button></div>
	</form>;
}
function Field({ label, value, onChange, type = "text", required = false }) { return <label className="grid gap-2 text-xs">{label}<input className="rounded-md border bg-background p-2 text-sm" type={type} value={value || ""} required={required} maxLength={type === "url" ? 2000 : 200} onChange={event => onChange(event.target.value)} /></label>; }
