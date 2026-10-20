import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { parsePermissions, PERMISSIONS } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { TeamForm } from "@/components/admin/Forms";

export const metadata = { title: "Edit access" };

export default async function EditTeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requirePerm("team");
  const member = await db.user.findUnique({ where: { id } });
  if (!member) notFound();
  if (member.role === "ADMIN" && me.role !== "ADMIN") redirect("/admin/team");
  const grantable = me.role === "ADMIN" ? PERMISSIONS.map((p) => p.key) : parsePermissions(me.permissions);
  return (
    <div>
      <PageHeader title={`Edit access — ${member.name}`} description={member.email} />
      <TeamForm
        member={{ id: member.id, name: member.name, email: member.email, role: member.role, permissions: parsePermissions(member.permissions) }}
        canGrantAdmin={me.role === "ADMIN"}
        grantable={grantable}
      />
    </div>
  );
}
