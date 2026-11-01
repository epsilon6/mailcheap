"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useEditorState } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { ArrowDown, ArrowUp, Copy, ImagePlus, Loader2, Play, Trash2 } from "lucide-react";
import DialogImagePicker from "@/components/DialogImagePicker";
import ImageFavicon from "@/components/ImageFavicon";
import { INSPECTOR_STYLES } from "@/components/MenuHeading";
import { ALIGNMENTS } from "@/components/MenuImage";
import { deleteBlock } from "@/lib/editor-undo-delete";
import { safeSocialUrl } from "@/lib/social-blocks";
import { normalizeVideo, videoProvider, VIDEO_SERVICES } from "@/lib/video-blocks";

export default function MenuVideo({ editor, newsletter, visible = true }) {
	const target = useEditorState({ editor, selector: ({ editor: current }) => {
		const { selection } = current.state;
		return selection instanceof NodeSelection && selection.node.type.name === "video" ? { pos: selection.from, config: selection.node.attrs.config } : null;
	} });
	if (!visible || !target) return null;
	return <VideoInspector key={target.config.id || target.pos} editor={editor} newsletter={newsletter} target={target} />;
}
function VideoInspector({ editor, newsletter, target }) {
	const block = normalizeVideo(target.config);
	const provider = videoProvider(block.url);
	const [picking, setPicking] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const active = useRef(true);
	useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
	function update(changes) { editor.chain().setNodeSelection(target.pos).updateAttributes("video", { config: normalizeVideo({ ...block, ...changes }) }).run(); }
	async function generate(changes = {}) {
		const desired = normalizeVideo({ ...block, ...changes });
		update(changes); setError("");
		if (!desired.url) { setError("Add the video URL first, then apply thumbnail settings."); return; }
		if (desired.thumbnailKind === "custom" && !desired.sourceThumbnail) { setError("Choose a custom thumbnail first."); return; }
		setBusy(true);
		try {
			const response = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ video: {
				url: desired.url, ...(desired.thumbnailKind === "custom" && { thumbnailUrl: desired.sourceThumbnail }), showPlay: desired.showPlay, playColor: desired.playColor,
			} }) });
			const result = await response.json().catch(() => ({}));
			if (!response.ok || !result.url) throw new Error(result.error || "Thumbnail could not be created. Try a custom image.");
			if (!active.current || editor.isDestroyed) return;
			const current = editor.state.doc.nodeAt(target.pos);
			const config = current?.type.name === "video" ? normalizeVideo(current.attrs.config) : null;
			if (!config || config.id !== desired.id || config.url !== desired.url || config.sourceThumbnail !== desired.sourceThumbnail) return;
			editor.chain().setNodeSelection(target.pos).updateAttributes("video", { config: normalizeVideo({ ...config, thumbnail: result.url, posterPlay: desired.showPlay, posterColor: desired.playColor, title: config.title || result.videoTitle || "" }) }).run();
		} catch (failure) { if (active.current) setError(failure.message); }
		finally { if (active.current) setBusy(false); }
	}
	function chooseImage(image) {
		const changes = { thumbnailKind: "custom", sourceThumbnail: image.url, thumbnail: image.url, posterPlay: false };
		if (block.url) generate(changes); else update(changes);
	}
	function duplicate() {
		const node = editor.state.doc.nodeAt(target.pos);
		editor.chain().focus().insertContentAt(target.pos + node.nodeSize, { type: "video", attrs: { config: { ...block, id: crypto.randomUUID() } } }).setNodeSelection(target.pos + node.nodeSize).run();
	}
	function move(direction) {
		const { doc } = editor.state; const resolved = doc.resolve(target.pos); const neighbor = resolved.index() + direction;
		if (neighbor < 0 || neighbor >= resolved.parent.childCount) return;
		const node = doc.nodeAt(target.pos), sibling = resolved.parent.child(neighbor);
		const from = direction < 0 ? target.pos - sibling.nodeSize : target.pos;
		const to = direction < 0 ? target.pos + node.nodeSize : target.pos + node.nodeSize + sibling.nodeSize;
		editor.chain().focus().insertContentAt({ from, to }, direction < 0 ? [node.toJSON(), sibling.toJSON()] : [sibling.toJSON(), node.toJSON()]).setNodeSelection(direction < 0 ? from : from + sibling.nodeSize).run();
	}
	const resolved = editor.state.doc.resolve(target.pos);
	const pending = block.thumbnail && (block.showPlay !== block.posterPlay || (block.showPlay && block.playColor !== block.posterColor));
	return createPortal(<>
		<aside className="heading-inspector" aria-label="Video settings">
			<style>{INSPECTOR_STYLES}{`.video-input{width:100%;min-width:0;padding:9px;border:1px solid var(--border);border-radius:7px;background:var(--background);color:var(--foreground);font-size:12px}.video-input:focus{outline:2px solid var(--ring);outline-offset:2px}.video-hint{font-size:11px;line-height:1.5;color:var(--muted-foreground)}.video-action{display:flex;justify-content:center;align-items:center;gap:7px;width:100%;padding:9px;border:1px solid var(--border);border-radius:7px;font-size:12px;margin:8px 0}.video-toggle{display:flex;gap:8px;align-items:center;font-size:12px;margin-bottom:12px}.video-preview{background:var(--muted);border-radius:8px;overflow:hidden;margin-bottom:12px}.video-error{font-size:12px;line-height:1.5;color:var(--destructive);margin-top:10px}`}</style>
			<header className="heading-inspector-header"><div className="heading-inspector-icon"><Play size={19} /></div><div><h2>Video</h2><p>Link, thumbnail and appearance</p></div></header>
			<div className="heading-inspector-body">
				<section><h3>Video link</h3><label className="heading-field"><span>Video URL</span><input key={`${target.pos}:${block.url}`} className="video-input" type="url" defaultValue={block.url} placeholder="https://www.youtube.com/watch?v=…" maxLength={2000} onBlur={event => {
					const value = event.target.value.trim(), url = safeSocialUrl(value);
					if (value && !url) { event.target.setCustomValidity("Use an https:// video URL"); event.target.reportValidity(); return; }
					event.target.setCustomValidity(""); setError("");
					update({ url, ...(url !== block.url && block.thumbnailKind === "automatic" && { thumbnail: "" }) });
				}} /></label>
				{provider.host && <div className="flex items-center gap-2 text-xs mb-3"><ImageFavicon domain={provider.host} size={14} /><span>{provider.name}</span></div>}
				<p className="video-hint">{VIDEO_SERVICES.slice(0,-1).join(", ")} and other HTTPS video pages. Readers click the thumbnail to watch on the video website.</p><label className="video-toggle" style={{marginTop:12}}><input type="checkbox" checked={block.newTab} onChange={event => update({newTab:event.target.checked})} />Open video in a new tab</label></section>
				<section><h3>Thumbnail</h3>{block.thumbnail && <div className="video-preview"><Image src={block.thumbnail} alt="Current video thumbnail" width={240} height={135} unoptimized style={{width:"100%",height:"auto"}} /></div>}
				<button type="button" className="video-action" disabled={busy} onClick={() => setPicking(true)}><ImagePlus size={15} />Upload or choose a custom image</button>
				<button type="button" className="video-action" disabled={busy || !provider.endpoint} onClick={() => generate({thumbnailKind:"automatic",sourceThumbnail:""})}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}Get automatic thumbnail</button>
				<p className="video-hint">Automatic thumbnails depend on public provider metadata. Private videos or unavailable providers need a custom image. Generated previews are saved to your image library.</p>
				<label className="heading-field" style={{marginTop:12}}><span>Video title (optional)</span><input key={`${target.pos}:title:${block.title}`} className="video-input" defaultValue={block.title} maxLength={200} onBlur={event => update({title:event.target.value})} /></label>
				<label className="heading-field"><span>Alt text</span><textarea key={`${target.pos}:alt:${block.alt}`} className="video-input" rows={2} defaultValue={block.alt} maxLength={300} placeholder="Describe the video for readers who cannot see its thumbnail" onBlur={event => update({alt:event.target.value})} /></label>
				<label className="video-toggle"><input type="checkbox" checked={block.showPlay} disabled={busy} onChange={event => update({showPlay:event.target.checked})} />Show a play button</label>
				{block.showPlay && <label className="heading-field"><span>Play button color</span><div className="heading-color"><input aria-label="Play button color" type="color" value={block.playColor} disabled={busy} onChange={event => update({playColor:event.target.value})} /><span>{block.playColor.toUpperCase()}</span></div></label>}
				<button type="button" className="video-action" disabled={busy || !block.url || (block.thumbnailKind === "custom" ? !block.sourceThumbnail : !provider.endpoint)} onClick={() => generate()}>{busy ? "Creating thumbnail…" : "Apply thumbnail settings"}</button>
				{pending && <p className="video-hint">Apply thumbnail settings to bake your play button changes into the image before sending.</p>}{error && <p role="alert" className="video-error">{error}</p>}</section>
				<section><h3>Appearance</h3><div className="heading-field"><span>Alignment</span><div className="heading-align" style={{gridTemplateColumns:"repeat(3,1fr)"}}>{ALIGNMENTS.map(({value,label,icon:Icon}) => <button type="button" key={value} aria-label={label} aria-pressed={block.align === value} onClick={() => update({align:value})}><Icon size={17} /></button>)}</div></div>
				<NumberField label="Thumbnail width" value={block.width} min={10} max={100} unit="%" onChange={width=>update({width})} />
				<label className="video-toggle"><input type="checkbox" checked={block.responsive} onChange={event => update({responsive:event.target.checked})} />Limit thumbnail to email width</label>
				<div className="heading-field-grid"><label className="heading-field"><span>Background</span><div className="heading-color"><input aria-label="Video background color" type="color" value={block.background === "transparent" ? "#ffffff" : block.background} onChange={event => update({background:event.target.value})} /></div><button type="button" className="video-hint" onClick={()=>update({background:"transparent"})}>Clear background</button></label><NumberField label="Rounded corners" value={block.radius} max={100} onChange={radius=>update({radius})} /></div>
				<details><summary className="text-xs cursor-pointer mb-3">Border</summary><label className="heading-field"><span>Border style</span><select value={block.borderStyle} onChange={event=>update({borderStyle:event.target.value})}>{["none","solid","dashed","dotted"].map(value=><option key={value}>{value}</option>)}</select></label><div className="heading-field-grid"><NumberField label="Border width" value={block.borderWidth} max={20} onChange={borderWidth=>update({borderWidth})}/><label className="heading-field"><span>Border color</span><div className="heading-color"><input aria-label="Video border color" type="color" value={block.borderColor} onChange={event=>update({borderColor:event.target.value})}/></div></label></div></details></section>
				<section><h3>Spacing</h3><div className="heading-field-grid">{["top","bottom","left","right"].map(key=><NumberField key={key} label={`Padding ${key}`} value={block[key]} max={100} onChange={value=>update({[key]:value})}/>)}</div></section>
				<section><h3>Delivery</h3><label className="heading-field"><span>Thumbnail in delivered email</span><select value={block.delivery} onChange={event=>update({delivery:event.target.value})}><option value="default">Newsletter default ({newsletter?.imageDelivery || "hosted"})</option><option value="hosted">Hosted image</option><option value="embedded">Embed in email</option></select></label><p className="video-hint">Embedding attaches the thumbnail image, not the video. Your stored copy remains for editing and web previews.</p></section>
			</div>
			<footer className="heading-inspector-footer"><button type="button" onClick={duplicate}><Copy size={15}/>Duplicate</button><button type="button" className="heading-delete" onClick={()=>deleteBlock(editor,target.pos)}><Trash2 size={15}/>Delete</button><button type="button" disabled={resolved.index()===0} onClick={()=>move(-1)}><ArrowUp size={15}/>Move up</button><button type="button" disabled={resolved.index()===resolved.parent.childCount-1} onClick={()=>move(1)}><ArrowDown size={15}/>Move down</button></footer>
		</aside>
		<DialogImagePicker open={picking} onOpenChange={setPicking} onSelect={chooseImage} currentUrl={block.sourceThumbnail || block.thumbnail}/>
	</>, document.body);
}
function NumberField({label,value,onChange,min=0,max=100,unit="px"}) { return <label className="heading-field"><span>{label}</span><div className="heading-number"><input aria-label={label} type="number" min={min} max={max} value={value} onChange={event=>onChange(Number(event.target.value))}/><span>{unit}</span></div></label>; }
