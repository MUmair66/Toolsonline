import Link from "next/link";
import { CheckCheck, Mail, MailOpen, Reply, Trash2, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { deleteMessage, deleteSubscriber, markAllMessagesRead, toggleMessageRead } from "@/actions/admin";
import { ExportLink, PageHeader } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export const metadata = { title: "Inbox & subscribers" };

export default async function AdminMessages({ searchParams }: { searchParams: Promise<{ filter?: string; tab?: string }> }) {
  await requirePerm("messages");
  const { filter, tab } = await searchParams;
  const [messages, unread, subscribers] = await Promise.all([
    db.message.findMany({ where: filter === "unread" ? { read: false } : undefined, orderBy: { createdAt: "desc" } }),
    db.message.count({ where: { read: false } }),
    db.subscriber.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const isSubs = tab === "subscribers";
  const tabCls = (on: boolean) => cn("-mb-px border-b-2 px-4 py-2.5 text-sm font-medium", on ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-900");

  return (
    <div>
      <PageHeader title="Inbox & subscribers" description="Customer enquiries and your newsletter audience.">
        {isSubs ? (
          <ExportLink type="subscribers" label="Export subscribers" />
        ) : (
          unread > 0 && (
            <ConfirmButton action={markAllMessagesRead} className="btn-secondary">
              <CheckCheck className="h-4 w-4" /> Mark all as read
            </ConfirmButton>
          )
        )}
      </PageHeader>
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        <Link href="/admin/messages" className={tabCls(!isSubs && !filter)}>All messages</Link>
        <Link href="/admin/messages?filter=unread" className={tabCls(!isSubs && filter === "unread")}>
          Unread <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{unread}</span>
        </Link>
        <Link href="/admin/messages?tab=subscribers" className={tabCls(isSubs)}>
          Subscribers <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{subscribers.length}</span>
        </Link>
      </div>

      {isSubs ? (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Email</th><th>Subscribed</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.email}</td>
                  <td className="text-slate-500">{formatDate(s.createdAt)}</td>
                  <td className="text-right">
                    <a href={`mailto:${s.email}`} className="btn-ghost !p-2" title="Email"><Mail className="h-4 w-4" /></a>
                    <ConfirmButton action={deleteSubscriber.bind(null, s.id)} message={`Remove ${s.email}?`} className="btn-ghost !p-2 text-red-600" title="Remove">
                      <Trash2 className="h-4 w-4" />
                    </ConfirmButton>
                  </td>
                </tr>
              ))}
              {!subscribers.length && (
                <tr><td colSpan={3} className="!py-12 text-center text-slate-500"><Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />No subscribers yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={cn("card p-5", !m.read && "border-l-4 border-l-brand-600")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={cn("text-sm", !m.read && "font-bold")}>{m.subject}</p>
                  <p className="text-xs text-slate-500">
                    {m.name} &lt;{m.email}&gt; · {new Date(m.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + m.subject)}`} className="btn-ghost !p-2" title="Reply by email"><Reply className="h-4 w-4" /></a>
                  <ConfirmButton action={toggleMessageRead.bind(null, m.id)} className="btn-ghost !p-2" title={m.read ? "Mark as unread" : "Mark as read"}>
                    {m.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                  </ConfirmButton>
                  <ConfirmButton action={deleteMessage.bind(null, m.id)} message="Delete this message?" className="btn-ghost !p-2 text-red-600 hover:!bg-red-50" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </ConfirmButton>
                </div>
              </div>
              <p className="mt-3 text-sm whitespace-pre-line text-slate-700">{m.message}</p>
            </div>
          ))}
          {!messages.length && <div className="card p-12 text-center text-slate-500">No messages.</div>}
        </div>
      )}
    </div>
  );
}
