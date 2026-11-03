import { pageUser } from "@/lib/auth";
import { getPublicLlmSettings } from "@/lib/store";
import { SettingsView } from "./settings-view";

export const metadata = { title: "设置" };

export default async function SettingsPage() {
  const user = await pageUser();
  return <SettingsView initial={await getPublicLlmSettings(user.id)} email={user.email} />;
}
