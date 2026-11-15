import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { LoginForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const [user, settings] = await Promise.all([getSessionUser(), getSettings()]);
  if (isAdmin(user)) redirect("/admin");

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1fr_1.1fr]">
      <div className="flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="w-full max-w-[360px]">
          <Link href="/" className="font-display text-[26px] leading-none">
            {settings.brand.name}
          </Link>
          <p className="mt-6 text-[10px] uppercase tracking-[0.18em] text-muted">Store operations</p>
          <h1 className="display-section mt-3">Sign in to administer</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            This area is for store staff. Customers should use the{" "}
            <Link href="/account/login" className="text-ink underline underline-offset-4">
              client sign in
            </Link>
            .
          </p>
          <div className="mt-8">
            <LoginForm next="/admin" />
          </div>
          <p className="mt-6 border-t border-line pt-4 text-[11px] leading-relaxed text-muted">
            Demo credentials: <span className="text-ink">admin@productprohub.com</span> /{" "}
            <span className="text-ink">Admin!2345</span>
          </p>
        </div>
      </div>
      <div className="relative hidden bg-ink lg:block">
        <div className="absolute inset-0 flex flex-col justify-between p-10 text-canvas">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-canvas/50">Product Pro Hub</p>
            <p className="mt-4 max-w-sm font-display text-[36px] leading-[1.05]">
              One template.
              <br />
              Every kind of store.
            </p>
            <p className="mt-4 max-w-xs text-[12.5px] leading-relaxed text-canvas/60">
              Branding, catalogue, delivery, tax and payments are all configuration — no rebuild required when the
              next client arrives.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-6 border-t border-canvas/15 pt-6">
            {[
              { label: "Modules", value: "12" },
              { label: "Payment rails", value: "4" },
              { label: "Vertical presets", value: "6" },
            ].map((stat) => (
              <div key={stat.label}>
                <dd className="font-display text-[26px] leading-none">{stat.value}</dd>
                <dt className="mt-1 text-[9px] uppercase tracking-[0.16em] text-canvas/50">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
