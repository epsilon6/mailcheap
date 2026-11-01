# Content image library

The dashboard's account-level Content page (/content) lists uploaded images shared by its newsletters. It uses the same Upload records and immutable files as the editor's image picker. It adds search, type/folder filters, newest/oldest/name/size sorting, 24-item pages, grid/list views, multi-file uploads (at most ten per selection), clipboard image paste, previews, copy/open links, display-name editing and folders.

## Saved campaign usage

Select an image to see saved campaigns that reference it. list_image_campaigns is account-scoped and checks rich text, columns, Code/HTML, Markdown, rendered social icons, video posters, video source thumbnails and campaign cover images. It parses rendered HTML without fetching its images. A URL appearing only as text does not count. Duplicate references in a campaign produce one campaign result with role labels.

Candidate queries search literal plain, HTML-escaped and URI-encoded URL forms. Each request scans at most 100 candidates and returns an opaque nextCursor if more candidates exist. The UI's Check more campaigns follows it; results are not a claimed account-wide total before pagination completes. The query has a 10-second database limit and the action is limited to 60 requests per minute, including dashboard use.

This is a current saved-content reference report, not per-recipient open/click analytics or an immutable send-history audit. Unsaved editor edits are absent. Dynamic images supplied by merge tags, CSS background images and remote URLs never uploaded to the account are outside this first version. Newsletter-level assets that are not saved in campaign content are outside the report.

## Data and compatibility

Optional Upload fields: fileName (original supplied filename, max 200), name (editable display name, max 200), folder (label, max 80), width and height. New uploads read dimensions with Sharp and preserve their supplied filename. The browser passes original names in a percent-encoded x-original-file-name header, retaining the existing slug header for compatibility. File paths still use the existing slug/UUID storage rules.

Existing records remain valid without a migration. Their path basename supplies a fallback label; lost original filenames cannot be recovered automatically. The browser reads loaded image dimensions for display when the stored dimensions are absent. A compound accountId/folder/createdAt index supports folder/date access. Display-name/folder edits never change URLs, files, campaign HTML or per-block alt text/delivery. There is no physical file deletion or replacement in this feature, so old hosted emails keep their images.

Existing list_images and upload_image response shapes stay unchanged. The new list_content_images, update_content_image and list_image_campaigns actions are registered for dashboard, REST and MCP with shared schemas. They use runAction authorization and account-scoped queries. The existing storage backends and Hosted/Embedded pipeline are reused unchanged.

## Validation

Focused tests cover exact URL matching, encoded Code/Social/Video blocks, Markdown and HTML, source/cover roles, punctuation in searches, metadata fallbacks, ownership, pagination/sorting/folders, rename safety, input validation, upload dimensions and list_images compatibility. 47 focused tests passed, including API/MCP parity and help checks. Targeted ESLint and diff whitespace checks passed. Real browser checks covered clipboard upload, persisted name/folder edits, folder/search filters, grid/list views, existing picker reuse and campaign usage after saving a new sample draft. Security source review identified no medium or higher findings. A signed-in-session sample screenshot was saved privately for review; automatic approval review blocked placing it in the public help assets, so that publication is pending user approval. Full-suite/build validation remains pending before a future push. No real email is sent.


### GitHub transfer validation (2026-11-01)
The full isolated run completed 1,525 tests: 1,523 passed and two failed. The Content library added a dashboard-limited action and an account page; the remaining failures identified the missing action expectation in dashboard-limits.test.mjs and the missing /content crawler exclusion in app/robots.js. Both were corrected. All 29 tests in the two affected files then passed, and final repository lint passed. The isolated production build passed with webpack; default Turbopack could not resolve dependencies through the isolated node_modules symlink. A separate source security review found no medium or higher issues. The transfer includes the earlier designer review fixes and the Content library; unrelated sender/dependency changes, backups and the pending Content help screenshot are excluded.
