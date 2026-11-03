import {describe,it,expect} from "vitest";
import sharp from "sharp";
import {keepComponent,combineMasks,GARMENT_LABELS} from "@/lib/garment-mask";
import {applyGarmentMask} from "@/lib/garment-extraction";
import {displayImageKey} from "@/lib/item-images";
describe("non-generative garment extraction",()=>{
 it("maps selected types to clothing labels, not the person",()=>{expect(GARMENT_LABELS.top).toEqual(["Upper-clothes"]);expect(GARMENT_LABELS.bottom).toEqual(["Skirt","Pants"]);expect(Object.values(GARMENT_LABELS).flat()).not.toContain("Face");});
 it("selects a single garment without wrapping across row boundaries",()=>{const a=new Uint8ClampedArray([0,0,255,255,0,0]);expect(Array.from(keepComponent(a,3,2,2,0)!)).toEqual([0,0,255,0,0,0]);expect(keepComponent(a,3,2,0,0)).toBeNull();});
 it("combines shoe masks without dropping the second shoe",()=>expect(Array.from(combineMasks([{data:new Uint8Array([255,0]),width:2,height:1,channels:1},{data:new Uint8Array([0,255]),width:2,height:1,channels:1}],2,1))).toEqual([255,255]));
 it("preserves exact original RGB and existing alpha, changes only mask alpha",async()=>{
  const pixels=Buffer.from([23,102,245,255,200,90,15,128]);const input=await sharp(pixels,{raw:{width:2,height:1,channels:4}}).png().toBuffer();
  const mask=await sharp(Buffer.from([255,0]),{raw:{width:2,height:1,channels:1}}).png().toBuffer();
  const out=await applyGarmentMask(input,mask);const result=await sharp(out).raw().toBuffer();expect(Array.from(result)).toEqual([23,102,245,255,200,90,15,0]);
 });
 it("rejects empty or wrongly-sized masks",async()=>{
  const input=await sharp({create:{width:2,height:2,channels:4,background:'red'}}).png().toBuffer();
  const empty=await sharp({create:{width:2,height:2,channels:3,background:'black'}}).png().toBuffer();await expect(applyGarmentMask(input,empty)).rejects.toThrow("没有选中衣物");
  const wrong=await sharp({create:{width:1,height:1,channels:3,background:'white'}}).png().toBuffer();await expect(applyGarmentMask(input,wrong)).rejects.toThrow("尺寸");
 });
 it("respects display selection and falls back safely for legacy records",()=>{
  const i={image:'photo',cutoutImage:'real',cartoonImage:'art'};
  expect(displayImageKey({...i,imageMode:'original'})).toBe('photo');expect(displayImageKey({...i,imageMode:'cutout'})).toBe('real');expect(displayImageKey({...i,imageMode:'cartoon'})).toBe('art');expect(displayImageKey(i)).toBe('art');expect(displayImageKey({...i,cutoutImage:null,imageMode:'cutout'})).toBe('photo');
 });
});
