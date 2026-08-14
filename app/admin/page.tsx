import { AdminRouteView } from "@/components/admin/Views";
import { Suspense } from "react";

export default function AdminHomePage() {
  return (
    <Suspense fallback={null}>
      <AdminRouteView />
    </Suspense>
  );
}
