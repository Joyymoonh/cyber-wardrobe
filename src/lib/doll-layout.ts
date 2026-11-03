import type { Category } from "./constants";

// Shared 240 × 400 coordinates for the doll renderer and image-edit prompt.
export const DOLL_LAYOUT = [
 {cat:"bottom",x:87,y:201,w:66,h:159,box:"28 28 64 100"},
 {cat:"dress",x:72,y:115,w:96,h:216,box:"22 20 76 116"},
 {cat:"top",x:61,y:116,w:118,h:103,box:"14 28 92 98"},
 {cat:"outer",x:54,y:114,w:132,h:121,box:"14 26 92 102"},
 {cat:"shoes",x:85,y:350,w:71,h:28,box:"14 62 96 56"},
 {cat:"bag",x:160,y:202,w:48,h:62,box:"20 32 80 98"},
 {cat:"accessory",x:96,y:72,w:48,h:16,box:"6 60 108 34"},
] as const;

export function dollPlacementPrompt(category?:Category){
 const slot=DOLL_LAYOUT.find(l=>l.cat===category);
 const placement=slot?`Target category: ${category}. Its visible outline must fit the rectangle x=${slot.x}, y=${slot.y}, width=${slot.w}, height=${slot.h}.`:"Keep the garment centered and fully visible.";
 return `DOLL ALIGNMENT GUIDE (textual coordinates, not an attached reference image): output a square transparent canvas. Within it, place a centered virtual 240 by 400 doll coordinate frame, scaled uniformly to 90% of canvas height. The frame origin is top-left; x increases rightward and y downward. Doll head center=(120,77), neck=(120,114), shoulder line y=120, waist=(120,204), feet baseline y=378. ${placement} Render ONLY the selected clothing layer, not the doll, body, skin, face, hair, skeleton, guides, coordinates or labels. Use a straight front view, symmetric neutral standing pose, no perspective or rotation; no flat-lay diagonal arrangement. Tops and jackets: neck opening centered x=120, shoulders near y=120, sleeves following relaxed downward arms. Bottoms: waistband at y=201, two separated straight legs. Dresses: neckline near y=115, hem within the target rectangle. Shoes: show a matching pair side by side at the feet baseline. Bags: place to the doll's right. Accessories are positioned at face level only if they are eyewear; for other accessory types preserve the real item and center it in the target slot rather than inventing eyewear. Keep all other pixels transparent. Preserve this canvas and placement; do not auto-crop or add generous arbitrary margins. These are approximate alignment instructions, not a guarantee of pixel-perfect fit.`;
}
