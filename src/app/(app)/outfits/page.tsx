import { pageUser } from "@/lib/auth";
import { listItems } from "@/lib/items";
import { getBody, getPublicLlmSettings, listOutfits } from "@/lib/store";
import { OutfitsView } from "./outfits-view";

export const metadata = { title: "智能搭配" };

export default async function OutfitsPage() {
  const user = await pageUser();
  const [items, saved, settings, body] = await Promise.all([listItems(user.id), listOutfits(user.id), getPublicLlmSettings(user.id), getBody(user.id)]);
  return (
    <OutfitsView
      items={items}
      initialSaved={saved}
      hasLlm={!!settings}
      hasBody={!!body}
    />
  );
}
