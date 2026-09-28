# Adding the creation-guide videos

The four pages are written guides until recordings are available. Each has one `VIDEO SLOT` comment near the top, and shares `.guide-video` styles. There are no empty public players or video structured-data claims.

| Page | Recording to add | Suggested asset stem |
| --- | --- | --- |
| `/layout/` | Finished mixed photo/video composition, then the actual Layout controls | `layout-demo` |
| `/tutorials/animated-captions/` | Add text, style and position it, then play the result | `animated-captions-demo` |
| `/tutorials/caption-text-effects/` | The same phrase using Orbital Letters, Supernova, and Ember Ash | `caption-effects-demo` |
| `/tutorials/animate-stickers/` | A sticker with two keyframes, then playback of the movement | `sticker-keyframes-demo` |

Keep the original uploads. Preserve their quality; discuss any encoding changes with Cody. Review the recordings against the written instructions and correct labels or order before adding them.

Replace the corresponding comment with a native player following this structure (fill in real paths, dimensions, description, and transcript):

```html
<figure class="guide-video">
  <video controls playsinline preload="none" poster="/assets/videos/ACTUAL-POSTER.jpg"
         width="ACTUAL-WIDTH" height="ACTUAL-HEIGHT" aria-describedby="demo-description">
    <source src="/assets/videos/ACTUAL-VIDEO.mp4" type="video/mp4">
    <track kind="captions" src="/assets/videos/ACTUAL-CAPTIONS.vtt" srclang="en" label="English">
    <a href="/assets/videos/ACTUAL-VIDEO.mp4">Download the video</a>.
  </video>
  <figcaption id="demo-description">Describe what the recording demonstrates.</figcaption>
</figure>
```

Use actual media dimensions so the page reserves the correct space. Include accurate captions for speech or meaningful audio; omit the track for a silent demonstration and retain equivalent written instructions. Add a transcript if the recording covers more than the written guide.

After upload, add VideoObject data only if the visible recording meets the requirements, using its actual duration, thumbnail, publication date, and media URL. Update the page and sitemap modification dates. Run `python3 scripts/validate_site.py` and verify playback on desktop and mobile. Native playback requires no new JS. Use the existing HLS approach only if needed for the delivered media.
