import "server-only";
import { appDb as db, transaction } from "./database";
import { HttpError } from "./auth";
export async function reserveImage(userId: string, key: string, bytes: number) {
  if (bytes > 2 * 1024 * 1024) throw new HttpError(413, "云端试用版处理后的图片上限2MB，请换一张较小的图片");
  return transaction(async () => {
    await db().prepare("UPDATE users SET nickname=nickname WHERE id=?").run(userId);
    const total = await db().prepare("SELECT COALESCE(SUM(bytes),0) AS bytes, COUNT(*) AS count FROM stored_images WHERE user_id=?").get(userId);
    if (Number(total?.bytes) + bytes > 100 * 1024 * 1024 || Number(total?.count) >= 400) throw new HttpError(429, "试用图片空间已满，请先删除不用的衣物，或联系邀请人清理未采用的图片");
    await db().prepare("INSERT INTO stored_images(image_key,user_id,bytes,created_at) VALUES(?,?,?,?)").run(key,userId,bytes,Date.now());
  });
}
export async function releaseImage(key: string) { await db().prepare("DELETE FROM stored_images WHERE image_key=?").run(key); }
