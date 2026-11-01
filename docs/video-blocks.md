# Video blocks

Video is the last item in the content dock. Insert it by clicking or dragging, including into a column. Select its thumbnail or placeholder to open the matching right-side inspector.

Paste an HTTPS video-page URL. YouTube, TikTok, Vimeo, Loom, Dailymotion, Wistia, Twitch, Facebook, Instagram and X are recognized; other HTTPS video-page URLs work with custom thumbnails. The block is a linked thumbnail: readers click it to watch on the provider's website. Native MP4 uploads, in-email playback and AMP video are outside this implementation.

## Thumbnails

Get automatic thumbnail requests public metadata from a fixed endpoint for recognized YouTube, Vimeo, Loom, TikTok, Dailymotion or Wistia URLs. Availability depends on the provider, video privacy and whether the response includes a thumbnail. TikTok's current oEmbed response may omit it. The provider's embed HTML is never inserted or executed. An unavailable automatic thumbnail has an explicit custom-image fallback.

Upload or choose a custom image uses the existing account image library. This supports every HTTPS video link, including providers that require credentials for public metadata. Custom source images are looked up through the current account's Upload record before processing. Existing private development images can be used as sources; their generated posters are saved through the configured permanent storage.

The play button is optional, with a selectable color. Apply thumbnail settings creates a new PNG with the play button baked in, so it appears in hosted and CID-embedded copies without CSS overlays. Unapplied play-button changes hold sending until the thumbnail is updated or the changes are reverted. Source images stay intact. Animated custom images become static posters. Output fits within 1200×1200; image processing has a 32-million-pixel decode limit and the existing 4 MB upload limit. A thumbnail with a play icon must be at least 32×32.

## Controls

- Video URL, detected provider and opening in a new tab.
- Automatic or uploaded/library thumbnail; video title and accessible alt text.
- Play button, color and applying thumbnail settings.
- Alignment, percentage width, email-width cap, background and rounded corners.
- Border style/color/thickness and padding on each side.
- Newsletter-default, Hosted or Embedded thumbnail delivery.
- Duplicate, delete with undo and sibling move up/down.

Embedding uses the existing SES inline-image pipeline. It attaches the thumbnail image; the video remains on its website. Stored HTTPS copies remain for previews and web archives. Existing image ownership checks, total inline limits and repeated-source deduplication apply. The video link participates in normal click tracking.

## Data and API

No new database collection or migration is needed. Video content is stored in the existing Campaign.html field as a normalized URI-encoded JSON `data-video` snapshot. Only approved values, bounded numbers, HTTPS URLs and plain text survive normalization. The editor-only node view and selection outline are not email markup. Email and archive output expand the snapshot into linked-image presentation tables.

The existing `upload_image` action accepts an optional `video` source instead of `url` or `base64`:

```
{
  "video": {
    "url": "https://example.com/video",
    "thumbnailUrl": "https://example.com/an-owned-image.png",
    "showPlay": true,
    "playColor": "#18181b"
  }
}
```

Omit thumbnailUrl to attempt provider metadata. thumbnailUrl must identify an image in the same account's library. The action retains its normal rate/subscription/authorization checks and stores the resulting Upload record and immutable image file. Its output includes videoTitle when metadata supplied one. The dashboard sends these small JSON requests through /api/uploads; normal binary image uploads continue unchanged. Sharp 0.35.5 is now an explicit dependency, matching the installed version.

## Validation and release

Focused tests cover provider hostname matching, spoofed/unsafe URLs, settings round trips, email and archive rendering, CID thumbnail delivery, missing-field and unapplied-setting holds, escaping, metadata HTML rejection, custom-source account checks, provider fallback, raster play overlays and resizing. Existing image/social/column/divider checks are rerun. UI save/reopen and actual provider lookup are checked separately in the development app. Development validation completed on November 1, 2026: 53 focused tests passed, targeted ESLint and diff whitespace checks passed. Real browser checks verified automatic YouTube thumbnail generation, custom library selection, image loading, and saved title/alt/width/Embedded settings after reload. A sample-data help screenshot is included. Source review checked URL normalization, fixed provider endpoints, bounded request/image processing and account-scoped custom sources. Full-suite/build checks and Gmail/Outlook/Apple Mail delivery acceptance remain release validation; no campaign is sent during development checks.

References: Vimeo oEmbed documentation (https://developer.vimeo.com/api/oembed/videos), TikTok embed documentation (https://developers.tiktok.com/docs/en/embed-videos), Loom embed SDK API (https://developers.loom.com/docs/embed-sdk/api).
