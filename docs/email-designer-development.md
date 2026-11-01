# Email designer development log

Status: work in progress on the email-designer branch. Changes are not committed or pushed. This file describes verified implementation separately from requirements.

## 2026-10-31: Basic block palette

Implemented in components/EditorRich.jsx: Image, Heading, Paragraph, Button, Divider, Spacer and Code insertion controls. Existing htmlBlock remains the Code implementation; Spacer currently uses an HTML table in that same node. Click and drag insertion need complete browser acceptance testing. Existing HTML-block regression tests passed (21 tests); editor ESLint passed.

Known issue: the browser has continued loading an older editor asset after restarting the development service. The block palette is present in source but its restored visibility has not been verified. A temporary module rename was reverted.

## 2026-10-31: Development image storage

lib/image-storage.js now supports explicitly configured local storage only when NODE_ENV is development and DEV_IMAGE_STORAGE_DIR and APP_URL are set. Files are outside the repository with random names. app/api/dev-images/[name]/route.js requires a session and an account-scoped Upload lookup. Production storage selection remains S3 or Vercel Blob. These development images are for the authenticated dashboard and are unsuitable for delivered email images.

Verified: local storage selection, disabled local selection in production, file write and deletion; ESLint on changed files. Actual picker upload and save/reopen behavior remain unverified.

Configuration: DEV_IMAGE_STORAGE_DIR is an absolute persistent directory writable by the app service. Never commit environment files or credentials. Rollback: remove this setting and revert the storage and route changes; retain uploaded files and records until their retention is decided.

## Image controls: accepted requirements, not implemented yet

- Original: natural image dimensions, constrained to the email column, preserving aspect ratio.
- Fill: fill the available column width while preserving aspect ratio; avoid silently cropping content.
- Scale: percentage control with a visible value and preserved aspect ratio.
- Clickable image: validated web link, removable link, and an open-in-new-tab option. Preserve links and target attributes through editing, HTML sanitization and email rendering. Email clients may override tab behavior.
- Alt text: labeled editable description, including an explicit decorative-image choice. Alt text supports accessibility but does not by itself establish ADA compliance.
- Block actions: duplicate, move/reorder and delete, with keyboard-accessible controls and undo support.

Existing functionality found in components/MenuImage.jsx: alignment, alt-text editing and deletion. Integrate these rather than introducing conflicting controls. Existing lib/editor-image.js extends Tiptap images with alignment. Preserve Code blocks unchanged.

## Database and migration register

No Mongoose model/schema, collection, index or migration changes have been introduced by the designer palette or local image storage work. Campaign format and html fields already exist. Local image uploads use the existing Upload schema (accountId, url, pathname, contentType, bytes); successful uploads create ordinary records in the isolated development database. No historical campaign backfill is required by the current implementation.

Image-control requirements are not yet implemented; their final persistence and sanitization design must be recorded here before release. Prefer compatible HTML serialization using existing campaign fields. Any future structural database change must have a numbered migration with preconditions, backup requirements, idempotency, verification and rollback/data-retention instructions. Record schema/index changes and any backfill separately from normal data writes.

## Release requirements

Before commit/push: review the exact diff and exclude unrelated inherited changes and secrets; update user help alongside features; complete image upload, selection, sizing, link, alt text, block actions, save/reopen, preview and HTML round-trip acceptance checks; run required tests, lint and build; complete the security review required by AGENTS.md. Record results here. Use focused commits and a PR description linking this log. Do not describe unverified behavior as complete.


## 2026-10-31: Image controls implementation

Added an Image settings control to the existing image toolbar. Settings include Original/Fill/Scale, a 1–100% scale slider, HTTP(S) destination URL, new-tab flag, alt text, duplicate, move up/down, and delete. Existing alignment and deletion/undo remain. Fill expands to column width without cropping; Original retains existing dimensions, constrained by the column.

Persistence uses existing Campaign.html: validated data-size-mode, data-scale, data-image-link and data-image-new-tab attributes. Tiptap parses these back into image attributes. Rich email rendering converts settings into inline widths and an anchor; new-tab links include noopener noreferrer. No database schema, index or collection change and no migration/backfill. Legacy images default to Original, 100%, no link. Code blocks were not changed.

Validation: ESLint passed for initial changed files; 16 email-rendering/theme tests passed, including new safe linked/scaled-image and executable-link rejection cases. Browser interaction, save/reopen, resize-handle interaction, duplicate/reorder undo and accessibility acceptance remain unverified. The previously recorded stale browser asset problem remains unresolved. These controls must not be described as fully accepted or released yet.


## 2026-10-31: Workspace block dock

Moved content blocks outside the email card into a portal attached to the workspace. On desktop the dock sits alongside the app navigation, with space reserved beside the campaign column. On smaller screens it becomes a horizontally scrolling bottom dock. It only appears during Write. No persistence or database changes. Verification: ESLint; browser visual verification pending.


### Dock positioning correction

The portal loaded in the browser but the global stylesheet change did not, leaving the palette at the end of the document. Moved dock layout rules into a stylesheet rendered with EditorRich so the component and its positioning rules load together. Desktop left dock and narrow-screen bottom dock behavior remain. No database change. ESLint passed; browser layout needs confirmation.


## Heading controls

Added heading-specific settings: left/center/right/justify alignment, levels 1–3, six web-safe font families, font size, text/background color, line height, letter spacing, uniform padding, top margin, corner radius and border style/width/color. Duplicate, delete and clear formatting included; existing text toolbar keeps bold, italic, strike and links. Settings appear while the selection is in a heading. Values use strict allowlists, persist as data-heading-* attributes in existing Campaign.html, and render as inline email CSS. No database migration.

Validation: lint and email rendering regression tests passed, including new centered heading and CSS-injection rejection tests. Browser save/reopen and interaction testing pending. This is partial Mailchimp parity: separate mobile styles, per-side spacing, anchor management, additional inline typography, and dedicated move controls are not implemented. Right-side settings layout needs responsive acceptance testing.


### Heading component permission recovery
The development watcher tried reading newly created files before ownership was assigned to the app user and retained a permission-denied build error. Confirmed the service user can read all three new heading files; set normal source permissions (0644) and restarted only the development service. Future new files must be created with service-readable permissions before importing them into the live development app.


### Heading inspector visual redesign
Replaced the raw settings list with grouped typography, color and spacing sections, segmented alignment icons, bordered inputs with units, color swatches with hex values, collapsible border controls, and a separate action footer. Component-local stylesheet loads with the inspector. No persistence changes. ESLint passed; browser visual confirmation pending.


## Paragraph settings
Shared the approved heading inspector with paragraph nodes: alignment, web-safe font, size, text/background colors, line height, letter spacing, padding, top margin, borders/corners, duplicate, delete and reset. Paragraph controls show 16px/1.5 defaults. The text-style selector can convert a paragraph to a heading. Existing inline emphasis and links remain supported. Shared validated data-heading-* attributes are also used on p tags for compatible persistence/rendering; no schema change or migration. Lint and rendering regression tests passed, with a new paragraph alignment/size/padding and emphasis/link preservation test. Browser interaction/save-reopen verification pending. Separate mobile styles, per-side spacing and full Mailchimp toolbar parity remain outstanding.


## Divider controls
Added a matching inspector for selected horizontal rules: line color, solid/dashed/dotted/double style, thickness, background attribute, independent spacing on each side, linked-side changes, duplicate and delete. Validated data-divider-* attributes persist in existing campaign HTML and convert to inline email CSS. Current side spacing uses HR margins; a full background wrapper and separate mobile styles/visibility settings are not implemented. No schema migration. ESLint and rendering tests passed, including divider style preservation. Browser acceptance and save/reopen verification pending.


### Divider build recovery
New divider source files were briefly created under the root tool process with restrictive permissions before ownership was corrected; the running compiler retained the read failure. Verified all three files are readable as the service user with 0644 permissions, and restarted the development service. New-file edits must run as the service user or establish readable permissions before any live import is added.


## Column layout prototype
Added columnRow and column Tiptap nodes, persisted as marked presentation tables in existing campaign HTML. Palette side drops wrap a block into a 6/6 row; columns accept block content. A column settings panel adjusts widths in 12 grid units and adds columns by taking one unit from the widest column, up to 12. Email rendering uses inline table widths. No database schema change. Existing HTML code blocks remain. Lint/rendering checks passed; interactive drag/drop, save/reopen, nested block behavior, responsive stacking and resize handles remain unverified or incomplete. This is a prototype, not full Mailchimp parity.


### Palette drag initiation fix
Removed preventDefault from palette mouse-down: canceling the native mouse-down prevented draggable buttons from starting a browser drag. Retained click insertion, added a plain-text drag payload alongside the custom block type, and explicitly accepted custom palette drags on editor dragover. ESLint passed; native browser drag acceptance remains to be verified.


### Column drop target correction
Replaced text-position-based column hit testing with top-level block rectangle hit testing. Empty space beside a short line previously resolved outside the block, bypassing row creation. Drops within the vertical middle of an existing block now make a 6/6 row, placing the new block on the pointer side; top/bottom edge drops retain ordinary insertion. Existing column rows are excluded from this initial split operation. Browser confirmation pending.


### Image side-drop correction
Image targets now use the visible image for vertical hit testing and the full editor width for horizontal hit testing, including the blank space beside a resized image. Internal single-image drags now use the column split path as palette drags do; a move deletes its source and creates the row in one transaction, preserving undo and image attributes. Existing column rows and filesystem image drops still need further support. Browser verification pending.


### Column insertion boundaries and drop feedback
Added shared column hit testing for drop execution and preview, resolving before/after child-block boundaries including blank column space. Palette blocks and internal block moves use explicit insert positions rather than inline text selection. Moving a column's only block leaves an empty paragraph so the schema stays valid. Added a purple insertion line inside columns and a shaded side preview for new rows; markers clear on drop/leave/end. Two new model/geometry tests pass: image insertion in the second column and moving an image out of a single-block column. Lint passed. Native browser drag, marker positioning and picker cancellation still need interactive acceptance testing. No database change.


### Editor-only column guides
Added a subtle gray dashed outline and faint gray fill to each column, slightly stronger while editing within it. Rules are scoped to .prose-issue in EditorRich component styles. No node attributes, campaign HTML, email rendering or database changes. ESLint passed; visual acceptance pending.


### Column deletion
Added a labeled trash button between each column label and width field. Populated columns require confirmation; deletion is a separate undo step. Remaining columns receive the removed width, keeping the 12-unit sum; deleting down to one column unwraps its blocks into the surrounding document without losing them. No database changes. Model deletion and existing column insertion tests and ESLint passed. Browser confirmation pending.


### Image inspector placement
Replaced the image hover toolbar with a selection-based right-side inspector matching the approved heading/paragraph design. Size, alignment, scale, link/new-tab, alt text and duplicate/delete/move actions are available directly; it hides outside Write. Moving is constrained to siblings within the current column. No HTML attribute or database changes. ESLint passed; browser visual/interaction verification pending.


### Button inspector placement
Replaced the floating button toolbar with the shared right-side inspector. Alignment and web/email link editing remain available, including Enter and keyboard link-edit shortcuts. Added duplicate and sibling move controls, constrained to the current column; deletion retains undo. Hidden outside Write. Existing button HTML and theme styling are unchanged; no database migration. Help text updated. Visual acceptance and refreshed help screenshot remain pending.
Validation: targeted ESLint passed. Button assertions reported passing, but the combined button/column test command exceeded its 60-second limit before a final summary; this is not recorded as a complete suite pass.


### Divider selection area
Added an editor-only node view with a minimum 40px click target, hover/selection outline and keyboard activation (Tab, then Enter or Space). Clicking its padding selects the horizontalRule node and opens the existing inspector. Node view updates keep divider styles visible; serialization still uses the original hr, with no wrapper or highlight in saved HTML or email. No database changes.
Validation: ESLint passed. Focused node-view test passed for padded click selection, Enter/Space, selection styling, cleanup and unchanged document/serialization. Browser visual acceptance remains pending.


### Social catalog and per-image delivery
Added Social block and inspector, newsletter catalog/default delivery settings, immutable icon variants, persistent public filesystem uploads and account-scoped SES CID attachment delivery. Additive Newsletter fields and existing Campaign HTML attributes are documented in social-and-image-delivery.md, including storage, limits, rollback, tests and release gaps. Focused tests and real browser save/reopen checks passed; no real mail sent.
Final feature validation: 46 targeted tests passed; targeted ESLint and diff whitespace check passed. Real browser checks covered catalog persistence, Social insertion, icon loading, saved links/style/delivery and a per-image Embedded override with alt text after refresh. Added a synthetic-data help screenshot. Full suite/build and actual inbox rendering remain release validation steps.

### Content dock order
Moved Social after Code, making it the last item in the Content blocks dock. No content, storage or database changes.

### Video blocks
Added Video as the last dock item, with a right-side inspector, linked thumbnails, automatic public-provider lookup and custom account-library source images. Posters optionally bake in a play button and reuse per-block hosted/CID delivery. No new database fields; Campaign HTML snapshots and Upload records are used. See video-blocks.md for provider limits, API additions, data format and validation.

Validation: 53 focused tests passed; targeted ESLint and diff whitespace checks passed. Browser checks verified automatic YouTube posters, custom library posters and settings persistence after reload. Added a sample-data help screenshot. Full suite/build and actual inbox delivery remain release validation. No email was sent.

### GitHub review preparation (2026-11-01)
Security source review of the designer, social/video, uploads and inline delivery changes found no medium or higher issues. Full ESLint and an isolated production build passed using the installed development dependencies. The commit excludes unrelated server-specific sender rules, general dependency upgrades, environment credentials and backup files. Sharp is declared explicitly with its existing lockfile version.

Pre-push integration checks found and fixed an extensionless heading-style import and provider-specific wording in help. Campaign recipient tests (7) and help tests (9) passed on rerun after those fixes.

Final suite coverage: 1,506 tests executed in the isolated copy. Initial run: 1,499 passed, 1 help wording failure and 6 recipient tests cancelled by the missing import. After fixing both causes, all 7 recipient-file tests and all 9 help-file tests passed on targeted reruns; no unresolved test failures remain. Full-suite run was not repeated after those targeted fixes.
