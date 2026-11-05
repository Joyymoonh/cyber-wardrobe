import Image from "next/image";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { currentUser } from "@/lib/auth";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await currentUser()) redirect("/wardrobe");
  return (
    <main className="relative z-10 grid min-h-dvh items-center gap-12 px-6 py-10 lg:grid-cols-2 lg:px-[8vw]">
      <section className="hidden lg:block"><Logo/><p className="studio-eyebrow mt-16">A SPACE FOR YOUR STYLE</p><h1 className="studio-title mt-5 text-5xl leading-tight">让穿衣，<br/>回到喜欢本身。</h1><p className="mt-6 max-w-sm text-sm leading-7 text-cocoa/50">收藏日常，发现搭配。为你已经拥有的衣服，留一间安静的空间。</p><div className="relative mt-8 h-64 max-w-md overflow-hidden rounded-2xl bg-[#e9ede5]"><Image src="/art/doll-female.png" alt="" width={200} height={330} className="absolute bottom-[-48px] left-1/2 h-72 w-auto -translate-x-1/2 object-contain"/></div></section><div className="flex flex-col items-center gap-8"><div className="lg:hidden"><Logo/></div>{children}</div>
    </main>
  );
}
