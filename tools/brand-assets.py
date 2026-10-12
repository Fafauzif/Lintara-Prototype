"""Create original Lintara vector identity. Wordmark glyphs become paths, no live font dependency."""
from pathlib import Path
import json, html, shutil
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
BASE=Path(__file__).resolve().parents[1]
OUT=BASE/'public/brand'
SVG=OUT/'svg'; SVG.mkdir(parents=True, exist_ok=True)
TOKENS={'name':'Lintara','descriptor':{'en':'Station Intelligence','id':'Inteligensi Stasiun'},'colors':{'navy':'#243B75','orange':'#F47B20','background':'#F5F7FB','ink':'#17233D','muted':'#667085','positive':'#21866B','white':'#FFFFFF'},'typography':{'family':'Arial, sans-serif','weights':[400,600,700],'wordmark':'Outlined DejaVu Sans Bold with custom tracking'},'logo':{'symbolViewBox':'0 0 104 104','clearSpaceUnit':14,'minimumSymbolPx':24,'minimumHorizontalPx':128,'minimumHorizontalPrintMm':28}}
(OUT/'brand-tokens.json').write_text(json.dumps(TOKENS,indent=2)+'\n')
navy=TOKENS['colors']['navy'];orange=TOKENS['colors']['orange']
# The original offset-corridor symbol. Unit grid 14, main corridor width 28.
symbol_paths=[('M18 10H38V62Q38 66 42 66H94V94H18Q10 94 10 86V18Q10 10 18 10Z',navy),('M52 10H86Q94 10 94 18V52H66V42Q66 38 62 38H52Z',orange)]
font=TTFont('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
glyphs=font.getGlyphSet(); cmap=font.getBestCmap(); units=font['head'].unitsPerEm

def text_paths(text,size,ox,baseline,color,tracking=-1.2):
    result=[];x=ox; scale=size/units
    for c in text:
        name=cmap[ord(c)]; pen=SVGPathPen(glyphs);tp=TransformPen(pen,(scale,0,0,-scale,x,baseline));glyphs[name].draw(tp)
        result.append(f'<path fill="{color}" d="{pen.getCommands()}"/>')
        x+=glyphs[name].width*scale+tracking
    return ''.join(result),x

word,_=text_paths('Lintara',68,120,76,navy)
wordonly,end=text_paths('Lintara',68,0,66,navy)
width=round(end+10)

def mark(color=None):
    return ''.join(f'<path fill="{color or col}" d="{d}"/>' for d,col in symbol_paths)

def svg(body,w,h,name):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{html.escape(name)}"><title>{html.escape(name)}</title>{body}</svg>\n'

for variant,color in [('primary',None),('mono-navy',navy),('mono-black','#000000'),('reverse-white','#FFFFFF')]:
    word,_=text_paths('Lintara',68,120,76,color or navy)
    (SVG/f'lintara-horizontal-{variant}.svg').write_text(svg(mark(color)+word,width+120,104,f'Lintara horizontal {variant}'))
    (SVG/f'lintara-symbol-{variant}.svg').write_text(svg(mark(color),104,104,f'Lintara symbol {variant}'))
    sw=width+20; offset=(sw-104)/2
    bottom,_=text_paths('Lintara',68,10,190,color or navy)
    (SVG/f'lintara-stacked-{variant}.svg').write_text(svg(f'<g transform="translate({offset} 0)">{mark(color)}</g>'+bottom,sw,210,f'Lintara stacked {variant}'))

# Private concept comparison, excluded from the released identity.
concept=BASE/'tmp/brand-concepts';concept.mkdir(parents=True,exist_ok=True)
paths=[mark(),f'<path d="M16 16V88H88" stroke="{navy}" stroke-width="24" fill="none"/><path d="M16 52H88V16" stroke="{orange}" stroke-width="16" fill="none"/>',f'<path d="M10 10H94V94H10Z M38 38V66H66V38Z" fill="{navy}" fill-rule="evenodd"/><path d="M66 10H94V38H66Z" fill="{orange}"/>']
for i,p in enumerate(paths,1):(concept/f'direction-{i}.svg').write_text(svg(p,104,104,f'Internal concept {i}'))
license_file=Path('/usr/share/doc/fonts-dejavu-core/copyright')
if license_file.exists():shutil.copyfile(license_file,OUT/'WORDMARK_FONT_LICENSE.txt')
guide_license=Path('/usr/share/doc/fonts-urw-base35/copyright')
if guide_license.exists():shutil.copyfile(guide_license,OUT/'GUIDE_FONT_LICENSE.txt')
icon_license=BASE/'node_modules/lucide-react/LICENSE'
if icon_license.exists():shutil.copyfile(icon_license,OUT/'LUCIDE_ICON_LICENSE.txt')
readme='''# Lintara identity assets\n\nOriginal offset-corridor symbol and outlined wordmark, created for this implementation. This independent brand does not imply ownership or endorsement by a rail operator.\n\nUse `svg/lintara-horizontal-primary.svg` on light backgrounds. Use `reverse-white` on navy, `mono-navy` for single-colour print, and `symbol-primary` for the favicon. SVGs contain actual paths with no embedded raster or live-font dependency.\n\nClear space: at least 14/104 of the symbol canvas on every side of the artwork. Minimum recommended size: horizontal 128 CSS pixels or 28 mm in print; symbol 24 CSS pixels. Favicons include 16 and 32 pixels as intentional browser exceptions.\n\nNever stretch, recolour, add effects, remove a piece, crowd the clear space or place the full-colour logo over photography without a clear light field.\n\nAuthoritative palette and typography: brand-tokens.json. Text uses Arial, sans-serif and system fallbacks. The fixed wordmark uses outlined DejaVu Sans Bold glyphs with custom tracking. Font provenance and license are included. No standalone font binaries are redistributed.\n\nPNG backgrounds are fully transparent. Favicon includes PNG sizes, SVG and a multiresolution ICO. Vector source and generators live in tools/brand-assets.py and tools/brand-raster.mjs.\n'''
(OUT/'README.md').write_text(readme)
print('SVG identity generated',width+120)
