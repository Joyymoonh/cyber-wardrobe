import { handler } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { imagePath, readStoredImage } from "@/lib/images";

// Images are private: only the owner can fetch them.
export const GET = handler(async (_req: Request, ctx: RouteContext<"/api/images/[...key]">) => {
  const user = await requireUser();
  const key = (await ctx.params).key.join("/");
  const p = imagePath(key);
  if (!p || !key.startsWith(`${user.id}/`)) throw new HttpError(404, "图片不存在");
  const buf = await readStoredImage(key);
  if (!buf) throw new HttpError(404, "图片不存在");
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=31536000, immutable" },
  });
});
