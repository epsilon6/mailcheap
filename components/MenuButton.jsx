"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useEditorState } from "@tiptap/react";
import { MousePointer2, Copy, ArrowUp, ArrowDown, Link, Mail, Trash2 } from "lucide-react";
import ImageFavicon from "@/components/ImageFavicon";
import { INSPECTOR_STYLES } from "@/components/MenuHeading";
import { ALIGNMENTS } from "@/components/MenuImage";
import { isButtonLink } from "@/lib/buttons";
import { findButton } from "@/lib/editor-button";
import { deleteBlock } from "@/lib/editor-undo-delete";
import { formatLinkUrl, normalizeUrl } from "@/lib/links";

export default function MenuButton({ editor, isEditingLink, onEditLink, visible = true }) {
	const linkRef = useRef(null);
	const button = useEditorState({ editor, selector: ({ editor: current }) => {
		const found = findButton(current.state);
		return found && { pos: found.pos, ...found.node.attrs };
	} });
	useEffect(() => {
		if (visible && button && isEditingLink) linkRef.current?.focus({ preventScroll: true });
	}, [visible, button, isEditingLink]);
	if (!visible || !button || !editor.isEditable) return null;

	function change(attrs) {
		editor.chain().command(({ tr, state }) => {
			const found = findButton(state);
			if (found) tr.setNodeMarkup(found.pos, undefined, { ...found.node.attrs, ...attrs });
			return Boolean(found);
		}).run();
	}

	function applyLink(input) {
		const href = normalizeUrl(input.value);
		change({ href });
		input.value = href;
		onEditLink(false);
	}

	function duplicate() {
		const found = findButton(editor.state);
		if (!found) return;
		const pos = found.pos + found.node.nodeSize;
		editor.chain().focus().insertContentAt(pos, found.node.toJSON()).setTextSelection(pos + 1).run();
	}

	function move(direction) {
		const found = findButton(editor.state);
		if (!found) return;
		const resolved = editor.state.doc.resolve(found.pos);
		const neighbor = resolved.index() + direction;
		if (neighbor < 0 || neighbor >= resolved.parent.childCount) return;
		const sibling = resolved.parent.child(neighbor);
		const from = direction < 0 ? found.pos - sibling.nodeSize : found.pos;
		const to = direction < 0 ? found.pos + found.node.nodeSize : found.pos + found.node.nodeSize + sibling.nodeSize;
		const content = direction < 0 ? [found.node.toJSON(), sibling.toJSON()] : [sibling.toJSON(), found.node.toJSON()];
		editor.chain().focus().insertContentAt({ from, to }, content).setTextSelection((direction < 0 ? from : from + sibling.nodeSize) + 1).run();
	}

	const resolved = editor.state.doc.resolve(button.pos);
	return createPortal(
		<aside aria-label="Button settings" className="heading-inspector">
			<style>{INSPECTOR_STYLES}{`
				.button-inspector-input{width:100%;min-width:0;height:36px;border:1px solid var(--border);border-radius:7px;padding:9px;background:var(--background);color:var(--foreground);font-size:12px}
				.button-inspector-input:focus{outline:2px solid var(--ring);outline-offset:2px}
				.button-inspector-hint{font-size:11px;line-height:1.5;color:var(--muted-foreground)}
			`}</style>
			<header className="heading-inspector-header">
				<div className="heading-inspector-icon"><MousePointer2 size={19} /></div>
				<div><h2>Button</h2><p>Edit the selected block</p></div>
			</header>
			<div className="heading-inspector-body">
				<section>
					<h3>Alignment</h3>
					<div className="heading-align" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
						{ALIGNMENTS.map(({ value, label, icon: Icon }) => (
							<button type="button" key={value} aria-label={label} aria-pressed={button.align === value} onClick={() => change({ align: value })}><Icon size={17} /></button>
						))}
					</div>
				</section>
				<section>
					<h3>Link</h3>
					<form onSubmit={(event) => { event.preventDefault(); applyLink(linkRef.current); editor.commands.focus(); }}>
						<label className="heading-field">
							<span>Web or email address</span>
							<input key={`${button.pos}:${button.href}`} ref={linkRef} className="button-inspector-input" type="text" inputMode="url" aria-label="Button link" defaultValue={button.href || ""} placeholder="Paste a link or email address" autoCapitalize="off" autoComplete="off" spellCheck={false} onBlur={(event) => applyLink(event.target)} onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.value = button.href || ""; onEditLink(false); editor.commands.focus(); } }} />
						</label>
					</form>
					<ButtonLink href={button.href} onClick={() => linkRef.current?.focus()} />
					<p className="button-inspector-hint">Links save when you press Enter or leave the field. Edit the button text directly in your email.</p>
				</section>
				<section><h3>Appearance</h3><p className="button-inspector-hint">Button colors and corners follow your newsletter theme.</p></section>
			</div>
			<footer className="heading-inspector-footer">
				<button type="button" onClick={duplicate}><Copy size={15} />Duplicate</button>
				<button type="button" className="heading-delete" onClick={() => deleteBlock(editor, button.pos)}><Trash2 size={15} />Delete</button>
				<button type="button" disabled={resolved.index() === 0} onClick={() => move(-1)}><ArrowUp size={15} />Move up</button>
				<button type="button" disabled={resolved.index() === resolved.parent.childCount - 1} onClick={() => move(1)}><ArrowDown size={15} />Move down</button>
			</footer>
		</aside>, document.body
	);
}

// Where the button goes, with its site's icon, or a way to add it.
function ButtonLink({ href, onClick }) {
	const isMail = /^mailto:/i.test(href ?? "");
	const host = isButtonLink(href) && !isMail ? getHost(href) : null;
	const text = !isButtonLink(href) ? "Add a link" : isMail ? href.slice("mailto:".length) : formatLinkUrl(href);
	return (
		<button
			type="button"
			onClick={onClick}
			title={isButtonLink(href) ? `Link: ${href}` : "Add a link"}
			className="flex h-8 max-w-40 min-w-0 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground sm:max-w-56"
		>
			{host ? <ImageFavicon domain={host} size={14} /> : isMail ? <Mail className="size-4 shrink-0" /> : <Link className="size-4 shrink-0" />}
			<span className="truncate">{text}</span>
		</button>
	);
}

function getHost(href) {
	try { return new URL(href).hostname; } catch { return null; }
}
