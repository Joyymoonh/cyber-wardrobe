/* eslint-disable @next/next/no-img-element -- authenticated, private garment images */
import { categoryLabel, type Item } from "@/lib/constants";
import { imageUrl } from "@/lib/client";
import { displayImageKey } from "@/lib/item-images";

const ORDER = ["top", "dress", "outer", "bottom", "shoes", "bag", "accessory"];

/** A complete outfit shown as separate, ordered pieces, without a mannequin. */
export function OutfitFlatLay({ items }: { items: Item[] }) {
  const ordered = [...items].sort((a, b) => {
    const rank = (category: string) => {
      const i = ORDER.indexOf(category);
      return i < 0 ? ORDER.length : i;
    };
    return rank(a.category) - rank(b.category);
  });
  return (
    <ul className="mx-3 grid grid-cols-2 gap-3 rounded-3xl border border-cocoa/10 bg-[#f6eddf] p-3" aria-label="整套衣物平铺展示">
      {ordered.map((item) => {
        const key = displayImageKey(item) || item.cartoonImage || item.cutoutImage || item.image;
        return (
          <li key={item.id} className="min-w-0 overflow-hidden rounded-2xl bg-paper shadow-sm">
            <figure>
              <div className="flex aspect-[4/5] items-center justify-center p-2">
                {key ? <img src={imageUrl(key)!} alt={item.name} loading="lazy" className="h-full w-full object-contain" /> : <span className="px-3 text-center text-sm text-cocoa/60">暂未添加图片</span>}
              </div>
              <figcaption className="border-t border-cocoa/5 px-3 py-2">
                <span className="text-[10px] text-cocoa/60">{categoryLabel(item.category)}</span>
                <p className="mt-0.5 break-words text-xs leading-relaxed">{item.name}</p>
              </figcaption>
            </figure>
          </li>
        );
      })}
    </ul>
  );
}
