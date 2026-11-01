import Image from "@tiptap/extension-image";

// A picture placed left, center or right of the column (lib/clean-html.js IMAGE_ALIGNMENTS). Centered ones carry no
// attribute, so issues written before alignment keep their markup.
export const ImageAligned = Image.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			delivery: {
				default: "default",
				parseHTML: element => ["hosted", "embedded"].includes(element.getAttribute("data-image-delivery")) ? element.getAttribute("data-image-delivery") : "default",
				renderHTML: ({ delivery }) => ({ "data-image-delivery": ["hosted", "embedded"].includes(delivery) ? delivery : "default" }),
			},
			sizeMode: {
				default: "original",
				parseHTML: (element) => element.getAttribute("data-size-mode") || "original",
				renderHTML: ({ sizeMode, scale }) => ({ "data-size-mode": sizeMode, ...(sizeMode === "fill" ? { style: "width:100%;height:auto" } : sizeMode === "scale" ? { style: `width:${Math.max(1, Math.min(100, Number(scale) || 100))}%;height:auto` } : {}) }),
			},
			scale: {
				default: 100,
				parseHTML: (element) => Number(element.getAttribute("data-scale")) || 100,
				renderHTML: ({ scale }) => ({ "data-scale": scale }),
			},
			href: {
				default: "",
				parseHTML: (element) => element.getAttribute("data-image-link") || "",
				renderHTML: ({ href }) => (/^https?:\/\//i.test(href) ? { "data-image-link": href } : {}),
			},
			newTab: {
				default: false,
				parseHTML: (element) => element.getAttribute("data-image-new-tab") === "true",
				renderHTML: ({ newTab }) => ({ "data-image-new-tab": String(newTab) }),
			},
			align: {
				default: "center",
				parseHTML: (element) => readAlign(element.getAttribute("data-align")),
				renderHTML: ({ align }) => (align === "center" ? {} : { "data-align": align }),
			},
		};
	},
});

function readAlign(value) {
	return value === "left" || value === "right" ? value : "center";
}
