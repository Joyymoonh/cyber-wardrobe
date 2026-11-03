import type { Item } from "./constants";
export type ImageMode="original"|"cutout"|"cartoon";
export function displayImageKey(item:Pick<Item,"image"|"cutoutImage"|"cartoonImage"|"imageMode">):string|null|undefined {
 const mode=item.imageMode || (item.cartoonImage?"cartoon":item.cutoutImage?"cutout":"original");
 return (mode==="cartoon"?item.cartoonImage:mode==="cutout"?item.cutoutImage:item.image) || item.image;
}
