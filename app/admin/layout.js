import { redirect } from "next/navigation";
import TopBar from "../../components/dash/TopBar";
import { currentUser, isStaff } from "../../lib/auth";
import { planOf } from "../../lib/plans";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · RAWONE Cards" };

export default async function AdminLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!isStaff(user)) redirect("/dashboard");
  return (
    <div className="ui">
      <TopBar email={user.email} plan={planOf(user)} staff />
      {children}
    </div>
  );
}
