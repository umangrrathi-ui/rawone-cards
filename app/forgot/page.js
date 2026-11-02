import AuthShell from "../../components/auth/AuthShell";
import { ForgotForm } from "../../components/auth/Forms";

export const metadata = { title: "Reset password · RAWONE Cards" };

export default function Forgot() {
  return (
    <AuthShell>
      <h1 className="au-h">Reset your password</h1>
      <ForgotForm />
      <p className="au-alt">
        Remembered it? <a href="/login">Log in</a>
      </p>
    </AuthShell>
  );
}
