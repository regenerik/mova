import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProviders } from "@/components/admin/Providers";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProviders>
      <AdminShell>{children}</AdminShell>
    </AdminProviders>
  );
}
