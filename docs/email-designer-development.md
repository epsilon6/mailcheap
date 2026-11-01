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

### Review fixes (2026-11-01)
A code review of the committed designer work found three functional gaps, now fixed on development:

- Embedded images are checked before a send. `findEmbedProblem` (`lib/embed-check.js`) renders the biggest email and reads its embedded images through the delivery path before `queueCampaign`, `sendToMoreContacts`, `sendTest` and the send action's blocker. An image outside the account's library, an oversized set or embedding with a provider other than SES now stops the send up front with `send_check_failed`, rather than failing each recipient mid-campaign. Older campaigns whose images now carry `data-image-delivery="default"` are covered when the newsletter default changes to Embedded.
- The embedded-image cache held 24 entries while an email may embed 40, so large emails re-read every image per recipient. It now holds twice the per-email count and is also bounded by twice the per-email byte limit.
- The archive dropped heading, divider, column and image settings. They now pass the archive sanitizer as validated attributes and render as inline styles shared with email; image links and sizes apply; archive columns stack on narrow screens.
- Heading fonts carry a generic fallback stack.

No database change. New tests: `tests/designer-delivery.test.mjs`. Validation in an isolated copy (committed tree plus these changes, unrelated local edits excluded): full suite 1,511 tests, all passed, none cancelled; full ESLint and a production build passed. Browser check on development: heading color, centering and Georgia stack, divider and a 4/8 column row render in the desktop and mobile email previews. The archive page was not viewed in a browser; its output is covered by tests. Signup emails still fail per email when an embedded image breaks.

### Default delivery falls back to hosted (2026-11-01)
The pre-send check stopped broken sends up front, but switching a newsletter's default to Embedded still blocked every older campaign whose pictures were outside the library (editor images all render with `data-image-delivery="default"`). `prepareInlineImages` now separates intent: an image set to Embedded explicitly must embed or the email fails; an image on `default` embeds when it can and otherwise stays hosted. Explicit images are processed first so they claim the 8 MB and 40-part limits. The old test asserting no fallback for default images was replaced with tests for both paths and for limit priority, plus an embed-check test that a default switch never blocks an older issue. Help and delivery docs updated. Focused tests: 23 passed.

### Image cache review (2026-11-01)
The cache resize was correct but untested, and the default-delivery fallback exposed two gaps: failed reads were dropped, so a default image that stays hosted was looked up (or, for a library image whose download failed, downloaded with a 10-second timeout) again for every recipient; and eviction was first-in-first-out. The cache is now `createImageCache`, which keeps failed reads for its 60-second lifetime and evicts least recently used first. New tests in `tests/email-image-cache.test.mjs` cover a full 40-image email read once per batch, cached failures, per-account keys, expiry, LRU order and the byte bound.

### Help article brought up to date (2026-11-01)
`app/(site)/help/writing/page.js`: the editor list gains Content blocks; Pictures describes the settings panel (Original, Fill, Scale, alignment, link, new tab, alt text, delivery) instead of the retired hover toolbar; new Headings, paragraphs and dividers and Columns sections (columns stack on the website, not in email); the button figure caption no longer mentions the old bar; the developer-facing "Designing with blocks" section (storage backends, "in development") is gone. New screenshots `columns.webp` and `picture-settings.webp`, `button.webp` retaken, `picture-toolbar.webp` removed; all synthetic data (a drawn sunset, example.com links), 1600x1000 WebP. The article's description in `lib/help.js` stays under the 200-character page limit. Help and public-site tests: 31 passed.

### Content image library
Added account-level Content navigation and image library with search, sorting, type/folder filters, grid/list views, multiple uploads, metadata editing and saved campaign reference lookup. Upload receives optional filename/folder/dimension fields; old records require no backfill. Existing picker API shape and immutable URLs are preserved. See content-library.md for scope, query limits and validation.

Content validation: 47 focused tests passed, including content ownership/metadata/usage, image regressions, help links and API/MCP parity. Targeted ESLint and whitespace checks passed. Browser checks verified clipboard upload, metadata persistence, filters/views, picker reuse and the sample campaign reference. Security source review found no medium or higher issues. Optional Upload fields are additive; no data rewrite or physical file move. Public help screenshot publication was blocked by automatic approval review because it came from a signed-in session, and remains pending. No campaign was sent. Full suite/build and GitHub commit/push were not performed for this change.


### GitHub transfer validation (2026-11-01)
The full isolated run completed 1,525 tests: 1,523 passed and two failed. The Content library added a dashboard-limited action and an account page; the remaining failures identified the missing action expectation in dashboard-limits.test.mjs and the missing /content crawler exclusion in app/robots.js. Both were corrected. All 29 tests in the two affected files then passed, and final repository lint passed. The isolated production build passed with webpack; default Turbopack could not resolve dependencies through the isolated node_modules symlink. A separate source security review found no medium or higher issues. The transfer includes the earlier designer review fixes and the Content library; unrelated sender/dependency changes, backups and the pending Content help screenshot are excluded.

### Self-hosted SMTP provider (2026-11-01)
`EMAIL_PROVIDER=smtp` adds a third adapter, `lib/email-provider/smtp.js` (nodemailer, pooled), for self-hosted servers only (`getEmailProviderId` refuses it with `MAILCHEAP_CLOUD=true`). Tenants are a constant no-op object; MailCheap's own suppressions and pauses hold accounts. Domains verify by DNS: SPF on the domain plus the DKIM key at `SMTP_DKIM_SELECTOR`, both required. Refusals map to outcomes: login refused is `misconfigured`, 4xx `throttled`, connection errors `unavailable`, a 5xx recipient refusal is a hard bounce recorded through `handleEmailEvent` then `suppressed`. Emails carry `<messageId.accountId@domain>` as Message-ID and `X-MailCheap-Message`, so bounce reports find them. `lib/smtp-bounce-rules.js` parses RFC 3464 delivery reports and RFC 5965 feedback reports; `lib/smtp-bounces.js` reads unseen mail over IMAP (imapflow), applies each event only to its own email's recipient (a forged report can't suppress another contact) and strips spam-trap wording, since only a live SMTP answer is trusted to block an account. `/api/cron/bounces` runs it; `/api/cron/hourly` too. Providers declare `supportsInlineImages` (SES and SMTP yes, PostShiba no), replacing the SES id check. The admin capacity card shows that an SMTP server keeps its own limits. No database change. Tests: `tests/smtp-provider.test.mjs`.

### Sending server settings on /admin (2026-11-01)
Admins set the SMTP server and bounce mailbox on `/admin` (Sending server, `components/CardSendingServer.jsx`), as listmonk does, instead of only in the environment. `models/SendingServer.js` holds one document (`_id: "smtp"`); passwords are AES-256-GCM encrypted with `CREDENTIALS_ENCRYPTION_KEY` (`lib/credentials.js`, a context per secret), `select: false`, write-only in the form and never sent to the browser. `lib/sending-server-rules.js` validates the form (hostnames, ports, DKIM selector, SPF prefix; turning SMTP on requires a host, a DKIM selector and a bounce mailbox) and maps saved settings onto the same environment variables, so the adapter and bounce reader are unchanged. `lib/sending-server.js` loads them into `globalThis.__mailcheapSendingServer` at startup (`instrumentation-node.js`, retried every 30 seconds while the database is down) and after each save; `getSendingEnv()` in `lib/config.js` overlays them on `process.env` unless the environment sets `SMTP_HOST` or `EMAIL_PROVIDER`, which win. The SMTP provider rebuilds its pool when the saved version changes. Turning SMTP on or off is refused while a campaign is sending. Test connection logs in to both servers (SMTP `verify`, IMAP read-only mailbox open) without saving or sending. Both actions are admin-only (`requireAdmin`) and refused on Cloud; the log names who saved and which passwords changed, never their values. Admins can point Test connection at any host and port from the server, the same as listmonk. Tests: `tests/sending-server.test.mjs`.
