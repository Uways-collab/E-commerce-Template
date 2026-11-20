import Link from "next/link";
import Image from "next/image";
import { adminContext } from "@/lib/admin";
import { listBanners } from "@/lib/repositories/marketing";
import AdminShell from "@/components/admin/AdminShell";
import BannerForm from "@/components/admin/BannerForm";
import { deleteBannerAction } from "@/app/actions/admin-marketing";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";

export const metadata = { title: "Banners" };

export default async function AdminBannersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { user, settings, groups } = await adminContext();
  const { edit } = await searchParams;
  const banners = listBanners();
  const editing = edit ? banners.find((banner) => banner.id === edit) : undefined;

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="Banners"
      description="Campaign strips shown on the shop page and in the announcement rotation. Hero and story imagery live in Store Settings → Homepage."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {banners.map((banner) => (
            <div key={banner.id} className="flex flex-col gap-3 border border-line bg-surface p-3 sm:flex-row sm:items-center">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden bg-line/40">
                {banner.image && <Image src={banner.image} alt="" fill sizes="96px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[12.5px] font-medium">{banner.title}</p>
                  <span className="chip">{banner.placement}</span>
                  {!banner.isActive && <span className="chip text-muted">hidden</span>}
                </div>
                <p className="mt-0.5 truncate text-[11.5px] text-muted">{banner.subtitle}</p>
                <p className="text-[10.5px] text-muted">→ {banner.href ?? "no link"} · order {banner.sortOrder}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/banners?edit=${banner.id}`}
                  className="text-[10.5px] uppercase tracking-[0.1em] text-ink hover:text-accent"
                >
                  Edit
                </Link>
                <form action={deleteBannerAction}>
                  <input type="hidden" name="id" value={banner.id} />
                  <ConfirmSubmit
                    message="Delete this banner? It disappears from the storefront immediately."
                    className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-danger"
                  >
                    Delete
                  </ConfirmSubmit>
                </form>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <p className="border border-line bg-surface px-4 py-10 text-center text-[12.5px] text-muted">
              No banners yet — create one to run a campaign.
            </p>
          )}
        </div>

        <BannerForm key={editing?.id ?? "new"} banner={editing} />
      </div>
    </AdminShell>
  );
}
