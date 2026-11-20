import { adminContext } from "@/lib/admin";
import { listSubscribers } from "@/lib/repositories/marketing";
import { formatDate } from "@/lib/utils";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = { title: "Subscribers" };

export default async function AdminSubscribersPage() {
  const { user, settings, groups } = await adminContext();
  const subscribers = listSubscribers(500);

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="Subscribers"
      description="Everyone who joined the mailing list from the storefront, checkout or account area."
      action={
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(
            ["email,source,created_at", ...subscribers.map((row) => `${row.email},${row.source},${row.created_at}`)].join("\n"),
          )}`}
          download="subscribers.csv"
          className="btn btn-sm btn-outline"
        >
          Export CSV
        </a>
      }
    >
      <div className="border border-line bg-surface overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Source</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((subscriber) => (
              <tr key={subscriber.email}>
                <td>{subscriber.email}</td>
                <td className="capitalize text-muted">{subscriber.source}</td>
                <td className="whitespace-nowrap text-muted">{formatDate(subscriber.created_at)}</td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-[12.5px] text-muted">
                  No subscribers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
