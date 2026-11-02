import Settings from "../../../components/dash/Settings";
import { currentUser, isStaff } from "../../../lib/auth";
import { planOf } from "../../../lib/plans";

export default async function SettingsPage() {
  const u = await currentUser();
  return <Settings email={u.email} plan={planOf(u)} planUntil={u.plan_until} staff={isStaff(u)} totp={u.totp} />;
}
