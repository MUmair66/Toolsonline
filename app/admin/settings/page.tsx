import { requirePerm } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/Forms";

export const metadata = { title: "Settings" };

export default async function AdminSettings() {
  await requirePerm("settings");
  const s = await getSettings();
  return (
    <div>
      <PageHeader title="Store settings" description="Configure your store name, currency, shipping and taxes." />
      <SettingsForm s={s} />
    </div>
  );
}
