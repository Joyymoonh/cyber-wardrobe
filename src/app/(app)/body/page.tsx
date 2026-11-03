import { pageUser } from "@/lib/auth";
import { getBody } from "@/lib/store";
import { BodyView } from "./body-view";

export const metadata = { title: "身材档案" };

export default async function BodyPage() {
  const user = await pageUser();
  return <BodyView initial={await getBody(user.id)} />;
}
