import { redirect } from "next/navigation";
import AuthShell from "../../components/auth/AuthShell";
import { SignupForm } from "../../components/auth/Forms";
import { currentUser } from "../../lib/auth";
import { turnstileSiteKey } from "../../lib/turnstile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create your card · RAWONE Cards" };

export default async function Signup() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <AuthShell>
      <h1 className="au-h">Create your card</h1>
      <p className="au-p">Free to start. Your card can be live in about five minutes.</p>
      <SignupForm siteKey={turnstileSiteKey()} />
      <p className="au-alt">
        Already have an account? <a href="/login">Log in</a>
      </p>
    </AuthShell>
  );
}
