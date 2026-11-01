import { closeHistory } from "@tiptap/pm/history";
import { TextSelection } from "@tiptap/pm/state";
import { Node } from "@tiptap/core";

export const ColumnRow = Node.create({
 name: "columnRow", group: "block", content: "column{2,12}", isolating: true,
 parseHTML: () => [{ tag: "table[data-columns]", contentElement: "tr", priority: 80 }],
 renderHTML: () => ["table", { "data-columns": "", role: "presentation", width: "100%", style: "width:100%;table-layout:fixed;border-collapse:collapse" }, ["tbody", ["tr", 0]]],
});
export const Column = Node.create({
 name: "column", content: "block+", isolating: true,
 addAttributes: () => ({ span: { default: 6, parseHTML: element => Math.max(1, Math.min(12, Number(element.getAttribute("data-column-span")) || 6)), renderHTML: attrs => ({ "data-column-span": attrs.span, width: `${attrs.span / 12 * 100}%`, style: `width:${attrs.span / 12 * 100}%;vertical-align:top;padding:8px` }) } }),
 parseHTML: () => [{ tag: "td[data-column-span]", priority: 80 }],
 renderHTML: ({ HTMLAttributes }) => ["td", HTMLAttributes, 0],
});

export function splitBlockBeside(editor, event, block, sourcePos = null) {
 const view = editor.view;
 const target = findSplitTarget(view, event);
 if (!target) return false;
 const { node, pos, rect } = target;
 if (sourcePos === pos) return false;
 const side = (event.clientX - rect.left) / rect.width;
 const children = [node.toJSON(), block];
 if (side < 0.5) children.reverse();
 const row = view.state.schema.nodeFromJSON({ type: "columnRow", content: children.map(content => ({ type: "column", attrs: { span: 6 }, content: [content] })) });
 const tr = view.state.tr;
 if (sourcePos !== null) {
  const source = tr.doc.nodeAt(sourcePos);
  if (!source) return false;
  tr.delete(sourcePos, sourcePos + source.nodeSize);
 }
 const rowPos = tr.mapping.map(pos);
 tr.replaceWith(rowPos, rowPos + node.nodeSize, row);
 const selected = rowPos + 3 + (side < 0.5 ? 0 : row.child(0).nodeSize);
 tr.setSelection(TextSelection.near(tr.doc.resolve(selected)));
 view.dispatch(tr.scrollIntoView());
 view.focus();
 return true;
}

function findSplitTarget(view, event) {
 // Coordinate-to-text lookup resolves to the document between blocks or past the end of a short line.
 // Use each block's visual rectangle instead, so its empty right half remains a column drop target.
 let target = null;
 view.state.doc.forEach((node, pos) => {
  if (target || node.type.name === "columnRow") return;
  const dom = view.nodeDOM(pos);
  if (!(dom instanceof Element)) return;
  const picture = node.type.name === "image" ? (dom.matches("img") ? dom : dom.querySelector("img")) : null;
  const box = (picture || dom).getBoundingClientRect();
  const editorBox = view.dom.getBoundingClientRect();
  const rect = { top: box.top, bottom: box.bottom, height: box.height, left: editorBox.left, right: editorBox.right, width: editorBox.width };
  const inset = Math.min(6, rect.height * 0.15);
  if (rect.width && event.clientY >= rect.top + inset && event.clientY <= rect.bottom - inset && event.clientX >= rect.left - 24 && event.clientX <= rect.right + 24) target = { node, pos, rect };
 });
 return target;
}


// Resolve a block boundary in the column under the pointer, including space below a short column.
export function columnDropTarget(view, event) {
 let found = null;
 view.state.doc.descendants((node, pos) => {
  if (node.type.name !== "column") return true;
  const dom = view.nodeDOM(pos);
  if (!(dom instanceof Element)) return false;
  const rect = dom.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return false;
  let insertion = pos + node.nodeSize - 1;
  let y = rect.bottom - 8;
  let matched = false;
  node.forEach((child, offset) => {
   if (matched) return;
   const childPos = pos + 1 + offset;
   const childDom = view.nodeDOM(childPos);
   if (!(childDom instanceof Element)) return;
   const box = childDom.getBoundingClientRect();
   if (event.clientY < (box.top + box.bottom) / 2) { insertion = childPos; y = box.top; matched = true; }
   else { insertion = childPos + child.nodeSize; y = box.bottom; }
  });
  found = { pos: insertion, rect, y };
  return false;
 });
 return found;
}

export function insertInColumn(editor, event, block, sourcePos = null) {
 const target = columnDropTarget(editor.view, event);
 if (!target) return false;
 const node = editor.state.schema.nodeFromJSON(block);
 const tr = editor.state.tr;
 if (sourcePos !== null) {
  const source = tr.doc.nodeAt(sourcePos);
  if (!source) return false;
  if (target.pos >= sourcePos && target.pos <= sourcePos + source.nodeSize) return true;
  // Keep the source column valid when its only block is moved away.
  const parent = tr.doc.resolve(sourcePos).parent;
  if (parent.type.name === "column" && parent.childCount === 1) tr.replaceWith(sourcePos, sourcePos + source.nodeSize, editor.state.schema.nodes.paragraph.create());
  else tr.delete(sourcePos, sourcePos + source.nodeSize);
 }
 const pos = tr.mapping.map(target.pos);
 tr.insert(pos, node);
 tr.setSelection(TextSelection.near(tr.doc.resolve(pos + (node.isTextblock ? 1 : 0))));
 editor.view.dispatch(tr.scrollIntoView());
 editor.view.focus();
 return true;
}

const dropMarkers = new WeakMap();
export function clearColumnDropPreview(view) {
 dropMarkers.get(view)?.remove();
 dropMarkers.delete(view);
}
export function showColumnDropPreview(view, event) {
 clearColumnDropPreview(view);
 const column = columnDropTarget(view, event);
 const split = column ? null : findSplitTarget(view, event);
 if (!column && !split) return false;
 const marker = document.createElement("div");
 marker.setAttribute("aria-hidden", "true");
 const rect = column?.rect || split.rect;
 const rightHalf = split && event.clientX >= rect.left + rect.width / 2;
 Object.assign(marker.style, {
  position: "fixed", pointerEvents: "none", zIndex: "100", boxSizing: "border-box", borderRadius: "3px",
  background: column ? "#7c3aed" : "#7c3aed18", border: column ? "0" : "2px solid #7c3aed",
  left: `${column ? rect.left + 8 : rect.left + (rightHalf ? rect.width / 2 : 0)}px`,
  top: `${column ? column.y - 2 : rect.top}px`,
  width: `${column ? Math.max(0, rect.width - 16) : rect.width / 2}px`, height: column ? "4px" : `${rect.height}px`,
 });
 document.body.append(marker);
 dropMarkers.set(view, marker);
 return true;
}


export function removeColumn(editor, rowPos, index) {
 const row = editor.state.doc.nodeAt(rowPos);
 if (row?.type.name !== "columnRow" || !Number.isInteger(index) || index < 0 || index >= row.childCount) return false;
 const remaining = [];
 row.forEach((node, _offset, i) => { if (i !== index) remaining.push(node); });
 if (!remaining.length) return false;
 const tr = closeHistory(editor.state.tr);
 if (remaining.length === 1) {
  tr.replaceWith(rowPos, rowPos + row.nodeSize, remaining[0].content);
 } else {
  const recipient = Math.min(index, remaining.length - 1);
  remaining[recipient] = remaining[recipient].type.create({ ...remaining[recipient].attrs, span: remaining[recipient].attrs.span + row.child(index).attrs.span }, remaining[recipient].content);
  tr.replaceWith(rowPos, rowPos + row.nodeSize, row.type.create(row.attrs, remaining));
 }
 tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(rowPos + 1, tr.doc.content.size))));
 editor.view.dispatch(tr.scrollIntoView());
 editor.view.focus();
 return true;
}
