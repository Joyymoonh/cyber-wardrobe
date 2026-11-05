import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, ScanLine, Sparkles, Wand2, KeyRound } from "lucide-react";
import { currentUser } from "@/lib/auth";
import Image from "next/image";
import { Logo } from "@/components/logo";

const FEATURES = [
  { icon: Camera, title: "拍照入柜", desc: "上传衣物照片，AI 自动识别分类、颜色、风格与季节" },
  { icon: Camera, title: "卡通衣柜", desc: "保留真实照片，生成统一画风的衣物展示图" },
  { icon: ScanLine, title: "身材扫描", desc: "全身照姿态识别估算比例，结合三围判断体型" },
  { icon: Wand2, title: "智能搭配", desc: "按风格、场合、季节从你的衣柜里组合整套穿搭" },
  { icon: KeyRound, title: "自带模型", desc: "接入任意 OpenAI 兼容接口或 Gemini，免费付费都行" },
  { icon: Sparkles, title: "不接模型也能搭", desc: "没配模型时，内置配色与体型规则同样可以搭配" },
];

export default async function Landing() {
  if (await currentUser()) redirect("/wardrobe");
  return (
    <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8">
      <nav className="flex items-center justify-between">
        <Logo />
        <div className="flex gap-2">
          <Link href="/login" className="btn-ghost">登录</Link>
          <Link href="/register" className="btn-primary">免费注册</Link>
        </div>
      </nav>

      <section className="grid items-center gap-12 pt-16 sm:pt-24 lg:grid-cols-[1.1fr_1fr]">
        <div className="animate-fade-up">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-3 py-1 text-xs text-neon-cyan">
            <Sparkles className="size-3.5" aria-hidden /> AI 驱动的数字衣橱
          </p>
          <h1 className="studio-title text-4xl leading-tight tracking-tight sm:text-6xl">
            把日常，穿成<br />
            <span className="neon-text">自己的风格</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-cocoa/75 sm:text-lg">
            拍照导入衣物，扫描身材，让 AI 每天从你已有的衣服里搭出适合你的造型。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary px-6 py-3 text-base">开始整理我的衣柜</Link>
            <Link href="/login" className="btn-ghost px-6 py-3 text-base">已有账号</Link>
          </div>
        </div>

        <div className="relative min-h-[440px] overflow-hidden rounded-[28px] bg-[#e9ede5] p-8"><span className="studio-eyebrow">THE EVERYDAY EDIT</span><Image src="/art/doll-female.png" alt="衣间卡通造型人偶" width={480} height={800} className="absolute bottom-0 left-1/2 h-[360px] w-auto -translate-x-1/2 object-contain"/><div className="absolute bottom-7 left-7 rounded-xl border border-white/70 bg-paper/85 p-4 backdrop-blur"><p className="studio-eyebrow">PERSONAL STYLE</p><p className="studio-title mt-2 text-xl">属于你的衣间</p></div></div>
      </section>

      <section className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass p-6 transition hover:-translate-y-1 hover:border-neon-violet/30">
            <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-[#e9ede5]">
              <f.icon className="size-5 text-neon-cyan" aria-hidden />
            </div>
            <h2 className="font-display text-lg font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-cocoa/75">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
