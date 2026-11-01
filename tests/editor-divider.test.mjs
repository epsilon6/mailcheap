import assert from "node:assert/strict";
import { test } from "node:test";
import { Schema } from "@tiptap/pm/model";
import { EditorState, NodeSelection } from "@tiptap/pm/state";
import { createDividerView } from "../lib/editor-divider.js";

const schema = new Schema({ nodes: {
	doc: { content: "block+" },
	text: {},
	horizontalRule: { group: "block", atom: true, toDOM: () => ["hr"] },
} });

test("divider padding and keyboard activation select the node without altering its content", () => {
	const previousDocument = globalThis.document;
	class Element {
		constructor(tag) { this.tagName = tag; this.events = {}; this.classes = new Set(); this.classList = { add: value => this.classes.add(value), remove: value => this.classes.delete(value) }; }
		setAttribute() {}
		replaceChildren(...children) { this.children = children; }
		addEventListener(name, fn) { this.events[name] = fn; }
		removeEventListener(name) { delete this.events[name]; }
	}
	globalThis.document = { createElement: tag => new Element(tag) };
	try {
		let state = EditorState.create({ doc: schema.node("doc", null, [schema.node("horizontalRule")]) });
		let focused = false;
		let dispatches = 0;
		const view = { get state() { return state; }, dispatch(tr) { state = state.apply(tr); dispatches++; }, focus() { focused = true; } };
		const original = state.doc.toJSON();
		const nodeView = createDividerView(state.doc.firstChild, view, () => 0);
		assert.equal(nodeView.dom.children[0].tagName, "hr");
		for (const event of [{ type: "click" }, { type: "keydown", key: "Enter" }, { type: "keydown", key: " " }]) {
			let prevented = false;
			nodeView.dom.events[event.type]({ ...event, preventDefault() { prevented = true; } });
			assert.equal(prevented, true);
			assert.ok(state.selection instanceof NodeSelection);
			assert.equal(state.selection.node.type.name, "horizontalRule");
		}
		assert.equal(dispatches, 3);
		assert.equal(focused, true);
		assert.deepEqual(state.doc.toJSON(), original);
		assert.deepEqual(state.doc.firstChild.type.spec.toDOM(state.doc.firstChild), ["hr"]);
		assert.equal(nodeView.update(state.doc.firstChild), true);
		nodeView.selectNode();
		assert.ok(nodeView.dom.classes.has("ProseMirror-selectednode"));
		nodeView.deselectNode();
		assert.equal(nodeView.dom.classes.size, 0);
		nodeView.destroy();
		assert.deepEqual(nodeView.dom.events, {});
	} finally { globalThis.document = previousDocument; }
});
