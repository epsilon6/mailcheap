export const DIVIDER_STYLES = {
 color: ["#000000", /^#[a-f0-9]{6}$/i],
 line: ["solid", /^(solid|dashed|dotted|double)$/],
 thickness: ["1", /^(?:[1-9]|[1-4][0-9]|50)$/],
 background: ["#ffffff", /^#[a-f0-9]{6}$/i],
 top: ["12", /^(?:[0-9]|[1-9][0-9]|100)$/], bottom: ["12", /^(?:[0-9]|[1-9][0-9]|100)$/],
 left: ["24", /^(?:[0-9]|[1-9][0-9]|100)$/], right: ["24", /^(?:[0-9]|[1-9][0-9]|100)$/],
};
export function dividerStyle(attrs) {
 const v = Object.fromEntries(Object.entries(DIVIDER_STYLES).map(([key, [fallback, pattern]]) => [key, pattern.test(String(attrs[key])) ? attrs[key] : fallback]));
 return `border:0;border-top:${v.thickness}px ${v.line} ${v.color};background-color:${v.background};height:0;margin:${v.top}px ${v.right}px ${v.bottom}px ${v.left}px;`;
}
