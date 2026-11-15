import Link from "next/link";
import { adminContext } from "@/lib/admin";
import { listAllReviews } from "@/lib/repositories/marketing";
import { formatDate } from "@/lib/utils";
import AdminShell from "@/components/admin/AdminShell";
import Stars from "@/components/ui/Stars";
import { moderateReviewAction } from "@/app/actions/admin-marketing";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const { user, settings, groups } = await adminContext();
  const reviews = listAllReviews(200);

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="Reviews"
      description="Customer reviews appear on product pages and, when rated four or above, in the homepage testimonial carousel. Hide anything that breaks the house rules."
    >
      <div className="space-y-3">
        {reviews.map((review) => (
          <article key={review.id} className="border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Stars rating={review.rating} size={11} className="text-ink" />
              <span className="text-[12px] font-medium">{review.title ?? "Untitled"}</span>
              <span className="chip">{review.author}</span>
              {review.isVerified && <span className="chip border-success/40 text-success">Verified</span>}
              {!review.isPublished && <span className="chip border-warning/40 text-warning">Hidden</span>}
              <span className="ml-auto text-[10.5px] text-muted">
                {review.productName} · {formatDate(review.createdAt)}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-muted">{review.body}</p>
            <div className="mt-3 flex items-center gap-3 border-t border-line pt-2.5">
              <Link
                href={`/products/${review.productSlug}`}
                target="_blank"
                className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-ink"
              >
                View product
              </Link>
              <form action={moderateReviewAction}>
                <input type="hidden" name="id" value={review.id} />
                <input type="hidden" name="action" value={review.isPublished ? "hide" : "publish"} />
                <button className="text-[10.5px] uppercase tracking-[0.1em] text-ink hover:text-accent">
                  {review.isPublished ? "Hide" : "Publish"}
                </button>
              </form>
              <form action={moderateReviewAction}>
                <input type="hidden" name="id" value={review.id} />
                <input type="hidden" name="action" value="delete" />
                <button className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-danger">Delete</button>
              </form>
            </div>
          </article>
        ))}
        {reviews.length === 0 && (
          <p className="border border-line bg-surface px-4 py-10 text-center text-[12.5px] text-muted">No reviews yet.</p>
        )}
      </div>
    </AdminShell>
  );
}
