"use client";
import { Trash2 } from "lucide-react";
import { removeColumn } from "@/lib/editor-columns";
import { createPortal } from "react-dom";
import { useEditorState } from "@tiptap/react";
export default function MenuColumns({ editor }) {
 const row = useEditorState({ editor, selector: ({editor: current}) => {
  const { $from } = current.state.selection;
  for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === "columnRow") return { pos: $from.before(d), node: $from.node(d) };
  return null;
 }});
 if (!row) return null;
 const cols = [];
 row.node.forEach((node, offset) => cols.push({ node, pos: row.pos + 1 + offset }));
 function resize(index, value) {
  const next = index === cols.length - 1 ? index - 1 : index + 1;
  const total = cols[index].node.attrs.span + cols[next].node.attrs.span;
  const span = Number(value);
  if (!Number.isInteger(span) || span < 1 || span >= total) return;
  const tr = editor.state.tr.setNodeAttribute(cols[index].pos, "span", span).setNodeAttribute(cols[next].pos, "span", total - span);
  editor.view.dispatch(tr);
 }
 function deleteColumn(index) {
  const node = cols[index].node;
  const populated = node.childCount !== 1 || node.firstChild.type.name !== "paragraph" || node.firstChild.content.size > 0;
  if (populated && !window.confirm(`Delete column ${index + 1} and its contents? You can undo this change.`)) return;
  removeColumn(editor, row.pos, index);
 }
 function addColumn() {
  if (cols.length >= 12) return;
  const widest = cols.reduce((a,b) => a.node.attrs.span >= b.node.attrs.span ? a : b);
  if (widest.node.attrs.span < 2) return;
  editor.chain().command(({tr}) => { tr.setNodeAttribute(widest.pos, "span", widest.node.attrs.span - 1); return true; }).insertContentAt(widest.pos + widest.node.nodeSize, {type:"column",attrs:{span:1},content:[{type:"paragraph"}]}).run();
 }
 return createPortal(<aside aria-label="Column settings" style={{position:"fixed",left:"calc(var(--sidebar-width) + 1rem)",bottom:"1rem",width:240,maxHeight:"40vh",overflow:"auto",zIndex:35,padding:16,border:"1px solid var(--border)",borderRadius:12,background:"var(--background)",boxShadow:"0 4px 16px #0001"}}><h2 style={{fontSize:14,fontWeight:600}}>Columns · 12-part grid</h2><div style={{display:"flex",gap:2,margin:"12px 0"}}>{cols.map((col,index) => <div key={index} style={{flex:col.node.attrs.span,background:"var(--muted)",padding:5,textAlign:"center",fontSize:11}}>{col.node.attrs.span}/12</div>)}</div>{cols.map((col,index) => <div key={index} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,marginBottom:8,gap:8}}><span style={{flex:1}}>Column {index+1}</span><button type="button" aria-label={`Delete column ${index+1}`} title={`Delete column ${index+1}`} onClick={() => deleteColumn(index)} style={{display:"grid",placeItems:"center",width:28,height:28,borderRadius:5,color:"#b42318",cursor:"pointer"}}><Trash2 size={15} /></button><input aria-label={`Column ${index+1} width`} style={{width:60,border:"1px solid var(--border)",borderRadius:5,padding:4}} type="number" min="1" max="11" value={col.node.attrs.span} onChange={event => resize(index,event.target.value)} /></div>)}<button type="button" disabled={cols.length >= 12} onClick={addColumn} style={{border:"1px solid var(--border)",borderRadius:6,padding:"6px 10px",fontSize:12,marginBottom:8}}>Add column</button><p style={{fontSize:11,color:"var(--muted-foreground)"}}>Changing a width adjusts its neighbor. Drop blocks inside either column.</p></aside>,document.body);
}
