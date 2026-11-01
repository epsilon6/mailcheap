"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import { Play, Share2, CodeXml, Heading, ImagePlus, Minus, MousePointerClick, Pilcrow, Space } from "lucide-react";
import FileHandler from "@tiptap/extension-file-handler";
import { Placeholder } from "@tiptap/extensions";
import { ColumnRow, Column, splitBlockBeside, insertInColumn, showColumnDropPreview, clearColumnDropPreview } from "@/lib/editor-columns";
import { VideoBlock } from "@/lib/editor-video";
import MenuVideo from "@/components/MenuVideo";
import { SocialBlock } from "@/lib/editor-social";
import { newSocialBlock } from "@/lib/social-blocks";
import MenuSocial from "@/components/MenuSocial";
import MenuColumns from "@/components/MenuColumns";
import MenuDivider from "@/components/MenuDivider";
import { DividerDesign } from "@/lib/editor-divider";
import MenuHeading from "@/components/MenuHeading";
import { HeadingDesign } from "@/lib/editor-heading";
import StarterKit from "@tiptap/starter-kit";
import { HtmlBlock, editHtmlBlock } from "@/components/BlockHtml";
import { Section, SectionsContext } from "@/components/BlockSection";
import DialogContactFields from "@/components/DialogContactFields";
import DialogImagePicker from "@/components/DialogImagePicker";
import GutterProblems from "@/components/GutterProblems";
import MenuButton from "@/components/MenuButton";
import MenuFormat from "@/components/MenuFormat";
import MenuImage from "@/components/MenuImage";
import { MergeTagSuggestion, SlashCommand } from "@/components/MenuSlash";
import ProviderContactOptions from "@/components/ProviderContactOptions";
import TooltipMergeTag from "@/components/TooltipMergeTag";
import { isButtonLink } from "@/lib/buttons";
import { BlockHandle } from "@/lib/editor-block-handle";
import { ButtonBlock, findButton } from "@/lib/editor-button";
import { Callout } from "@/lib/editor-callout";
import { findWords } from "@/lib/editor-find";
import { ImageAligned } from "@/lib/editor-image";
import { MergeTags, setEditorFields } from "@/lib/editor-merge-tags";
import { Problems, findDocProblems, findProblem, revealProblem, setProblemSegments } from "@/lib/editor-problems";
import { UndoDelete } from "@/lib/editor-undo-delete";
import { fieldTag } from "@/lib/merge-tags";
import { toast } from "@/lib/toast";
import { IMAGE_TYPES, IMAGE_TYPE_ERROR, getDisplaySize, prepareImage, uploadImage } from "@/lib/upload-image";
import { useFileDropGuard } from "@/lib/use-file-drop";

const MIN_HEIGHT = "min-h-[560px]";
const NO_FIELDS = [];
const NO_TAGS = [];
const DOCK_STYLES = `
/* Editor-only guides: these selectors never enter campaign content or email markup. */
.prose-issue table[data-columns] > tbody > tr > td[data-column-span] {
  outline: 1px dashed #b8bcc3;
  outline-offset: -2px;
  background-color: rgba(148, 153, 163, 0.055);
}
.prose-issue table[data-columns] > tbody > tr > td[data-column-span]:focus-within {
  outline-color: #8b919b;
  background-color: rgba(148, 153, 163, 0.09);
}
.prose-issue .editor-divider-target {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 40px;
  border-radius: 6px;
  cursor: pointer;
  outline: 1px solid transparent;
}
.prose-issue .editor-divider-target:hover,
.prose-issue .editor-divider-target:focus-visible,
.prose-issue .editor-divider-target.ProseMirror-selectednode {
  background: rgba(148, 153, 163, 0.1);
  outline: 1px dashed #9ca3af;
}
.prose-issue .editor-divider-target > hr { flex: none; }
.prose-issue .editor-social-target { min-height:44px; margin:12px 0; cursor:pointer; border-radius:6px; }
.prose-issue .editor-social-target:hover,.prose-issue .editor-social-target.ProseMirror-selectednode { outline:1px dashed #9ca3af; outline-offset:3px; }
.prose-issue .editor-social-target img { margin:0!important; border-radius:0!important; }
.prose-issue .editor-video-target { min-height:80px; margin:12px 0; cursor:pointer; border-radius:6px; }
.prose-issue .editor-video-target:hover,.prose-issue .editor-video-target.ProseMirror-selectednode { outline:1px dashed #9ca3af; outline-offset:3px; }
.prose-issue .editor-video-target img { margin:0!important; outline:none; }
/* The block palette belongs to the workspace, outside the email card. */
.designer-block-dock {
  position: fixed;
  z-index: 25;
  left: calc(var(--sidebar-width) + 1rem);
  top: calc(var(--plan-bar-height, 0px) + 6rem);
  width: 15rem;
  max-height: calc(100dvh - 8rem);
  overflow-y: auto;
}
@media (min-width: 1100px) {
  .designer-content-column {
    width: calc(100% - 17rem);
    margin-left: max(17rem, calc((100% - 42rem) / 2));
    margin-right: auto;
  }
}
@media (max-width: 1099px) {
  .designer-block-dock {
    left: 1rem;
    right: 1rem;
    top: auto;
    bottom: 1rem;
    width: auto;
    max-height: 12rem;
  }
  .designer-block-dock > div {
    display: flex;
    overflow-x: auto;
  }
  .designer-block-dock button { min-width: 5rem; }
  .designer-content-column { padding-bottom: 13rem; }
}
`;

const BLOCK_DRAG_TYPE = "application/x-mailcheap-block";
const BLOCKS = [
	{ id: "image", label: "Image", icon: ImagePlus },
	{ id: "heading", label: "Heading", icon: Heading },
	{ id: "paragraph", label: "Paragraph", icon: Pilcrow },
	{ id: "button", label: "Button", icon: MousePointerClick },
	{ id: "divider", label: "Divider", icon: Minus },
	{ id: "spacer", label: "Spacer", icon: Space },
	{ id: "code", label: "Code", icon: CodeXml },
	{ id: "social", label: "Social", icon: Share2 },
	{ id: "video", label: "Video", icon: Play },
];

// contactFields: the account's fields, whose tags the editor draws as placeholders and its slash menu inserts. Add a
// field, in the slash menu, opens them to add one, which goes where the slash was: onContactFieldsChange(fields) gives
// them back as they are after one is added or deleted there.
// newsletter: whose email design HTML blocks preview in, and whose button colors and corners buttons show.
// ref: reveal({ id, message, words }), which goes to a review step's warning or check (lib/campaign-steps.js), else to
// the first place the issue has the words, and says whether it found it. gutterRef: the positioned element around the
// editor's card, whose problems' dots sit beside it in the page's margin (components/GutterProblems.jsx). sections: what
// the issue's sections pick from (components/BlockSection.jsx), its segments a section without one is marked by.
export default function EditorRich({
	ref,
	gutterRef,
	showBlocks = true,
	content,
	onChange,
	contactFields = NO_FIELDS,
	onContactFieldsChange = () => {},
	newsletter = null,
	sections = null,
}) {
	const [isEditingLink, setIsEditingLink] = useState(false);
	const [isEditingButtonLink, setIsEditingButtonLink] = useState(false);
	const [isPickingImage, setIsPickingImage] = useState(false);
	const [isAddingField, setIsAddingField] = useState(false);
	// The block whose dot says what it's about, once brought into view.
	const [pinned, setPinned] = useState(null);
	const unpin = useCallback(() => setPinned(null), []);
	const segments = sections?.segments;
	const segmentIds = useMemo(() => (segments ?? []).map(({ id }) => id), [segments]);
	const editor = useEditor({
		immediatelyRender: false,
		content,
		extensions: [
			StarterKit.configure({
				heading: { levels: [1, 2, 3] },
				codeBlock: false,
				link: { openOnClick: false, defaultProtocol: "https" },
				dropcursor: { color: "var(--ring)", width: 2 },
			}),
			ImageAligned.configure({
				resize: {
					enabled: true,
					directions: ["left", "right"],
					minWidth: 80,
					minHeight: 40,
					alwaysPreserveAspectRatio: true,
				},
			}),
			HeadingDesign,
			DividerDesign,
			SocialBlock,
			VideoBlock,
			ColumnRow,
			Column,
			Callout,
			ButtonBlock.configure({ newsletter, onEditLink: () => setIsEditingButtonLink(true) }),
			HtmlBlock.configure({ newsletter }),
			Section,
			BlockHandle,
			UndoDelete,
			MergeTags.configure({ contactFields }),
			Problems.configure({ contactFields }),
			Placeholder.configure({
				placeholder: ({ node }) => (node.type.name === "heading" ? "Heading" : "Write, or press / for commands"),
			}),
			FileHandler.configure({
				allowedMimeTypes: IMAGE_TYPES,
				consumePasteEvent: true,
				onDrop: (current, files, position) => insertImages(current, files, position),
				onPaste: (current, files) => insertImages(current, files),
			}),
			SlashCommand.configure({ onPickImage: () => setIsPickingImage(true), onAddField: () => setIsAddingField(true), contactFields }),
			MergeTagSuggestion.configure({ contactFields }),
		],
		editorProps: {
			// With a mouse, the left padding holds the blocks' drag handle (lib/editor-block-handle.js).
			attributes: { class: `prose-issue ${MIN_HEIGHT} px-5 py-5 outline-none [@media(pointer:fine)]:pl-12`, "aria-label": "Content" },
			// In a button, ⌘K opens the button's own link (lib/editor-button.js).
			handleKeyDown: (view, event) => {
				const isLinkShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
				if (!isLinkShortcut || view.state.selection.empty || findButton(view.state)) return false;
				setIsEditingLink(true);
				return true;
			},
			// The file handler takes pictures and passes on any other file, which would vanish without a word.
			handleDOMEvents: {
                dragleave: (view, event) => { if (!view.dom.contains(event.relatedTarget)) clearColumnDropPreview(view); return false; },
                dragend: (view) => { clearColumnDropPreview(view); return false; },
                dragover: (view, event) => {
                    if (!Array.from(event.dataTransfer?.types || []).includes(BLOCK_DRAG_TYPE) && !view.dragging) return false;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = view.dragging?.move ? "move" : "copy";
                    return showColumnDropPreview(view, event);
                },
            },
            handleDrop: (view, event) => {
                clearColumnDropPreview(view);
				const kind = event.dataTransfer?.getData(BLOCK_DRAG_TYPE);
				if (kind && BLOCKS.some((item) => item.id === kind)) {
					event.preventDefault();
					const newBlock = kind === "video" ? { type: "video", attrs: { config: { id: crypto.randomUUID() } } } : kind === "social" ? { type: "social", attrs: { config: newSocialBlock(newsletter, window.location.origin) } } : kind === "heading" ? { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Heading" }] } : kind === "divider" ? { type: "horizontalRule" } : kind === "button" ? { type: "button", content: [{ type: "text", text: "Button" }] } : kind === "code" ? { type: "htmlBlock", attrs: { isNew: true } } : { type: "paragraph", content: [{ type: "text", text: kind === "image" ? "Choose Image to add a picture here" : "Write your text" }] };
                    if (insertInColumn(editor, event, newBlock) || splitBlockBeside(editor, event, newBlock)) { if (kind === "image") setIsPickingImage(true); return true; }
                    const position = view.posAtCoords({ left: event.clientX, top: event.clientY });
					if (position) editor.commands.setTextSelection(position.pos);
					insertBlock(kind);
					return true;
				}
				const dragged = view.dragging;
                const draggedNode = dragged?.slice?.content?.childCount === 1 ? dragged.slice.content.firstChild : null;
                if (draggedNode?.isBlock && !["columnRow", "column"].includes(draggedNode.type.name)) {
                    const selected = view.state.selection;
                    const sourcePos = dragged.move && (selected.node === draggedNode || selected.node?.eq(draggedNode)) ? selected.from : null;
                    if (insertInColumn(editor, event, draggedNode.toJSON(), sourcePos) || splitBlockBeside(editor, event, draggedNode.toJSON(), sourcePos)) {
                        event.preventDefault();
                        view.dragging = null;
                        return true;
                    }
                }
                const files = [...(event.dataTransfer?.files ?? [])];
				if (files.length === 0 || files.some((file) => IMAGE_TYPES.includes(file.type))) return false;
				event.preventDefault();
				toast.error(IMAGE_TYPE_ERROR);
				return true;
			},
		},
		onUpdate: ({ editor: current }) => onChange(current.getHTML()),
	});
	useFileDropGuard();

	// A button whose link is missing or looks broken opens its link field, an HTML block its HTML, which says what's wrong
	// under it, and words get their dot's message beside them.
	function reveal(found) {
		if (!revealProblem(editor, found)) return false;
		const node = editor.state.doc.nodeAt(found.pos);
		if (node.type.name === "htmlBlock") editHtmlBlock(editor.view, found.pos);
		else if (node.type.name === "button") setIsEditingButtonLink(found.problem.id === "links" || !isButtonLink(node.attrs.href));
		else setPinned(found.pos);
		return true;
	}

	useImperativeHandle(ref, () => ({
		reveal: ({ id, message, words }) => {
			if (!editor || editor.isDestroyed) return false;
			const found = findProblem(findDocProblems(editor.state.doc, contactFields, segmentIds), { id, message });
			return found ? reveal(found) : Boolean(words && selectWords(editor, words));
		},
	}));

	useEffect(() => {
		if (editor && !editor.isDestroyed) setProblemSegments(editor, segmentIds);
	}, [editor, segmentIds]);

	useEffect(() => {
		if (editor && !editor.isDestroyed) setEditorFields(editor, contactFields);
	}, [editor, contactFields]);

	function insertBlock(kind) {
		if (!editor || editor.isDestroyed) return;
		if (kind === "image") return setIsPickingImage(true);
		const chain = editor.chain().focus();
		if (kind === "video") chain.insertContent({ type: "video", attrs: { config: { id: crypto.randomUUID() } } }).run();
		else if (kind === "social") chain.insertContent({ type: "social", attrs: { config: newSocialBlock(newsletter, window.location.origin) } }).run();
		else if (kind === "heading") chain.insertContent({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Heading" }] }).run();
		else if (kind === "paragraph") chain.insertContent({ type: "paragraph", content: [{ type: "text", text: "Write your text" }] }).run();
		else if (kind === "button") chain.insertContent({ type: "button", content: [{ type: "text", text: "Button" }] }).run();
		else if (kind === "divider") chain.setHorizontalRule().run();
		else if (kind === "code") chain.insertContent({ type: "htmlBlock", attrs: { isNew: true } }).run();
		else if (kind === "spacer") chain.insertContent({ type: "htmlBlock", attrs: { html: '<table role="presentation" width="100%"><tr><td height="24" style="height:24px;font-size:0;line-height:0">&nbsp;</td></tr></table>' } }).run();
	}

	if (!editor) return <div className={MIN_HEIGHT} />;

	return (
		<SectionsContext value={sections}>
			<style>{DOCK_STYLES}</style>
			<div>
				{showBlocks && createPortal(<aside aria-label="Content blocks" className="designer-block-dock rounded-xl border bg-background p-4 shadow-sm">
					<h2 className="text-sm font-semibold">Content blocks</h2>
					<p className="mt-1 text-xs text-muted-foreground">Drag a block into your email or click to insert it.</p>
					<div className="mt-3 grid grid-cols-2 gap-2">
						{BLOCKS.map(({ id, label, icon: Icon }) => (
							<button key={id} type="button" draggable onDragEnd={() => clearColumnDropPreview(editor.view)} onDragStart={(event) => { event.dataTransfer.setData(BLOCK_DRAG_TYPE, id); event.dataTransfer.setData("text/plain", label); event.dataTransfer.effectAllowed = "copy"; }} onClick={() => insertBlock(id)} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2">
								<Icon aria-hidden="true" className="size-4" />{label}
							</button>
						))}
					</div>
				</aside>, document.body)}
				<EditorContent editor={editor} className="relative min-w-0 flex-1" />
			</div>
			<GutterProblems
				editor={editor}
				gutterRef={gutterRef}
				pinned={pinned}
				onUnpin={unpin}
				onReveal={({ pos, problems }) => reveal({ pos, problem: problems[0] })}
			/>
			<MenuFormat editor={editor} isEditingLink={isEditingLink} onEditLink={setIsEditingLink} />
			<MenuButton editor={editor} visible={showBlocks} isEditingLink={isEditingButtonLink} onEditLink={setIsEditingButtonLink} />
			<MenuImage editor={editor} visible={showBlocks} newsletter={newsletter} />
			<MenuSocial editor={editor} visible={showBlocks} newsletter={newsletter} />
			<MenuVideo editor={editor} visible={showBlocks} newsletter={newsletter} />
            {showBlocks && <MenuHeading editor={editor} />}
            {showBlocks && <MenuDivider editor={editor} />}
            {showBlocks && <MenuColumns editor={editor} />}
			<TooltipMergeTag editor={editor} contactFields={contactFields} />
			<DialogImagePicker
				open={isPickingImage}
				onOpenChange={setIsPickingImage}
				onSelect={(image) => insertImage(editor, image)}
			/>
			<ProviderContactOptions fields={contactFields} tags={NO_TAGS}>
				<DialogContactFields
					isOpen={isAddingField}
					onOpenChange={setIsAddingField}
					onAdded={(field) => {
						setIsAddingField(false);
						onContactFieldsChange([...contactFields, field]);
						editor.chain().focus().insertContent(fieldTag(field.key)).run();
					}}
					onDeleted={(key) => onContactFieldsChange(contactFields.filter((field) => field.key !== key))}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						editor.commands.focus();
					}}
				/>
			</ProviderContactOptions>
		</SectionsContext>
	);
}

// Centered on the screen, where the editor's own scrolling would leave the words at its edge, under the page's header.
function selectWords(editor, words) {
	const found = findWords(editor.state.doc, words);
	if (!found || editor.isDestroyed) return false;
	editor.chain().focus(null, { scrollIntoView: false }).setTextSelection(found).run();
	const { node } = editor.view.domAtPos(found.from);
	(node.nodeType === Node.TEXT_NODE ? node.parentElement : node)?.scrollIntoView({ block: "center" });
	return true;
}

// Where the slash command was typed: the editor keeps its selection while the picker has focus.
function insertImage(editor, { url, width, height }) {
	if (editor.isDestroyed) return;
	const size = width && height ? getDisplaySize({ width, height }) : {};
	editor.chain().focus().insertContent({ type: "image", attrs: { src: url, alt: "", ...size } }).run();
}

// Each picture shows right away from the local file and switches to its CDN URL once uploaded. The
// switch stays out of the undo history, so undo never brings back the local preview.
async function insertImages(editor, files, position) {
	for (const file of files) {
		let image;
		try {
			image = await prepareImage(file);
		} catch (error) {
			toast.error(error.message);
			continue;
		}
		if (editor.isDestroyed) return;

		const previewUrl = URL.createObjectURL(image.file);
		const node = { type: "image", attrs: { src: previewUrl, alt: "", ...getDisplaySize(image) } };
		const chain = editor.chain().focus();
		(position === undefined ? chain.insertContent(node) : chain.insertContentAt(position, node)).run();
		position = undefined;

		uploadImage(image.file)
			.then((url) => updateImages(editor, previewUrl, (tr, pos, attrs) => tr.setNodeMarkup(pos, undefined, { ...attrs, src: url })))
			.catch((error) => {
				updateImages(editor, previewUrl, (tr, pos, _attrs, size) => tr.delete(pos, pos + size));
				toast.error(error.message);
			});
	}
}

function updateImages(editor, src, change) {
	if (editor.isDestroyed) return;
	const matches = [];
	editor.state.doc.descendants((node, pos) => {
		if (node.type.name === "image" && node.attrs.src === src) matches.push({ node, pos });
	});
	if (!matches.length) return;
	const { tr } = editor.state;
	for (const { node, pos } of matches.reverse()) change(tr, pos, node.attrs, node.nodeSize);
	editor.view.dispatch(tr.setMeta("addToHistory", false));
}
