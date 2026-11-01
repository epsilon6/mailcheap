"use client";

import { createPortal } from "react-dom";
import { useEditorState } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { AlignCenter, AlignLeft, AlignRight, ImageIcon, Copy, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { INSPECTOR_STYLES } from "@/components/MenuHeading";
import { deleteBlock } from "@/lib/editor-undo-delete";

export default function MenuImage({ editor, visible = true, newsletter }) {
 const target = useEditorState({ editor, selector: ({ editor: current }) => {
  const { selection } = current.state;
  return selection instanceof NodeSelection && selection.node.type.name === "image" ? { pos: selection.from, ...selection.node.attrs } : null;
 }});
 if (!visible || !target) return null;
 function update(attrs) { editor.chain().setNodeSelection(target.pos).updateAttributes("image", attrs).run(); }
 function duplicate() {
  const node = editor.state.doc.nodeAt(target.pos);
  editor.chain().focus().insertContentAt(target.pos + node.nodeSize, node.toJSON()).setNodeSelection(target.pos + node.nodeSize).run();
 }
 function move(direction) {
  const { doc } = editor.state;
  const resolved = doc.resolve(target.pos);
  const index = resolved.index();
  const neighbor = index + direction;
  if (neighbor < 0 || neighbor >= resolved.parent.childCount) return;
  const node = doc.nodeAt(target.pos);
  const sibling = resolved.parent.child(neighbor);
  const from = direction < 0 ? target.pos - sibling.nodeSize : target.pos;
  const to = direction < 0 ? target.pos + node.nodeSize : target.pos + node.nodeSize + sibling.nodeSize;
  editor.chain().focus().insertContentAt({ from, to }, direction < 0 ? [node.toJSON(), sibling.toJSON()] : [sibling.toJSON(), node.toJSON()]).setNodeSelection(direction < 0 ? from : from + sibling.nodeSize).run();
 }
 const resolved = editor.state.doc.resolve(target.pos);
 return createPortal(<aside aria-label="Image settings" className="heading-inspector">
  <style>{INSPECTOR_STYLES}{`.image-inspector-input{width:100%;min-width:0;border:1px solid var(--border);border-radius:7px;padding:9px;background:var(--background);color:var(--foreground);font-size:12px}.image-inspector-input:focus{outline:2px solid var(--ring);outline-offset:2px}.image-inspector-hint{font-size:11px;line-height:1.5;color:var(--muted-foreground)}.image-inspector-modes{display:flex;gap:4px}.image-inspector-modes button{flex:1;padding:8px 4px;border:1px solid var(--border);border-radius:6px;font-size:11px}.image-inspector-modes button[aria-pressed=true]{background:var(--muted);box-shadow:inset 0 0 0 1px var(--foreground)}`}</style>
  <header className="heading-inspector-header"><div className="heading-inspector-icon"><ImageIcon size={19} /></div><div><h2>Image</h2><p>Style the selected block</p></div></header>
  <div className="heading-inspector-body">
   <section><h3>Size & alignment</h3><div className="heading-field"><span>Image size</span><div className="image-inspector-modes">{["original","fill","scale"].map(mode => <button type="button" key={mode} aria-pressed={(target.sizeMode || "original") === mode} onClick={() => update({sizeMode:mode,width:null,height:null})}>{mode[0].toUpperCase()+mode.slice(1)}</button>)}</div></div>
   {target.sizeMode === "scale" && <label className="heading-field"><span>Scale · {target.scale || 100}%</span><input aria-label="Image scale" type="range" min="1" max="100" value={target.scale || 100} onChange={event => update({scale:Number(event.target.value)})} /></label>}
   <div className="heading-field"><span>Alignment</span><div className="heading-align" style={{gridTemplateColumns:"repeat(3,1fr)"}}>{ALIGNMENTS.map(({value,label,icon:Icon}) => <button type="button" key={value} aria-label={label} aria-pressed={target.align === value} onClick={() => update({align:value})}><Icon size={17} /></button>)}</div></div></section>
   <section><h3>Link</h3><label className="heading-field"><span>Destination URL</span><input key={`${target.pos}:${target.src}`} className="image-inspector-input" type="url" aria-label="Image link" placeholder="https://example.com" defaultValue={target.href || ""} onBlur={event => { const href=event.target.value.trim(); if (!href || /^https?:\/\//i.test(href)) { event.target.setCustomValidity("");update({href}); } else {event.target.setCustomValidity("Use an http:// or https:// link");event.target.reportValidity();} }} /></label><label style={{display:"flex",gap:8,fontSize:12,alignItems:"center"}}><input type="checkbox" checked={Boolean(target.newTab)} onChange={event => update({newTab:event.target.checked})} />Open link in new tab</label></section>
   <section><h3>Delivery</h3><label className="heading-field"><span>Image in delivered email</span><select aria-label="Image delivery" value={target.delivery || "default"} onChange={event => update({delivery:event.target.value})}><option value="default">Newsletter default ({newsletter?.imageDelivery || "hosted"})</option><option value="hosted">Hosted image</option><option value="embedded">Embed in email</option></select></label><p className="image-inspector-hint">Embedded images travel with the email. A stored copy remains for editing and web previews. Embedding requires an image from your library.</p>{target.src?.includes("/api/dev-images/") && <p className="image-inspector-hint">This older development image is private. Re-upload it for hosted email delivery, or choose Embedded.</p>}</section>
   <section><h3>Accessibility</h3><label className="heading-field"><span>Alt text</span><textarea className="image-inspector-input" rows={3} aria-label="Image description" placeholder="Describe this picture" value={target.alt || ""} onChange={event => update({alt:event.target.value})} /></label><p className="image-inspector-hint">Describe meaningful images. Leave blank if the image is purely decorative.</p></section>
  </div>
  <footer className="heading-inspector-footer"><button type="button" onClick={duplicate}><Copy size={15} />Duplicate</button><button type="button" className="heading-delete" onClick={() => deleteBlock(editor,target.pos)}><Trash2 size={15} />Delete</button><button type="button" disabled={resolved.index() === 0} onClick={() => move(-1)}><ArrowUp size={15} />Move up</button><button type="button" disabled={resolved.index() === resolved.parent.childCount-1} onClick={() => move(1)}><ArrowDown size={15} />Move down</button></footer>
 </aside>, document.body);
}

export const ALIGNMENTS = [
 { value: "left", label: "Align left", icon: AlignLeft },
 { value: "center", label: "Center", icon: AlignCenter },
 { value: "right", label: "Align right", icon: AlignRight },
];
