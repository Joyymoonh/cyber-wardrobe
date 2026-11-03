import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "注册" };

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="register" inviteRequired={!!process.env.REGISTRATION_INVITE_CODE || !!process.env.DATABASE_URL} />
    </Suspense>
  );
}
