import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import AccountShell from "@/components/account/AccountShell";
import { PasswordForm, ProfileDetailsForm } from "@/components/account/ProfileForms";

export const metadata: Metadata = { title: "Profile", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const row = db().get<{ marketing_opt_in: number; created_at: string }>(
    "SELECT marketing_opt_in, created_at FROM users WHERE id = ?",
    [user.id],
  );

  return (
    <AccountShell
      user={user}
      active="/account/profile"
      title="Profile"
      description="Your details, contact preferences and password."
    >
      <div className="space-y-5">
        <ProfileDetailsForm
          name={user.name}
          phone={user.phone ?? ""}
          email={user.email}
          marketingOptIn={Boolean(row?.marketing_opt_in)}
        />
        <PasswordForm />
        <div className="border border-line bg-surface/60 p-5">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Account</h2>
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-[12px] sm:grid-cols-2">
            <div className="flex justify-between">
              <dt className="text-muted">Member since</dt>
              <dd>{row?.created_at?.slice(0, 10)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Account type</dt>
              <dd className="capitalize">{user.role}</dd>
            </div>
          </dl>
        </div>
      </div>
    </AccountShell>
  );
}
