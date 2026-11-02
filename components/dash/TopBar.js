"use client";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../../lib/client";
import { Brand } from "../auth/AuthShell";

export default function TopBar({ email, plan, staff }) {
  const path = usePathname();
  const router = useRouter();
  const cur = (p) => (path === p || (p !== "/dashboard" && path.startsWith(p)) || (p === "/dashboard" && path.startsWith("/dashboard/cards")) ? "page" : undefined);
  async function logout() {
    await api("/api/auth/logout").catch(() => {});
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="ui-top">
      <Brand light />
      <nav className="ui-nav" aria-label="Main">
        <a href="/dashboard" aria-current={cur("/dashboard")}>
          Cards
        </a>
        <a href="/dashboard/settings" aria-current={cur("/dashboard/settings")}>
          Settings
        </a>
        {staff ? (
          <a href="/admin" aria-current={cur("/admin")}>
            Admin
          </a>
        ) : null}
      </nav>
      <div className="ui-top-right">
        <span className={`ui-plan${plan !== "free" ? " is-pro" : ""}`}>{plan === "top" ? "Top" : plan === "pro" ? "Pro" : "Free"}</span>
        <span className="ui-email">{email}</span>
        <button className="ui-btn-ghost" type="button" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
