import { Suspense } from "react";
import AuthShell from "../../components/auth/AuthShell";
import { VerifyForm } from "../../components/auth/Forms";

export const metadata = { title: "Verify your email · RAWONE Cards" };

export default function Verify() {
  return (
    <AuthShell>
      <h1 className="au-h">Check your email</h1>
      <Suspense>
        <VerifyForm />
      </Suspense>
    </AuthShell>
  );
}
