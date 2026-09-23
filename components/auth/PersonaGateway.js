"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import Spinner from "@/components/ui/Spinner";

/**
 * PersonaGateway Component - MeterMate Polish Edition
 *
 * Dedicated entry gate separating:
 * 1. "Person in Need" (Evacuees / Public Citizens) -> Immediate 1-tap crisis access with zero barriers
 * 2. "Government & Responders" (Admin, Coordinator, Volunteer, Shopkeeper) -> Tailored operational consoles
 */
export default function PersonaGateway() {
  const router = useRouter();
  const { signIn } = useAuth();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please provide your official email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await signIn(email.trim(), password);
      const targetPath =
        res.role === "admin"
          ? "/admin"
          : res.role === "shop"
            ? "/shop"
            : res.role === "volunteer"
              ? "/volunteer"
              : "/coordinator";

      // Detect active locale prefix from current path or html
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      const segments = currentPath.split("/").filter(Boolean);
      const locale = ["en", "hi", "bn"].includes(segments[0]) ? segments[0] : "en";
      const destination = `/${locale}${targetPath}`;

      router.push(destination);
    } catch (err) {
      setError(err.message || "Invalid professional credentials. Please verify your email and password.");
      setLoading(false);
    }
  };

  const handleCitizenBypass = () => {
    try {
      localStorage.setItem("evacore_persona", "evacuee");
    } catch {}
    router.push("/register-evacuee");
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-6 animate-fade-in">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white border border-stone-200 shadow-md mb-1 p-2">
          <Image
            src="/logo-emblem.png"
            alt="Evacore Emblem"
            width={48}
            height={48}
            priority
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight">
          <span className="text-stone-900">{t("welcome", "Welcome to")} </span>
          <span className="text-[#FF5A36]">Eva</span>
          <span className="text-[#1B638A]">core</span>
        </h1>
        <p className="text-xs sm:text-sm font-mono text-stone-500 max-w-md mx-auto">
          {t("subtitle", "West Bengal Real-Time Emergency Shelter & Relief Distribution Grid")}
        </p>
      </div>

      {/* Dual Portal Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        
        {/* Track 1: Person In Need (Evacuee / Citizen) */}
        <div className="glass-panel rounded-3xl p-5 sm:p-7 border-2 border-emerald-500/40 shadow-xl flex flex-col justify-between space-y-5 relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/30 to-white">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[10.5px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                {t("publicAccess", "Emergency Public Access")}
              </span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black font-display text-stone-950">
                {t("publicTitle", "I Need Help / Shelter")}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                {t("publicDesc", "Instant access for flood victims, evacuees, and families. Zero password or registration required to find safe shelter and relief vouchers.")}
              </p>
            </div>

            {/* Quick Feature Chips */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-stone-700 bg-white/90 p-2.5 rounded-2xl border border-emerald-100 shadow-2xs">
                <span className="text-base">📍</span>
                <span className="font-semibold">Find Nearest Safe Haven Camp & Bed Availability</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-stone-700 bg-white/90 p-2.5 rounded-2xl border border-emerald-100 shadow-2xs">
                <span className="text-base">🎫</span>
                <span className="font-semibold">Get Offline Digital Family Pass & Food Vouchers</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-stone-700 bg-white/90 p-2.5 rounded-2xl border border-emerald-100 shadow-2xs">
                <span className="text-base">🎙️</span>
                <span className="font-semibold">Multilingual AI Voice Intake (Bengali / Hindi / English)</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCitizenBypass}
            className="
              w-full py-3.5 px-4 rounded-2xl
              bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500
              text-white font-bold font-display text-sm tracking-wide
              shadow-lg shadow-emerald-600/30 active:scale-98 transition-all
              flex items-center justify-center gap-2 cursor-pointer
            "
          >
            <span>{t("publicButton", "Enter Citizen Relief Portal →")}</span>
          </button>
        </div>

        {/* Track 2: Department Credentials Login */}
        <div className="glass-panel rounded-3xl p-5 sm:p-7 border border-stone-200/90 shadow-xl flex flex-col justify-between space-y-5 bg-white/90">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[10.5px] font-mono font-bold uppercase bg-stone-900 text-white shadow-2xs">
                {t("personnelBadge", "Authorized Personnel Only")}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-500 font-semibold">
                <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span>Department Portal</span>
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black font-display text-stone-950">
                {t("personnelTitle", "Sign In with Credentials")}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                {t("personnelDesc", "Log in with your department email and password. You will be automatically routed to your department dashboard.")}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Credential Login Form */}
            <form onSubmit={handleManualLogin} className="space-y-3.5 pt-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold font-mono text-stone-700 uppercase tracking-wider block">
                  {t("emailLabel", "Email Address")}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="e.g. coordinator@relief.gov"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-stone-300 text-xs bg-stone-50/50 hover:bg-white focus:bg-white text-stone-900 outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold font-mono text-stone-700 uppercase tracking-wider block">
                  {t("passwordLabel", "Password")}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-3 rounded-2xl border border-stone-300 text-xs bg-stone-50/50 hover:bg-white focus:bg-white text-stone-900 outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full py-3.5 px-4 rounded-2xl
                    bg-gradient-to-r from-stone-900 to-stone-800 hover:from-black hover:to-stone-900
                    text-white font-bold font-display text-sm tracking-wide
                    shadow-md shadow-stone-900/20 active:scale-98 transition-all
                    flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50
                  "
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Spinner size="sm" className="text-white" />
                      <span>{t("signingIn", "Signing in…")}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{t("signInBtn", "Sign In to Dashboard")}</span>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </form>

            {/* Department Quick Reference Chips */}
            <div className="pt-3 border-t border-stone-200/80 space-y-2">
              <div className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">
                {t("demoNotice", "Department Accounts (Password: demo123456):")}
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("coordinator@relief.gov");
                    setPassword("demo123456");
                  }}
                  className="p-1.5 rounded-xl bg-stone-100/80 hover:bg-stone-200/80 text-stone-800 text-left border border-stone-200/70 transition-colors cursor-pointer"
                  title="Click to fill coordinator credentials"
                >
                  <span className="font-bold">🏕️ Coordinator</span>
                  <div className="text-stone-500 truncate">coordinator@relief.gov</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@relief.gov");
                    setPassword("demo123456");
                  }}
                  className="p-1.5 rounded-xl bg-stone-100/80 hover:bg-stone-200/80 text-stone-800 text-left border border-stone-200/70 transition-colors cursor-pointer"
                  title="Click to fill admin credentials"
                >
                  <span className="font-bold">🛡️ District Admin</span>
                  <div className="text-stone-500 truncate">admin@relief.gov</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("volunteer@relief.gov");
                    setPassword("demo123456");
                  }}
                  className="p-1.5 rounded-xl bg-stone-100/80 hover:bg-stone-200/80 text-stone-800 text-left border border-stone-200/70 transition-colors cursor-pointer"
                  title="Click to fill volunteer credentials"
                >
                  <span className="font-bold">⛑️ SAR Volunteer</span>
                  <div className="text-stone-500 truncate">volunteer@relief.gov</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("shop@relief.gov");
                    setPassword("demo123456");
                  }}
                  className="p-1.5 rounded-xl bg-stone-100/80 hover:bg-stone-200/80 text-stone-800 text-left border border-stone-200/70 transition-colors cursor-pointer"
                  title="Click to fill shop credentials"
                >
                  <span className="font-bold">🛒 Relief Merchant</span>
                  <div className="text-stone-500 truncate">shop@relief.gov</div>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
