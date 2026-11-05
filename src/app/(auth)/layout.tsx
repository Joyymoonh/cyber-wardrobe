import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { currentUser } from "@/lib/auth";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await currentUser()) redirect("/wardrobe");
  return (
    <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-8 px-5 py-10">
      <Logo />
      {children}
    </main>
  );
}
