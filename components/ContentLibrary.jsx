"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Copy, Folder, ImageUp, Images, LayoutGrid, List, Loader2, Search } from "lucide-react";
import { readImageCampaigns, saveContentImage } from "@/app/(app)/content/actions";
import { CHECKERBOARD } from "@/components/DialogImagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDate } from "@/lib/format";
import { safeSocialUrl } from "@/lib/social-blocks";
import { toast } from "@/lib/toast";
import { IMAGE_TYPES, uploadImageFile } from "@/lib/upload-image";
import { cn } from "@/lib/utils";

const FIELD = "h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
function bytes(value) { return value < 1024 * 1024 ? `${Math.round(value / 1024)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`; }
function dimensions(image) { return image.width && image.height ? `${image.width} × ${image.height} px` : "Dimensions unavailable"; }

export default function ContentLibrary({ data, filters }) {
	const router = useRouter();
	const input = useRef(null);
	const uploading = useRef(false);
	const [busy, setBusy] = useState("");
	const [view, setView] = useState("grid");
	const [selected, setSelected] = useState(null);
	const [sizes, setSizes] = useState({});
	const [pending, startTransition] = useTransition();

	function navigate(values) {
		const p = new URLSearchParams();
		const next = { q: filters.query, sort: filters.sort, folder: filters.folder, type: filters.type, ...values };
		for (const [key, value] of Object.entries(next)) if (value) p.set(key, String(value));
		startTransition(() => router.push("/content" + (p.size ? "?" + p.toString() : "")));
	}
	async function upload(files) {
		if (uploading.current || !files.length) return;
		uploading.current = true;
		let done = 0;
		try {
			for (const file of Array.from(files).slice(0, 10)) {
				setBusy(file.name);
				await uploadImageFile(file);
				done++;
			}
			toast.success(`Uploaded ${done} image${done === 1 ? "" : "s"}`);
		} catch (error) { toast.error(error.message); }
		finally {
			uploading.current = false; setBusy(""); if (input.current) input.current.value = "";
			router.refresh();
		}
	}
	function drop(event) {
		if (!event.dataTransfer.types.includes("Files")) return;
		event.preventDefault(); upload(event.dataTransfer.files);
	}

	return (
		<div onPaste={e => { if (e.clipboardData.files.length) { e.preventDefault(); upload(e.clipboardData.files); } }} onDragOver={e => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }} onDrop={drop} className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div><p className="text-sm text-muted-foreground">Your image library</p><p className="mt-1 text-sm">Upload once, reuse in your campaigns, and see where each image appears.</p></div>
				<Button onClick={() => input.current?.click()} disabled={Boolean(busy)}>
					{busy ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />} {busy ? "Uploading…" : "Upload images"}
				</Button>
				<input ref={input} type="file" accept={IMAGE_TYPES.join(",")} multiple className="sr-only" aria-label="Upload content images" onChange={e => upload(e.target.files)} />
			</div>
			<div className="rounded-xl border bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">Images are shared across your account’s newsletters. Anyone with an image link can view it. Renaming or filing an image keeps its link and existing emails working. PNG, JPEG, GIF or WebP; up to 10 files at a time.</div>
			<form key={JSON.stringify(filters)} className="flex flex-wrap items-center gap-2" onSubmit={e => { e.preventDefault(); navigate({ q: new FormData(e.currentTarget).get("q"), page: "" }); }}>
				<div className="relative min-w-52 flex-1"><Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" /><Input name="q" aria-label="Search images" placeholder="Search image names…" defaultValue={filters.query} maxLength={100} className="pl-9" /></div>
				<Button variant="outline" type="submit">Search</Button>
				<select className={FIELD} aria-label="Filter by folder" value={filters.folder} onChange={e => navigate({ folder: e.target.value, page: "" })}>
					<option value="">All folders</option><option value="__unfiled">Unfiled</option>
					{data.folders.map(folder => <option key={folder} value={folder}>{folder}</option>)}
				</select>
				<select className={FIELD} aria-label="Filter by image type" value={filters.type} onChange={e => navigate({ type: e.target.value, page: "" })}>
					<option value="">All image types</option><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/gif">GIF</option><option value="image/webp">WebP</option>
				</select>
				<select className={FIELD} aria-label="Sort images" value={filters.sort} onChange={e => navigate({ sort: e.target.value, page: "" })}>
					<option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name</option><option value="largest">Largest first</option>
				</select>
			</form>
			<div className="flex items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground" aria-live="polite">{pending ? "Loading…" : `${data.total} image${data.total === 1 ? "" : "s"}`}{busy && ` · Uploading ${busy}`}</p>
				<div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
					<Button type="button" size="icon-sm" variant={view === "grid" ? "secondary" : "ghost"} aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}><LayoutGrid className="size-4" /></Button>
					<Button type="button" size="icon-sm" variant={view === "list" ? "secondary" : "ghost"} aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><List className="size-4" /></Button>
				</div>
			</div>
			{data.images.length ? (
				<div className={cn(pending && "opacity-50", view === "grid" ? "grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4" : "divide-y overflow-hidden rounded-xl border")}>
					{data.images.map(image => (
						<button key={image.id} type="button" onClick={() => setSelected({ ...image, ...sizes[image.id] })} aria-label={`View details for ${image.name}`}
							className={cn("group min-w-0 text-left outline-none transition hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50", view === "grid" ? "overflow-hidden rounded-xl border bg-card" : "flex w-full items-center gap-4 bg-card p-4 hover:bg-muted/30")}>
							<div style={CHECKERBOARD} className={cn("relative shrink-0 overflow-hidden", view === "grid" ? "aspect-[4/3] w-full border-b" : "size-16 rounded-lg border")}>
								<Image src={image.url} alt="" fill unoptimized sizes={view === "grid" ? "280px" : "64px"} onLoad={e => { if (!image.width && e.currentTarget.naturalWidth) setSizes(current => ({ ...current, [image.id]: { width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight } })); }} className="object-contain p-3 transition-transform duration-200 group-hover:scale-[1.03]" />
							</div>
							<div className={cn("min-w-0 flex-1", view === "grid" && "p-4")}>
								<p className="truncate text-sm font-medium" title={image.name}>{image.name}</p>
								<p className="mt-1 text-xs text-muted-foreground">{dimensions({ ...image, ...sizes[image.id] })} · {bytes(image.bytes)}</p>
								<div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span className="truncate">{image.folder ? <><Folder className="mr-1 inline size-3" />{image.folder}</> : "Unfiled"}</span><span className="shrink-0">{formatDate(image.createdAt)}</span></div>
							</div>
							{view === "list" && <span className="text-xs text-muted-foreground max-sm:hidden">Details & campaign usage <ArrowRight className="ml-1 inline size-3" /></span>}
						</button>
					))}
				</div>
			) : <div className="grid min-h-64 place-items-center rounded-xl border border-dashed p-8 text-center"><div><Images className="mx-auto mb-3 size-8 text-muted-foreground" /><h2 className="font-semibold">{data.total ? "No images on this page" : "No images found"}</h2><p className="mt-2 text-sm text-muted-foreground">Upload an image or change your search and filters.</p></div></div>}
			<div className="flex items-center justify-between border-t pt-4">
				<p className="text-xs text-muted-foreground">Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</p>
				<div className="flex gap-2"><Button variant="outline" size="sm" disabled={data.page <= 1 || pending} onClick={() => navigate({ page: data.page - 1 })}><ArrowLeft className="size-3" /> Previous</Button><Button variant="outline" size="sm" disabled={data.page * data.pageSize >= data.total || pending} onClick={() => navigate({ page: data.page + 1 })}>Next <ArrowRight className="size-3" /></Button></div>
			</div>
			<Sheet modal={false} open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}>
				<SheetContent className="w-full gap-0 sm:max-w-md">{selected && <ImageDetails key={selected.id} image={selected} folders={data.folders} onSaved={image => { setSelected(current => ({ ...image, width: image.width || current?.width, height: image.height || current?.height })); router.refresh(); }} />}</SheetContent>
			</Sheet>
		</div>
	);
}
function ImageDetails({ image, folders, onSaved }) {
	const [usage, setUsage] = useState(null);
	const [error, setError] = useState("");
	const [saving, startSaving] = useTransition();
	const [more, startMore] = useTransition();
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		let active = true;
		readImageCampaigns(image.id).then(result => { if (active) result.error ? setError(result.error) : setUsage(result); }).catch(() => { if (active) setError("Could not load campaign usage. Close this panel and try again."); });
		return () => { active = false; };
	}, [image.id]);
	function save(event) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		startSaving(async () => {
			try {
				const result = await saveContentImage({ id: image.id, name: String(data.get("name")), folder: String(data.get("folder")) });
				if (result.error) throw new Error(result.error);
				onSaved(result.image); toast.success("Image details saved");
			} catch (error) { toast.error(error.message); }
		});
	}
	function loadMore() {
		startMore(async () => {
			try {
				const result = await readImageCampaigns(image.id, usage.nextCursor);
				if (result.error) throw new Error(result.error);
				setUsage(current => ({ ...result, campaigns: [...current.campaigns, ...result.campaigns] }));
			} catch (error) { toast.error(error.message); }
		});
	}
	async function copy() {
		try { await navigator.clipboard.writeText(image.url); setCopied(true); }
		catch { toast.error("Could not copy the link"); }
	}
	return <>
		<SheetHeader className="border-b p-5 pr-12"><SheetTitle>Image details</SheetTitle><SheetDescription>Organize this image and see its saved campaigns.</SheetDescription></SheetHeader>
		<div className="space-y-6 p-5">
			<div style={{ ...CHECKERBOARD, aspectRatio: "16 / 9" }} className="relative rounded-xl border"><Image src={image.url} alt={image.name} fill unoptimized sizes="400px" className="object-contain p-4" /></div>
			<div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><span className="text-muted-foreground">Dimensions</span><span>{dimensions(image)}</span><span className="text-muted-foreground">File size</span><span>{bytes(image.bytes)}</span><span className="text-muted-foreground">Uploaded</span><span>{formatDate(image.createdAt)}</span><span className="text-muted-foreground">Original filename</span><span className="break-all">{image.fileName}</span></div>
			<form onSubmit={save} className="space-y-4">
				<label className="block text-xs font-medium">Display name<Input name="name" className="mt-2" defaultValue={image.name} required maxLength={200} /></label>
				<label className="block text-xs font-medium">Folder<Input name="folder" className="mt-2" defaultValue={image.folder} placeholder="Choose or create a folder" list="content-folders" maxLength={80} /></label>
				<datalist id="content-folders">{folders.map(folder => <option key={folder} value={folder} />)}</datalist>
				<Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}Save details</Button>
			</form>
			<div className="flex gap-2"><Button variant="outline" onClick={copy} className="flex-1">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Link copied" : "Copy image link"}</Button>{safeSocialUrl(image.url) && <Button variant="outline" asChild><a href={safeSocialUrl(image.url)} target="_blank" rel="noopener noreferrer">Open image <ArrowUpRight className="size-4" /></a></Button>}</div>
			<section className="border-t pt-5"><h2 className="text-sm font-semibold">Used in campaigns</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">References in saved campaign content, covers and video sources. Unsaved editor changes appear after saving. This is not an open or click report.</p>
				{error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : !usage ? <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Checking campaigns…</p> : <>
					{usage.campaigns.length ? <ul className="mt-4 divide-y rounded-lg border">{usage.campaigns.map(campaign => <li key={campaign.id}><Link className="flex items-start justify-between gap-3 p-3 hover:bg-muted/40" href={`/campaigns/${campaign.id}`}><span className="min-w-0"><span className="block truncate text-sm font-medium">{campaign.subject}</span><span className="mt-1 block text-xs text-muted-foreground">{campaign.roles.join(" · ")}</span></span><span className="rounded-full bg-muted px-2 py-1 text-[10px] capitalize">{campaign.status}</span></Link></li>)}</ul> : <p className="mt-4 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{usage.nextCursor ? "No exact matches in this batch. Continue checking below." : "No saved campaigns reference this image."}</p>}
					{usage.nextCursor && <Button className="mt-3 w-full" variant="outline" disabled={more} onClick={loadMore}>{more && <Loader2 className="size-4 animate-spin" />}Check more campaigns</Button>}
				</>}
			</section>
		</div>
	</>;
}
