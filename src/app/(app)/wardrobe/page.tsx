import { pageUser } from "@/lib/auth";
import { listItems } from "@/lib/items";
import { getPublicLlmSettings } from "@/lib/store";
import { WardrobeView } from "./wardrobe-view";

export const metadata = { title: "我的衣柜" };

export default async function WardrobePage() {
  const user = await pageUser();
  const [items, settings] = await Promise.all([listItems(user.id), getPublicLlmSettings(user.id)]);
  return <WardrobeView initialItems={items} hasLlm={!!settings} />;
}
