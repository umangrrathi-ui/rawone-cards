import { redirect } from "next/navigation";
import AuthShell from "../../components/auth/AuthShell";
import { LoginForm } from "../../components/auth/Forms";
import { currentUser } from "../../lib/auth";
import { turnstileSiteKey } from "../../lib/turnstile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in · RAWONE Cards" };

export default async function Login() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <AuthShell>
      <h1 className="au-h">Log in</h1>
      <LoginForm siteKey={turnstileSiteKey()} />
      <p className="au-alt">
        New here? <a href="/signup">Create your card</a>
      </p>
    </AuthShell>
  );
}
