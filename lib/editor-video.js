import { Node } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { decodeVideo, encodeVideo, videoHtml } from "./video-blocks.js";
export const VideoBlock = Node.create({
	name: "video", group: "block", atom: true, draggable: true,
	addAttributes() { return { config: { default: {}, rendered: false, parseHTML: element => decodeVideo(element.getAttribute("data-video")) } }; },
	parseHTML() { return [{ tag: "div[data-video]", priority: 70 }]; },
	renderHTML({ node }) { return ["div", { "data-video": encodeVideo(node.attrs.config) }, ["span", "Video"]]; },
	addNodeView() {
		return ({ node, editor, getPos }) => {
			const dom = document.createElement("div");
			dom.className = "editor-video-target"; dom.contentEditable = "false"; dom.tabIndex = 0;
			dom.setAttribute("role", "button"); dom.setAttribute("aria-label", "Select video and open settings");
			const draw = current => { dom.innerHTML = videoHtml(current.attrs.config); };
			const select = event => {
				if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
				event.preventDefault(); const pos = getPos();
				if (typeof pos === "number") editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)));
				editor.view.focus();
			};
			draw(node); dom.addEventListener("click", select); dom.addEventListener("keydown", select);
			return { dom, update(current) { if (current.type !== node.type) return false; draw(current); return true; },
				selectNode() { dom.classList.add("ProseMirror-selectednode"); }, deselectNode() { dom.classList.remove("ProseMirror-selectednode"); },
				stopEvent(event) { return ["click", "keydown"].includes(event.type); }, ignoreMutation() { return true; },
				destroy() { dom.removeEventListener("click", select); dom.removeEventListener("keydown", select); },
			};
		};
	},
});
