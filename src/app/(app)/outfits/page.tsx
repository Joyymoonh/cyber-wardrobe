import { pageUser } from "@/lib/auth";
import { listItems } from "@/lib/items";
import { getBody, getPublicLlmSettings, listOutfits } from "@/lib/store";
import { OutfitsView } from "./outfits-view";

export const metadata = { title: "智能搭配" };

export default async function OutfitsPage() {
  const user = await pageUser();
  return (
    <OutfitsView
      items={await listItems(user.id)}
      initialSaved={await listOutfits(user.id)}
      hasLlm={!!await getPublicLlmSettings(user.id)}
      hasBody={!!await getBody(user.id)}
    />
  );
}
