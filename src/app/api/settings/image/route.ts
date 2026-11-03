import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { appDb as db } from "@/lib/database";
import { imageConfig, imageConfigSchema, saveImageConfig } from "@/lib/image-model";
export const GET=handler(async()=>NextResponse.json({settings:await imageConfig((await requireUser()).id)}));
export const PUT=handler(async(req:Request)=>{const u=await requireUser();await saveImageConfig(u.id,imageConfigSchema.parse(await req.json()));return NextResponse.json({settings:await imageConfig(u.id)});});
export const DELETE=handler(async()=>{await db().prepare("DELETE FROM image_configs WHERE user_id=?").run((await requireUser()).id);return NextResponse.json({ok:true});});
