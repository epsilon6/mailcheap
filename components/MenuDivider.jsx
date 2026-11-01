"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useEditorState } from "@tiptap/react";
import { Minus, Copy, Trash2 } from "lucide-react";
import { INSPECTOR_STYLES } from "@/components/MenuHeading";
import { DIVIDER_STYLES } from "@/lib/divider-styles";
const LABELS = { color: "Line color", line: "Line style", thickness: "Thickness", background: "Background", top: "Top", bottom: "Bottom", left: "Left", right: "Right" };
export default function MenuDivider({ editor }) {
 const [linked, setLinked] = useState(false);
 const target = useEditorState({ editor, selector: ({ editor: current }) => {
  const selection = current.state.selection;
  return selection.node?.type.name === "horizontalRule" ? { pos: selection.from, attrs: selection.node.attrs } : null;
 } });
 if (!target) return null;
 function update(key, value) {
  if (!DIVIDER_STYLES[key][1].test(value)) return;
  const attrs = { color: target.attrs.color || "#000000", [key]: value };
  if (linked && ["top","bottom","left","right"].includes(key)) for (const side of ["top","bottom","left","right"]) attrs[side] = value;
  editor.commands.updateAttributes("horizontalRule", attrs);
 }
 function field(key) {
  const value = target.attrs[key] ?? DIVIDER_STYLES[key][0];
  const color = key === "color" || key === "background";
  return <label className="heading-field"><span>{LABELS[key]}</span>{key === "line" ? <select aria-label="Line style" value={value} onChange={e => update(key, e.target.value)}>{["solid","dashed","dotted","double"].map(v => <option key={v}>{v}</option>)}</select> : color ? <div className="heading-color"><input aria-label={LABELS[key]} type="color" value={value} onChange={e => update(key, e.target.value)} /><span>{value.toUpperCase()}</span></div> : <div className="heading-number"><input aria-label={LABELS[key]} type="number" min={key === "thickness" ? 1 : 0} max={key === "thickness" ? 50 : 100} value={value} onChange={e => update(key, e.target.value)} /><span>px</span></div>}</label>;
 }
 return createPortal(<aside className="heading-inspector" aria-label="Divider settings"><style>{INSPECTOR_STYLES}</style><header className="heading-inspector-header"><div className="heading-inspector-icon"><Minus size={19} /></div><div><h2>Divider</h2><p>Style the selected block</p></div></header><div className="heading-inspector-body"><section><h3>Line</h3><div className="heading-field-grid">{field("color")}{field("line")}</div>{field("thickness")}</section><section><h3>Background</h3>{field("background")}</section><section><h3>Spacing</h3><div className="heading-field-grid">{field("top")}{field("bottom")}{field("left")}{field("right")}</div><label style={{display:"flex",gap:8,fontSize:12}}><input type="checkbox" checked={linked} onChange={e => setLinked(e.target.checked)} />Apply changes to all sides</label></section></div><footer className="heading-inspector-footer"><button type="button" onClick={() => { const node = editor.state.doc.nodeAt(target.pos); editor.chain().focus().insertContentAt(target.pos + node.nodeSize, node.toJSON()).run(); }}><Copy size={15} />Duplicate</button><button type="button" className="heading-delete" onClick={() => editor.chain().focus().deleteSelection().run()}><Trash2 size={15} />Delete</button></footer></aside>, document.body);
}
