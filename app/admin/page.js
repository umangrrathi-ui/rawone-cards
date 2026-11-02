import { redirect } from "next/navigation";
import Admin from "../../components/admin/Admin";
import { currentUser } from "../../lib/auth";

export default async function AdminPage() {
  const u = await currentUser();
  if (!u.totp) redirect("/admin/2fa");
  return <Admin isAdmin={u.role === "admin"} />;
}
