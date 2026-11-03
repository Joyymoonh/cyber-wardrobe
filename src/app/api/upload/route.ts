import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { saveImage, MAX_UPLOAD_BYTES } from "@/lib/images";

import { rateLimit } from "@/lib/store";

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  if (!rateLimit(`upload:${user.id}`, 60, 3600_000)) throw new HttpError(429, "上传较频繁，请稍后再试");
  if (Number(req.headers.get("content-length")) > MAX_UPLOAD_BYTES + 65536) throw new HttpError(413, "图片上限12MB");
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) throw new HttpError(400, "请选择图片");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "图片上限12MB");
  const key = await saveImage(user.id, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ key });
});
