import { requirePerm } from "@/lib/auth";
import { parsePermissions, PERMISSIONS } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { TeamForm } from "@/components/admin/Forms";

export const metadata = { title: "Add team member" };

export default async function NewTeamMemberPage() {
  const me = await requirePerm("team");
  const grantable = me.role === "ADMIN" ? PERMISSIONS.map((p) => p.key) : parsePermissions(me.permissions);
  return (
    <div>
      <PageHeader title="Add team member" description="Invite a new admin or staff member, or upgrade an existing customer." />
      <TeamForm canGrantAdmin={me.role === "ADMIN"} grantable={grantable} />
    </div>
  );
}
