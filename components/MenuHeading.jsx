"use client";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Copy, Trash2, RotateCcw } from "lucide-react";
import { createPortal } from "react-dom";
import { useEditorState } from "@tiptap/react";
import { HEADING_STYLES } from "@/lib/heading-styles";

const OPTIONS = { align: ["left", "center", "right", "justify"], font: ["Arial", "Helvetica", "Georgia", "Verdana", "Tahoma", "Times New Roman"], border: ["none", "solid", "dashed", "dotted"] };
const LABELS = { align: "Alignment", font: "Font", size: "Font size", color: "Text color", background: "Background color", line: "Line height", spacing: "Letter spacing", padding: "Padding", margin: "Top margin", radius: "Rounded corners", border: "Border style", borderWidth: "Border width", borderColor: "Border color" };
export default function MenuHeading({ editor }) {
 const heading = useEditorState({ editor, selector: ({ editor: current }) => {
  const { $from } = current.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) if (["heading", "paragraph"].includes($from.node(depth).type.name)) return { type: $from.node(depth).type.name, pos: $from.before(depth), attrs: $from.node(depth).attrs };
  return null;
 } });
 if (!heading) return null;
 function update(key, value) {
  const rule = HEADING_STYLES[key];
  if (rule && !new RegExp(rule[1]).test(value)) return;
  editor.chain().updateAttributes(heading.type, { ...heading.attrs, align: heading.attrs.align || "left", [key]: value }).run();
 }
 function act(kind) {
  const node = editor.state.doc.nodeAt(heading.pos);
  if (kind === "duplicate") editor.chain().focus().insertContentAt(heading.pos + node.nodeSize, node.toJSON()).run();
  if (kind === "delete") editor.chain().focus().deleteRange({ from: heading.pos, to: heading.pos + node.nodeSize }).run();
 }

 function field(key, unit = "") {
  const value = heading.attrs[key] ?? (heading.type === "paragraph" && key === "size" ? "16" : heading.type === "paragraph" && key === "line" ? "1.5" : HEADING_STYLES[key][0]);
  const color = key.toLowerCase().includes("color") || key === "background";
  return <label className="heading-field" key={key}><span>{LABELS[key]}</span>{OPTIONS[key] ? <select aria-label={LABELS[key]} value={value} onChange={(event) => update(key, event.target.value)}>{OPTIONS[key].map(option => <option key={option}>{option}</option>)}</select> : color ? <div className="heading-color"><input aria-label={LABELS[key]} type="color" value={value} onChange={(event) => update(key, event.target.value)} /><span>{value.toUpperCase()}</span></div> : <div className="heading-number"><input aria-label={LABELS[key]} type="number" step={key === "line" ? "0.1" : "1"} value={value} onChange={(event) => update(key, event.target.value)} /><span>{unit}</span></div>}</label>;
 }
 return createPortal(<aside aria-label={heading.type === "heading" ? "Heading settings" : "Paragraph settings"} className="heading-inspector">
  <style>{INSPECTOR_STYLES}</style>
  <header className="heading-inspector-header"><div className="heading-inspector-icon"><Type size={19} /></div><div><h2>{heading.type === "heading" ? "Heading" : "Paragraph"}</h2><p>Style the selected block</p></div><span className="heading-level-badge">{heading.type === "heading" ? `H${heading.attrs.level}` : "P"}</span></header>
  <div className="heading-inspector-body">
   <section><h3>Typography</h3><div className="heading-field-grid">{heading.type === "heading" ? <label className="heading-field"><span>Heading level</span><select aria-label="Heading level" value={heading.attrs.level} onChange={(event) => editor.chain().setHeading({ level: Number(event.target.value) }).run()}>{[1,2,3].map(level => <option key={level} value={level}>Heading {level}</option>)}</select></label> : <label className="heading-field"><span>Text style</span><select aria-label="Text style" value="paragraph" onChange={(event) => editor.chain().setHeading({ level: Number(event.target.value) }).run()}><option value="paragraph">Paragraph</option>{[1,2,3].map(level => <option key={level} value={level}>Heading {level}</option>)}</select></label>}{field("size", "px")}</div>{field("font")}
    <div className="heading-field"><span>Alignment</span><div className="heading-align">{[AlignLeft, AlignCenter, AlignRight, AlignJustify].map((Icon, index) => { const value = OPTIONS.align[index]; return <button type="button" key={value} aria-label={`Align ${value}`} aria-pressed={(heading.attrs.align || "left") === value} onMouseDown={(event) => event.preventDefault()} onClick={() => update("align", value)}><Icon size={17} /></button>; })}</div></div>
    <div className="heading-field-grid">{field("line", "×")}{field("spacing", "px")}</div>
   </section>
   <section><h3>Colors</h3><div className="heading-field-grid">{field("color")}{field("background")}</div></section>
   <section><h3>Spacing</h3><div className="heading-field-grid">{field("padding", "px")}{field("margin", "px")}</div></section>
   <details><summary>Border & corners</summary><div className="heading-details-content">{field("border")}<div className="heading-field-grid">{field("borderWidth", "px")}{field("radius", "px")}</div>{field("borderColor")}</div></details>
  </div>
  <footer className="heading-inspector-footer"><button type="button" onClick={() => act("duplicate")}><Copy size={15} />Duplicate</button><button type="button" className="heading-delete" onClick={() => act("delete")}><Trash2 size={15} />Delete</button><button type="button" className="heading-reset" onClick={() => editor.chain().unsetAllMarks().resetAttributes(heading.type, Object.keys(HEADING_STYLES)).run()}><RotateCcw size={14} />Reset formatting</button></footer>
 </aside>, document.body);
}
export const INSPECTOR_STYLES = `
.heading-inspector{position:fixed;right:20px;top:96px;width:288px;max-height:calc(100dvh - 120px);z-index:30;display:flex;flex-direction:column;border:1px solid var(--border);border-radius:16px;background:var(--background);color:var(--foreground);box-shadow:0 8px 32px #0000000d;font-size:13px;overflow:hidden}
.heading-inspector-header{display:flex;align-items:center;gap:10px;padding:18px;border-bottom:1px solid var(--border)}
.heading-inspector-icon{display:grid;place-items:center;width:36px;height:36px;border:1px solid var(--border);border-radius:10px;background:var(--muted)}
.heading-inspector h2{font-size:14px;font-weight:650;margin:0}.heading-inspector-header p{font-size:11px;color:var(--muted-foreground);margin:3px 0 0}.heading-level-badge{margin-left:auto;border:1px solid var(--border);padding:3px 6px;border-radius:5px;font-size:10px;color:var(--muted-foreground)}
.heading-inspector-body{overflow:auto;min-height:0}.heading-inspector section{padding:16px 18px;border-bottom:1px solid var(--border)}.heading-inspector h3{font-size:11px;font-weight:650;text-transform:uppercase;letter-spacing:.08em;color:var(--muted-foreground);margin:0 0 14px}
.heading-field{display:grid;gap:7px;margin-bottom:12px;min-width:0}.heading-field:last-child{margin-bottom:0}.heading-field>span{font-size:11px;color:var(--muted-foreground)}.heading-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.heading-field-grid>.heading-field{margin-bottom:12px}
.heading-field select,.heading-number,.heading-color{height:36px;width:100%;border:1px solid var(--border);border-radius:7px;background:var(--background);color:var(--foreground)}.heading-field select{padding:0 9px;font-size:12px}.heading-number{display:flex;align-items:center;padding-right:9px;gap:4px}.heading-number input{width:100%;min-width:0;padding:7px 9px;background:transparent;outline:none;font-size:12px}.heading-number>span{font-size:11px;color:var(--muted-foreground)}.heading-number:focus-within,.heading-field select:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
.heading-color{display:flex;align-items:center;gap:7px;padding:5px 7px}.heading-color input{width:23px;height:23px;padding:0;border:0;background:transparent;cursor:pointer}.heading-color>span{font-size:10px;font-family:monospace}
.heading-align{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;padding:3px;background:var(--muted);border:1px solid var(--border);border-radius:8px}.heading-align button{display:grid;place-items:center;height:30px;border-radius:5px;color:var(--muted-foreground);cursor:pointer}.heading-align button[aria-pressed=true]{background:var(--background);color:var(--foreground);box-shadow:0 1px 3px #0002}
.heading-inspector details{padding:16px 18px}.heading-inspector summary{font-size:12px;font-weight:600;cursor:pointer}.heading-details-content{padding-top:16px}.heading-inspector-footer{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px 18px;border-top:1px solid var(--border);background:var(--background)}.heading-inspector-footer button{display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border);border-radius:7px;min-height:34px;font-size:11px;cursor:pointer}.heading-inspector-footer button:hover{background:var(--muted)}.heading-inspector-footer .heading-delete{color:#c53030}.heading-inspector-footer .heading-reset{grid-column:1/-1;border:0;color:var(--muted-foreground);min-height:24px}
@media(max-width:1100px){.heading-inspector{right:12px;top:84px;width:260px;max-height:calc(100dvh - 100px)}}
`;
