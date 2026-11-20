import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import AccountShell from "@/components/account/AccountShell";
import AddressManager, { type AddressRecord } from "@/components/account/AddressManager";

export const metadata: Metadata = { title: "Saved addresses", robots: { index: false, follow: false } };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const settings = await getSettings();
  const addresses = db().all<AddressRecord>(
    "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at ASC",
    [user.id],
  );

  return (
    <AccountShell
      user={user}
      active="/account/addresses"
      title="Addresses"
      description="Save the places you send pieces to most — checkout will prefill them."
    >
      <AddressManager addresses={addresses} defaultCountry="Nigeria" />
      <p className="mt-6 text-[11px] leading-relaxed text-muted">
        Deliveries are currently fulfilled from {settings.contact.city}. International orders are shipped with DHL.
      </p>
    </AccountShell>
  );
}
