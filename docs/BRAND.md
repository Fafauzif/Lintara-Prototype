# Lintara identity system

The independent Lintara brand combines a navy L-shaped corridor with an offset orange opening. Three original directions were compared at large cover, monochrome and small browser sizes. The selected offset corridor preserves the clearest L silhouette without trains, AI sparks or an operator logo.

## Source of truth

`public/brand/brand-tokens.json` is authoritative for identity colours, descriptor and font stack. Interface text uses `Arial, sans-serif` with operating-system fallback. Guide editable text uses available Nimbus Sans. The fixed wordmark is outlined DejaVu Sans Bold artwork with custom tracking, not a font dependency.

| Token | HEX | RGB | Role |
| --- | --- | --- | --- |
| navy | #243B75 | 36, 59, 117 | Brand and navigation |
| orange | #F47B20 | 244, 123, 32 | Accent and selected actions |
| background | #F5F7FB | 245, 247, 251 | Page canvas |
| ink | #17233D | 23, 35, 61 | Primary text |
| muted | #667085 | 102, 112, 133 | Secondary text |
| positive | #21866B | 33, 134, 107 | Positive markers |

Contrast calculations use WCAG sRGB relative luminance. White on navy is 10.73:1; ink on orange 5.73:1; muted on white 4.97:1. Orange on white is 2.73:1 and positive on white 4.48:1, so neither is suitable for normal small text. Use dark status labels and colour markers. CMYK values are omitted because no output profile was specified.

## Master assets

Path-only SVG variants provide horizontal, stacked and symbol layouts in primary, mono navy, mono black and white reverse. PNG exports preserve actual alpha transparency at useful sizes. Favicon uses SVG, PNG at 16/32/48/64/180/192/512 and multiresolution ICO. There are no embedded raster images or live wordmark text in SVG masters.

Clear space is at least 14/104 of the symbol canvas on each side of the artwork. The horizontal signature recommendation is 128 CSS px or 28 mm in print, and the standalone symbol recommendation is 24 CSS px. Favicons are deliberate 16/32 px browser exceptions. Minimum-size exports have been visually inspected. Print sizing is guidance rather than a printer-specific qualification.

Use the horizontal primary logo on a light field, mono navy for single-colour print, white reverse on navy and symbol primary for compact application identity. Never stretch, recolour, apply effects, remove geometry, crowd clear space or use a low-contrast field.

## Guide and provenance

The 16-slide guide follows the supplied structural direction: a restrained dark cover, white editorial pages, clear-space and misuse examples, palette and typography, and application examples. It does not reuse the reference brand's artwork, colours or banking identity.

Original code-native identity assets come from `tools/brand-assets.py`; raster sizes come from `tools/brand-build/brand-raster.mjs`. The editable deck builder is `tools/brand-build/brand-guide.mjs` and uses the runtime's `@oai/artifact-tool`. Bundled LibreOffice converts the exact finalized PPTX to PDF so slide/page order and content match. Direct Artifact Tool PDF export is unavailable in this runtime because its internal Helvetica module is missing. Application examples use source-verified specifications and an original scene illustration when available. They make no claim to be finished browser screenshots. Lucide icons retain their ISC license, and wordmark glyph provenance retains the DejaVu font license. No external font downloads or standalone font binaries are required.

## Rebuild

The bundled authoring scripts are optional provenance sources, separate from the portable Vite application. They require the original document/image authoring environment (`@oai/artifact-tool`, native image libraries, font tooling and validation helpers); `npm ci` alone does not install it. Edit the delivered PPTX or SVG masters directly in compatible desktop software without those scripts. In that authoring environment, run the asset generator with its Python runtime and the `.mjs` builders with its Node runtime. Bare imports require a private build-directory symlink to `$CODEX_PRIMARY_RUNTIME_NODE_MODULES` as prescribed by the presentation runtime. Do not include that symlink or `tmp/` in delivery ZIPs.

The guide builder reads an actual screenshot manifest from `tmp/brand-qa/screenshots.json` with keys `hall`, `shop`, `train`, `character`, `desktop`, `tenant`, `comparison`, `mobile`. `--final` refuses to export without every image in screenshot mode. The explicit `--application-specifications` mode uses source-verified native diagrams instead. Draft placeholders stay in private QA files and never enter the delivered guide. Every slide and PDF page must be rendered and visually inspected before publishing a new guide version. Automated package, geometry, font and editability checks supplement that visual review.

## Capture limitation in this delivery

The permitted cloud browser could not open the local live preview, and its security policy blocked local-file navigation. No local browser was available, and the approved decisions did not authorize account publication to obtain screenshots. No workarounds or fabricated application captures were used. The required final application screenshot crops remain unmet. Guide pages 13-15 therefore use source-verified application specifications, editable diagrams and any original scene-source illustration supplied by the scene pipeline. Browser interaction and final WebGL appearance have not been visually verified in this environment. This limitation belongs to the technical handoff, not a fictitious product screenshot.

## Final guide checks

The final guide has 16 editable slides and a matching 16-page PDF. All pages were visually inspected, including the revised palette, background-use and original scene-illustration pages. The final PPTX contains 189 native text objects, one native chart with an embedded XLSX snapshot, one native table and 27 SVG assets. Package, layout, font, native-chart and first-party reimport gates passed with zero findings. PDF metadata names Lintara and the guide title. No native PowerPoint opening or browser capture is claimed.

## Revision 1.1 application handoff

The identity masters and 16-slide guide are unchanged. The guide is the original identity document; its application specification pages and original version-1 illustration are not newly captured version-1.1 screens. Revision 1.1 adds close Hall framing, direct placement, live 2D/mobile planning and three graphics presets. The newly generated bundled scene illustration reflects the revised authored model and Hall camera, while actual final WebGL/application captures remain unavailable.
