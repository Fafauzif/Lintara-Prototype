/** Keyed draws preserve unrelated demand across edits. No shared RNG stream. */
export function draw(seed:number,identity:number|string,purpose:string):number {
 const input=`${seed}|${identity}|${purpose}`;let hash=2166136261;
 for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,16777619);}
 hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;hash=Math.imul(hash,0x846ca68b);hash^=hash>>>16;
 return (hash>>>0)/4294967296;
}
export class EventHeap {
 private items:{time:number;order:number;run:()=>void}[]=[];private serial=0;
 get size(){return this.items.length;}
 push(time:number,run:()=>void){const event={time,order:this.serial++,run};this.items.push(event);let i=this.items.length-1;while(i>0){const p=(i-1)>>1;if(this.before(this.items[p],event))break;this.items[i]=this.items[p];i=p;}this.items[i]=event;}
 pop(){const first=this.items[0],last=this.items.pop();if(last&&this.items.length){let i=0;while(true){let next=i*2+1;if(next>=this.items.length)break;if(next+1<this.items.length&&this.before(this.items[next+1],this.items[next]))next++;if(this.before(last,this.items[next]))break;this.items[i]=this.items[next];i=next;}this.items[i]=last;}return first;}
 private before(a:{time:number;order:number},b:{time:number;order:number}){return a.time<b.time||(a.time===b.time&&a.order<b.order);}
}
