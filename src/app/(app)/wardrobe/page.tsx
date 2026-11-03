import { pageUser } from "@/lib/auth";
import { listItems } from "@/lib/items";
import { getPublicLlmSettings } from "@/lib/store";
import { WardrobeView } from "./wardrobe-view";

export const metadata = { title: "我的衣柜" };

export default async function WardrobePage() {
  const user = await pageUser();
  return <WardrobeView initialItems={await listItems(user.id)} hasLlm={!!await getPublicLlmSettings(user.id)} />;
}
