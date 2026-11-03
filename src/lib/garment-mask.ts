import type { Category } from "./constants";
/** Labels from SegFormer clothes parsing. Outerwear shares Upper-clothes. */
export const GARMENT_LABELS: Record<Category, string[]> = {
  top: ["Upper-clothes"], outer: ["Upper-clothes"],
  bottom: ["Skirt", "Pants"], dress: ["Dress"],
  shoes: ["Left-shoe", "Right-shoe"], bag: ["Bag"],
  accessory: ["Hat", "Sunglasses", "Belt", "Scarf"],
};
/** Keep the connected mask component clicked by the user. No pixels are generated. */
export function keepComponent(mask: Uint8ClampedArray, width: number, height: number, x: number, y: number): Uint8ClampedArray | null {
  const px=Math.floor(x), py=Math.floor(y);
  if(px<0 || py<0 || px>=width || py>=height || mask[py*width+px]<128)return null;
  const out=new Uint8ClampedArray(width*height);
  const queue=new Int32Array(width*height); let head=0,tail=0;
  const start=py*width+px;queue[tail++]=start;out[start]=mask[start];
  while(head<tail){const i=queue[head++], col=i%width;
    for(const n of [col>0?i-1:-1,col<width-1?i+1:-1,i-width,i+width]){
      if(n>=0 && n<out.length && !out[n] && mask[n]>=128){out[n]=mask[n];queue[tail++]=n;}
    }
  }
  return out;
}
export function combineMasks(masks: {data:Uint8Array|Uint8ClampedArray;width:number;height:number;channels:number}[],width:number,height:number):Uint8Array {
  const alpha=new Uint8Array(width*height);
  for(const mask of masks){
    if(mask.width!==width || mask.height!==height)throw new Error("分割蒙版尺寸不匹配");
    for(let i=0;i<alpha.length;i++)alpha[i]=Math.max(alpha[i],mask.data[i*mask.channels]);
  }
  return alpha;
}
