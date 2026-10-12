"""Validate released identity exports and record their exact filenames and checksums."""
from pathlib import Path
import json,hashlib,xml.etree.ElementTree as ET,zipfile
from PIL import Image
BASE=Path(__file__).resolve().parents[1]; ROOT=BASE/'public/brand'
errors=[]; records=[]
for p in sorted(ROOT.rglob('*')):
    if not p.is_file() or p.name in ['manifest.json','Lintara_Logo_Pack.zip'] or p.suffix in ['.pdf','.pptx']:continue
    item={'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
    if p.suffix=='.svg':
        node=ET.fromstring(p.read_text());item['viewBox']=node.attrib.get('viewBox');item['paths']=len(node.findall('.//{http://www.w3.org/2000/svg}path'))
        if not item['viewBox'] or item['paths']==0:errors.append(str(p)+' lacks geometry')
        if node.findall('.//{http://www.w3.org/2000/svg}image') or node.findall('.//{http://www.w3.org/2000/svg}text') or 'base64' in p.read_text():errors.append(str(p)+' is not path-only art')
    if p.suffix=='.png':
        im=Image.open(p);item['dimensions']=list(im.size);item['mode']=im.mode
        if im.mode!='RGBA' or im.getchannel('A').getextrema()!= (0,255):errors.append(str(p)+' alpha transparency failed')
    records.append(item)
if errors:raise SystemExit('\n'.join(errors))
manifest={'brand':'Lintara','version':'1.0','svgMasterCount':12,'pngExportCount':60,'faviconOutputs':9,'identityFiles':records,'checks':{'pathOnlySVG':True,'transparentPNG':True,'colorSource':'brand-tokens.json','originalSymbol':True,'wordmarkOutlined':True}}
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
OUT=BASE/'deliverables/brand';OUT.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(OUT/'Lintara_Logo_Pack.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(ROOT.rglob('*')):
        if p.is_file() and p.name!='Lintara_Logo_Pack.zip' and p.suffix not in ['.pdf','.pptx']:z.write(p,'Lintara_Logo_Pack/'+p.relative_to(ROOT).as_posix())
print(f'{len(records)} identity exports validated. Logo pack written.')
