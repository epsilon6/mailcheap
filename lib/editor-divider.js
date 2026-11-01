import { Extension } from "@tiptap/core";
import { DOMSerializer } from "@tiptap/pm/model";
import { NodeSelection, Plugin } from "@tiptap/pm/state";
import { DIVIDER_STYLES, dividerStyle } from "./divider-styles.js";
export const DividerDesign = Extension.create({
 name: "dividerDesign",
 addProseMirrorPlugins() {
	return [new Plugin({ props: { nodeViews: { horizontalRule: createDividerView } } })];
 },
 addGlobalAttributes() { return [{ types: ["horizontalRule"], attributes: Object.fromEntries(Object.entries(DIVIDER_STYLES).map(([key, [, pattern]]) => [key, {
 default: null,
 parseHTML: element => { const value = element.getAttribute(`data-divider-${key}`); return pattern.test(value) ? value : null; },
 renderHTML: attrs => attrs[key] == null ? {} : { [`data-divider-${key}`]: attrs[key], ...(key === "color" ? { style: dividerStyle(attrs) } : {}) },
 }])) }]; },
});

// The wrapper is a node view only: serialization still emits the original hr.
export function createDividerView(node, view, getPos) {
	const dom = document.createElement("div");
	dom.className = "editor-divider-target";
	dom.contentEditable = "false";
	dom.tabIndex = 0;
	dom.setAttribute("role", "button");
	dom.setAttribute("aria-label", "Select divider and open its settings");
	function draw(current) {
		dom.replaceChildren(DOMSerializer.renderSpec(document, current.type.spec.toDOM(current)).dom);
	}
	function select(event) {
		if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
		const pos = getPos();
		if (typeof pos !== "number") return;
		event.preventDefault();
		view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)));
		view.focus();
	}
	draw(node);
	dom.addEventListener("click", select);
	dom.addEventListener("keydown", select);
	return {
		dom,
		update(current) {
			if (current.type !== node.type) return false;
			draw(current);
			return true;
		},
		selectNode() { dom.classList.add("ProseMirror-selectednode"); },
		deselectNode() { dom.classList.remove("ProseMirror-selectednode"); },
		stopEvent(event) { return event.type === "click" || event.type === "keydown"; },
		ignoreMutation() { return true; },
		destroy() {
			dom.removeEventListener("click", select);
			dom.removeEventListener("keydown", select);
		},
	};
}
