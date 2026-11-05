import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <div className="relative z-10 min-h-dvh lg:pl-64">
      <AppNav nickname={user.nickname} />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-10">{children}</main>
    </div>
  );
}
