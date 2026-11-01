"use client";

import { createPortal } from "react-dom";
import { useEditorState } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { ArrowUp, ArrowDown, Copy, Share2, Trash2 } from "lucide-react";
import { INSPECTOR_STYLES } from "@/components/MenuHeading";
import { ALIGNMENTS } from "@/components/MenuImage";
import { deleteBlock } from "@/lib/editor-undo-delete";
import { defaultSocialCatalog, normalizeSocial } from "@/lib/social-blocks";

export default function MenuSocial({ editor, newsletter, visible = true }) {
	const target = useEditorState({ editor, selector: ({ editor: current }) => {
		const { selection } = current.state;
		return selection instanceof NodeSelection && selection.node.type.name === "social" ? { pos: selection.from, config: selection.node.attrs.config } : null;
	} });
	if (!visible || !target) return null;
	const block = normalizeSocial(target.config);
	const catalog = newsletter?.socialCatalog ?? defaultSocialCatalog(window.location.origin);
	function update(changes) { editor.chain().setNodeSelection(target.pos).updateAttributes("social", { config: normalizeSocial({ ...block, ...changes }) }).run(); }
	function itemChange(index, changes) { update({ items: block.items.map((item, i) => i === index ? { ...item, ...changes } : item) }); }
	function move(index, direction) { const items = [...block.items]; [items[index], items[index + direction]] = [items[index + direction], items[index]]; update({ items }); }
	function duplicate() { const node = editor.state.doc.nodeAt(target.pos); editor.chain().focus().insertContentAt(target.pos + node.nodeSize, node.toJSON()).setNodeSelection(target.pos + node.nodeSize).run(); }
	return createPortal(<aside className="heading-inspector" aria-label="Social block settings">
		<style>{INSPECTOR_STYLES}{`.social-inspector-input{width:100%;min-width:0;border:1px solid var(--border);border-radius:7px;padding:8px;background:var(--background);color:var(--foreground);font-size:12px}.social-network-card{padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:12px}.social-network-actions{display:flex;gap:8px;align-items:center;margin-bottom:12px;font-size:12px}.social-network-actions strong{flex:1}.social-hint{font-size:11px;color:var(--muted-foreground);line-height:1.5}`}</style>
		<header className="heading-inspector-header"><div className="heading-inspector-icon"><Share2 size={19} /></div><div><h2>Social</h2><p>Profiles, icons and appearance</p></div></header>
		<div className="heading-inspector-body">
			<section><h3>Networks</h3>{block.items.map((item, index) => <div className="social-network-card" key={`${index}:${item.id}`}>
				<div className="social-network-actions"><strong>{item.name}</strong><button type="button" aria-label={`Move ${item.name} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button><button type="button" aria-label={`Move ${item.name} down`} disabled={index === block.items.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button><button type="button" aria-label={`Remove ${item.name}`} onClick={() => update({ items: block.items.filter((_, i) => i !== index) })}><Trash2 size={14} /></button></div>
				<label className="heading-field"><span>Profile URL (required)</span><input className="social-inspector-input" type="url" key={`${target.pos}:${item.id}:link:${item.href}`} defaultValue={item.href} placeholder="https://" onBlur={event => { if (event.target.value && !/^https:\/\//i.test(event.target.value)) { event.target.setCustomValidity("Use an https:// profile URL"); event.target.reportValidity(); return; } event.target.setCustomValidity(""); itemChange(index, { href: event.target.value }); }} /></label>
				<label className="heading-field"><span>Alt text</span><input className="social-inspector-input" key={`${target.pos}:${item.id}:alt:${item.alt}`} defaultValue={item.alt} maxLength={200} onBlur={event => itemChange(index, { alt: event.target.value })} /></label>
			</div>)}
			<label className="heading-field"><span>Add a network</span><select value="" disabled={block.items.length >= 20} onChange={event => { const item = catalog.find(entry => entry.id === event.target.value); if (item) update({ items: [...block.items, { ...item, href: item.defaultUrl }] }); }}><option value="">Choose a network…</option>{catalog.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><p className="social-hint">Manage available networks and default links in Settings → Social networks and images. Links are required before sending.</p></section>
			<section><h3>Appearance</h3><label className="heading-field"><span>Icon style</span><select value={block.style} onChange={event => update({ style: event.target.value })}><option value="brand">Brand colors</option><option value="black">Black</option><option value="white">White</option></select></label><div className="heading-field-grid">{[["size", "Icon size", 16, 64], ["gap", "Icon spacing", 0, 40], ["padding", "Block padding", 0, 100]].map(([key, label, min, max]) => <label className="heading-field" key={key}><span>{label}</span><div className="heading-number"><input aria-label={label} type="number" min={min} max={max} value={block[key]} onChange={event => update({ [key]: Number(event.target.value) })} /><span>px</span></div></label>)}</div><div className="heading-field"><span>Alignment</span><div className="heading-align" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>{ALIGNMENTS.map(({value,label,icon:Icon}) => <button type="button" key={value} aria-label={label} aria-pressed={block.align === value} onClick={() => update({align:value})}><Icon size={17} /></button>)}</div></div><label className="heading-field"><span>Background</span><div className="flex gap-2"><input aria-label="Social background color" type="color" value={block.background === "transparent" ? "#ffffff" : block.background} onChange={event => update({ background: event.target.value })} /><button type="button" onClick={() => update({ background: "transparent" })}>Clear</button></div></label><p className="social-hint">Custom icons without a black or white variant use their color icon.</p></section>
			<section><h3>Delivery</h3><label className="heading-field"><span>Icons in delivered email</span><select value={block.delivery} onChange={event => update({ delivery: event.target.value })}><option value="default">Newsletter default ({newsletter?.imageDelivery || "hosted"})</option><option value="hosted">Hosted images</option><option value="embedded">Embed in email</option></select></label></section>
		</div><footer className="heading-inspector-footer"><button type="button" onClick={duplicate}><Copy size={15} />Duplicate</button><button type="button" className="heading-delete" onClick={() => deleteBlock(editor,target.pos)}><Trash2 size={15} />Delete</button></footer>
	</aside>, document.body);
}
