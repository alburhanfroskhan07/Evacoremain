"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import Spinner from "@/components/ui/Spinner";

/**
 * RequireAuth - Route Guard Component (Master PRD Section 4)
 *
 * Checks if current user is logged in and has one of the `allowedRoles`.
 * Redirects unauthenticated users to `/login`.
 * Shows a clear "Access Denied" view if authenticated with an unauthorized role.
 *
 * @param {Object} props
 * @param {string[]} props.allowedRoles - array of allowed role strings, e.g. ["coordinator"], ["admin"], ["shop"]
 * @param {React.ReactNode} props.children - child components to render when authorized
 */
export default function RequireAuth({ allowedRoles = [], children }) {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" className="text-[#FF5A1F]" />
        <p className="text-xs text-[#7A7268] font-mono">Authenticating session…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check role authorization
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return (
      <div className="p-6 my-8 rounded-[14px] bg-[#FFFFFF] border border-[#E4DCCC] text-center max-w-md mx-auto shadow-sm">
        <div className="w-12 h-12 rounded-full bg-[#FBE7E5] text-[#DC2626] flex items-center justify-center mx-auto mb-4 border border-[#FECACA]">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold font-display text-[#1C1917] mb-1">
          Access Restricted
        </h2>
        <p className="text-xs text-[#7A7268] mb-4">
          This area requires the <span className="font-semibold text-[#1C1917]">{allowedRoles.join(" or ")}</span> role.
          Your current account role is <span className="font-semibold text-[#FF5A1F]">{role || "unassigned"}</span>.
        </p>
        <div className="flex flex-col gap-2">
          {role === "coordinator" && (
            <button
              type="button"
              onClick={() => router.push("/coordinator")}
              className="btn-primary w-full text-xs"
            >
              Go to Coordinator Dashboard
            </button>
          )}
          {role === "shop" && (
            <button
              type="button"
              onClick={() => router.push("/shop")}
              className="btn-primary w-full text-xs"
            >
              Go to Shop Redemption
            </button>
          )}
          {role === "admin" && (
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="btn-primary w-full text-xs"
            >
              Go to Admin Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
            className="btn-ghost w-full text-xs"
          >
            Sign Out & Switch Account
          </button>
        </div>
      </div>
    );
  }

  return children;
}
