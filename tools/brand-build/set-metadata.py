"""Set brand metadata on the generated editable deck before validation."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from xml.etree import ElementTree as ET
import sys
p=Path(sys.argv[1]);q=p.with_suffix('.metadata.pptx')
core='http://schemas.openxmlformats.org/package/2006/metadata/core-properties';dc='http://purl.org/dc/elements/1.1/'
ET.register_namespace('',core);ET.register_namespace('dc',dc);ET.register_namespace('dcterms','http://purl.org/dc/terms/');ET.register_namespace('xsi','http://www.w3.org/2001/XMLSchema-instance')
with ZipFile(p) as source,ZipFile(q,'w',ZIP_DEFLATED) as output:
 for item in source.infolist():
  data=source.read(item.filename)
  if item.filename=='docProps/core.xml':
   root=ET.fromstring(data)
   for tag,value in [(f'{{{dc}}}creator','Lintara'),(f'{{{core}}}lastModifiedBy','Lintara'),(f'{{{dc}}}title','Lintara Brand Guidelines'),(f'{{{dc}}}subject','Station Intelligence identity system')]:
    node=root.find(tag)
    if node is None:node=ET.SubElement(root,tag)
    node.text=value
   data=ET.tostring(root,encoding='utf-8',xml_declaration=True)
  output.writestr(item,data)
q.replace(p)
