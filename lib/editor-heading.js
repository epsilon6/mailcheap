import { Extension } from "@tiptap/core";
import { HEADING_STYLES, headingStyle } from "./heading-styles.js";
export const HeadingDesign = Extension.create({
 name: "headingDesign",
 addGlobalAttributes() {
  return [{ types: ["heading", "paragraph"], attributes: Object.fromEntries(Object.entries(HEADING_STYLES).map(([key, [, pattern]]) => [key, {
   default: null,
   parseHTML: (element) => { const value = element.getAttribute(`data-heading-${key.toLowerCase()}`); return value && new RegExp(pattern).test(value) ? value : null; },
   renderHTML: (attrs) => attrs[key] == null ? {} : { [`data-heading-${key.toLowerCase()}`]: attrs[key], ...(key === "align" ? { style: headingStyle(attrs) } : {}) },
  }])) }];
 },
});
