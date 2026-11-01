# Social blocks and image delivery

## Using the designer

Settings → Social networks and images manages a newsletter's available networks. Each entry has a stable identifier, name, color icon, optional black/white variants, accessible description, optional default profile URL, and a switch to include it in new blocks. Add a network to support a new platform without changing code. Uploading a replacement always writes a new file; old campaigns keep their saved URLs. Removing a catalog entry does not remove the file or rewrite existing campaigns.

The Social block appears in the content dock and works as a block within columns. Its inspector adds/removes/reorders networks, edits destinations and alt text, and controls brand/black/white icons, size (16–64px), spacing (0–40px), alignment, background and padding. A block supports up to 20 entries; a newsletter catalog supports 30. A selected network without an HTTPS destination or icon holds sending. Custom icon variants fall back to the color icon when absent.

Newsletter image delivery defaults to Hosted. Every image and Social block can choose the newsletter default, Hosted or Embedded. These choices can be mixed within a campaign. Previews and public web versions always use stored HTTPS image URLs. Delivered SES emails replace only embedded image sources with CID references and include the matching inline attachments. This is not automatic CID-to-HTTPS fallback in recipients' inboxes.

Embedding is implemented for Amazon SES. Other sending providers reject embedded messages explicitly rather than send broken CID references. Inbox rendering varies; Gmail, Outlook and Apple Mail acceptance tests remain required before production rollout. No real email was sent as part of development validation.

## Image files

Built-in icons are versioned PNG assets in `public/social-icons`. Color, black and white versions are generated from the vendored SVG sources. Source and license information are in that directory. Keep old versioned files when adding updated icons.

For persistent filesystem storage, set `IMAGE_STORAGE_DIR` to a directory outside the checkout and set `APP_URL` to the permanent HTTPS app origin. New uploads receive random UUID filenames, and `/api/image-assets/<name>` serves only supported raster image types with immutable caching. Uploading still requires the signed-in account/action permission and normal upload limits. Filenames must not be changed or overwritten. Back up this directory together with MongoDB. Database-backed Upload records associate files with their owners and allow embedding. Administrators managing files directly must retain the Upload record and use the normal upload API for new files.

S3/CDN and Vercel Blob remain supported when filesystem storage is not configured. Legacy authenticated `/api/dev-images/` files are not made public. Re-upload those images for hosted delivery; embedding can read the account's existing local development images without exposing their source URLs.

Embedding reads only built-in icons or an Upload record belonging to the sending account. External stored URLs use the existing bounded download path with public DNS/address checks at connection time and at redirects. No arbitrary URL is downloaded just because campaign HTML requests embedding. Each image is limited to 4 MB, with 8 MB total raw embedded bytes and 40 unique embedded parts per message. Repeated sources share a CID part. A bounded account-keyed cache reduces repeated reads during batches. Missing, oversized or unowned images cause an explicit failure, not silent hosted fallback. The unsubscribe headers, tenant/configuration set, feedback tags and click/open tracking remain in the sending path.

## Database and compatibility

Additive Newsletter fields:

- `imageDelivery`: `hosted` or `embedded`; missing values behave as `hosted`.
- `socialCatalog`: optional array of `{ id, name, icon, blackIcon, whiteIcon, defaultUrl, alt, selected }`; missing/null uses the built-in catalog.

These fields go through the existing `update_newsletter` action, so dashboard, REST API and MCP use the same validation and account scope. Old settings pages preserve both fields. Restart long-running development processes after schema changes so cached Mongoose models include the fields. No destructive migration or bulk data rewrite is required.

Campaign storage uses the existing `Campaign.html` field:

- Images retain `data-image-delivery="default|hosted|embedded"`.
- Social nodes retain a normalized, URI-encoded JSON snapshot in `data-social`. The editor-only wrapper and selection guides are not sent. The email renderer emits presentation tables with inline dimensions and alt text; the archive renders safe hosted images.

Default social profile changes affect new blocks only. Existing blocks keep their icon/link snapshot. An image or block choosing newsletter-default delivery follows the newsletter delivery setting at send time. Choose an explicit mode to pin it.

Rollback: restore the prior code and stop using the new Social blocks before opening affected drafts in an older editor. Existing delivered messages are unaffected. Keep all immutable asset files; do not remove database fields or image directories as part of a code rollback.

## Validation

Focused model/render/storage tests cover safe Social serialization, HTML/CSS/URL injection rejection, missing-link send holds, defaults snapshots, mixed hosted/CID delivery, duplicate-source deduplication, size failure, unchanged Code blocks, public raster serving, path rejection, account ownership and SES attachment input with tenant/tags/unsubscribe headers. The final targeted run passed 46 tests, including existing rendering, column, divider, image storage and settings-section checks. Targeted ESLint and git diff --check passed. The larger parity test run exceeded its time limit; no full-suite or production build pass is claimed.

Browser acceptance on the development instance: catalog save persisted 14 networks with Hosted default; a synthetic draft inserted Social, displayed all icons, saved destinations, selected black icons and Embedded delivery, and retained all values after refresh. An existing library image was also inserted in the validation draft, set to Embedded, given alt text, and reopened after refresh with both choices retained. Development sending stays off. Production deployment, cross-client delivered-email tests, and full-suite/build validation remain separate release steps.

Development cache versioning: `NEXT_DEPLOYMENT_ID` is passed through next.config.mjs so JavaScript/CSS URLs include a deployment query. Bump it when rolling out designer changes behind a caching proxy. This avoids a normal refresh retaining an older designer bundle. No Cloudflare account settings were changed.

Focused security source review covered settings validation/account scoping, public raster serving, HTML/URL/CSS normalization, owned Upload lookups, local path constraints, connection-time remote-image protections, MIME metadata and attachment bounds. No new unscoped customer query or arbitrary filesystem/URL embedding path was found. This was a focused feature review, not a comprehensive audit.
