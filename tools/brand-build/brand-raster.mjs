import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {execFileSync} from 'node:child_process';
const base=path.resolve(import.meta.dirname,'../..');
const root=path.join(base,'public/brand');
await fs.mkdir(path.join(root,'png'),{recursive:true});
for (const name of await fs.readdir(path.join(root,'svg'))) {
 const widths=name.includes('symbol')?[24,64,128,256,512]:[128,256,512,1024,2048];
 for (const width of widths) await sharp(path.join(root,'svg',name)).resize({width}).png().toFile(path.join(root,'png',name.replace('.svg',`-${width}.png`)));
}
await fs.mkdir(path.join(root,'favicon'),{recursive:true});
for(const width of [16,32,48,64,180,192,512])await sharp(path.join(root,'svg/lintara-symbol-primary.svg')).resize(width,width).png().toFile(path.join(root,`favicon/favicon-${width}.png`));
await fs.copyFile(path.join(root,'svg/lintara-symbol-primary.svg'),path.join(root,'favicon/favicon.svg'));
await fs.copyFile(path.join(root,'svg/lintara-symbol-primary.svg'),path.join(root,'favicon.svg'));
for(const name of await fs.readdir(path.join(base,'tmp/brand-concepts')))if(name.endsWith('.svg'))await sharp(path.join(base,'tmp/brand-concepts',name)).resize(312,312).png().toFile(path.join(base,'tmp/brand-concepts',name.replace('.svg','.png')));
execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON,['-c',"from PIL import Image; import sys; Image.open(sys.argv[1]).save(sys.argv[2], sizes=[(16,16),(32,32),(48,48),(64,64)])",path.join(root,'favicon/favicon-512.png'),path.join(root,'favicon/favicon.ico')]);
console.log('Transparent PNG and favicon sizes exported');
