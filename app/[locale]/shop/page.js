"use client";

import RequireAuth from "@/components/auth/RequireAuth";
import ShopRedemptionPage from "@/components/evacuee/ShopRedemptionPage";

export default function ShopPage() {
  return (
    <RequireAuth allowedRoles={["shop", "admin", "coordinator"]}>
      <ShopRedemptionPage />
    </RequireAuth>
  );
}
