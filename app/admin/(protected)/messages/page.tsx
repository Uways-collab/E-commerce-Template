import { adminContext } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatDateTime, cn } from "@/lib/utils";
import AdminShell from "@/components/admin/AdminShell";
import { deleteMessageAction, updateMessageStatusAction } from "@/app/actions/admin-marketing";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";

export const metadata = { title: "Messages" };

export default async function AdminMessagesPage() {
  const { user, settings, groups } = await adminContext();
  const messages = db().all<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    subject: string | null;
    message: string;
    status: string;
    created_at: string;
  }>("SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200");

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="Messages"
      description="Enquiries submitted through the contact page, stored in the database so nothing is lost in an inbox."
    >
      <div className="space-y-3">
        {messages.map((message) => (
          <article key={message.id} className="border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[12.5px] font-medium">{message.name}</p>
              <a href={`mailto:${message.email}`} className="text-[11.5px] text-muted underline underline-offset-4">
                {message.email}
              </a>
              {message.phone && <span className="text-[11.5px] text-muted">· {message.phone}</span>}
              <span
                className={cn(
                  "chip",
                  message.status === "new" ? "border-accent/40 text-accent" : "text-muted",
                )}
              >
                {message.status}
              </span>
              <span className="ml-auto text-[10.5px] text-muted">{formatDateTime(message.created_at)}</span>
            </div>
            {message.subject && <p className="mt-1.5 text-[12px]">{message.subject}</p>}
            <p className="mt-1.5 max-w-3xl whitespace-pre-line text-[12.5px] leading-relaxed text-muted">
              {message.message}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-2.5">
              <a
                href={`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject ?? "Your enquiry")}`}
                className="btn btn-sm btn-outline"
              >
                Reply by email
              </a>
              {["new", "replied", "archived"].map((status) => (
                <form key={status} action={updateMessageStatusAction}>
                  <input type="hidden" name="id" value={message.id} />
                  <input type="hidden" name="status" value={status} />
                  <button
                    className={cn(
                      "text-[10.5px] uppercase tracking-[0.1em]",
                      message.status === status ? "text-ink" : "text-muted hover:text-ink",
                    )}
                    disabled={message.status === status}
                  >
                    Mark {status}
                  </button>
                </form>
              ))}
              <form action={deleteMessageAction} className="ml-auto">
                <input type="hidden" name="id" value={message.id} />
                <ConfirmSubmit
                  message={`Delete the message from ${message.name}? This cannot be undone.`}
                  className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-danger"
                >
                  Delete
                </ConfirmSubmit>
              </form>
            </div>
          </article>
        ))}
        {messages.length === 0 && (
          <p className="border border-line bg-surface px-4 py-10 text-center text-[12.5px] text-muted">
            No messages yet.
          </p>
        )}
      </div>
    </AdminShell>
  );
}
