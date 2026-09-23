"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FileText, LogOut, Settings, ShieldCheck, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthContext";
import ProfileSettingsModal from "./ProfileSettingsModal";

const sanitizeAvatar = (url) => {
  if (!url || url === "/logo-emblem.png") return "/default-avatar.png";
  return url;
};

const ROLE_PROFILES = {
  admin: {
    defaultName: "State Disaster Admin",
    designation: "System Administrator",
    badge: "ADMIN",
    consoleHref: "/admin",
    avatar: "/default-avatar.png",
  },
  coordinator: {
    defaultName: "District Relief Officer",
    designation: "District Coordinator",
    badge: "COORDINATOR",
    consoleHref: "/coordinator",
    avatar: "/default-avatar.png",
  },
  volunteer: {
    defaultName: "Emergency Response Worker",
    designation: "Relief Volunteer",
    badge: "VOLUNTEER",
    consoleHref: "/volunteer",
    avatar: "/default-avatar.png",
  },
  shop: {
    defaultName: "Camp Ration Manager",
    designation: "Storekeeper / Shopkeeper",
    badge: "SHOPKEEPER",
    consoleHref: "/shop",
    avatar: "/default-avatar.png",
  },
};

const DEFAULT_ROLE_PROFILE = {
  defaultName: "Authorized Official",
  designation: "Relief Personnel",
  badge: "PERSONNEL",
  consoleHref: "/",
  avatar: "/default-avatar.png",
};

export default function ProfileDropdown({ className, ...props }) {
  const { user, role, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Global listener so dashboard headers can trigger profile settings modal
  React.useEffect(() => {
    const handleGlobalOpen = () => setIsSettingsOpen(true);
    window.addEventListener("open-profile-settings", handleGlobalOpen);
    return () => window.removeEventListener("open-profile-settings", handleGlobalOpen);
  }, []);

  const cleanRole = role?.toLowerCase() || "";
  const roleInfo = ROLE_PROFILES[cleanRole] || DEFAULT_ROLE_PROFILE;

  const activeProfile = {
    name: user?.displayName || roleInfo.defaultName,
    email: user?.email || "official@relief.gov",
    avatar: sanitizeAvatar(user?.photoURL) || roleInfo.avatar,
    designation: roleInfo.designation,
    badge: roleInfo.badge,
    consoleHref: roleInfo.consoleHref,
  };

  const handleOpenSettings = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setIsSettingsOpen(true);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut?.();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } catch (e) {
      console.warn("Sign out notice:", e);
    }
  };

  return (
    <>
      <div className={cn("relative", className)} {...props}>
        <DropdownMenu onOpenChange={setIsOpen}>
          <div className="group relative">
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 sm:gap-2.5 rounded-2xl border border-stone-200/80 bg-white/90 p-1 sm:px-2.5 sm:py-1.5 transition-all duration-200 hover:border-stone-300 hover:bg-white hover:shadow-xs focus:outline-none cursor-pointer backdrop-blur-md"
                type="button"
                aria-label="Open profile and account menu"
              >
                {/* Name & Designation on Desktop */}
                <div className="hidden sm:block text-left">
                  <div className="font-bold text-xs text-stone-900 leading-tight tracking-tight font-display max-w-[130px] truncate">
                    {activeProfile.name}
                  </div>
                  <div className="text-[9.5px] text-amber-700 font-semibold leading-tight tracking-tight font-mono max-w-[130px] truncate">
                    {activeProfile.designation}
                  </div>
                </div>

                {/* Avatar with dynamic liquid gradient border */}
                <div className="relative shrink-0">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-amber-400 via-rose-400 to-sky-400 p-0.5 shadow-2xs">
                    <div className="h-full w-full overflow-hidden rounded-full bg-white flex items-center justify-center">
                      <Image
                        alt={activeProfile.name}
                        className="h-full w-full rounded-full object-cover"
                        height={32}
                        src={activeProfile.avatar}
                        width={32}
                        unoptimized
                      />
                    </div>
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-72 origin-top-right rounded-2xl border border-stone-200/90 bg-white/95 p-2 shadow-xl shadow-stone-900/10 backdrop-blur-xl"
              sideOffset={6}
            >
              <div className="space-y-1">
                {/* 1. Official Identity & Console navigation (replaces generic 'Official Console') */}
                <DropdownMenuItem asChild>
                  <Link
                    href={activeProfile.consoleHref}
                    className="group flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200/80 bg-stone-50/80 p-2.5 transition-all duration-200 hover:border-orange-300 hover:bg-orange-50/60 no-underline"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 via-rose-400 to-sky-400 p-0.5 shrink-0 shadow-2xs">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                        <Image
                          src={activeProfile.avatar}
                          alt={activeProfile.name}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover rounded-full"
                          unoptimized
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-stone-900 leading-tight font-display truncate">
                        {activeProfile.name}
                      </div>
                      <div className="text-[10px] text-amber-700 font-semibold font-mono tracking-tight flex items-center gap-1 mt-0.5 truncate">
                        <ShieldCheck className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">{activeProfile.designation}</span>
                      </div>
                      <div className="text-[9.5px] text-stone-400 font-mono truncate mt-0.5">
                        {activeProfile.email}
                      </div>
                    </div>

                    <span className="shrink-0 px-2 py-0.5 rounded-md font-mono text-[9px] font-bold border border-amber-500/25 bg-amber-50 text-amber-800">
                      {activeProfile.badge}
                    </span>
                  </Link>
                </DropdownMenuItem>

                {/* 2. Account Settings (replaces 'AI Mesh') */}
                <DropdownMenuItem
                  onClick={handleOpenSettings}
                  onSelect={handleOpenSettings}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-transparent p-2.5 transition-all duration-200 hover:border-stone-200/80 hover:bg-stone-50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 group-hover:bg-orange-50 group-hover:text-[#FF5A36] transition-colors">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-stone-800 font-display leading-tight group-hover:text-stone-950">
                        Account Settings
                      </div>
                      <div className="text-[10px] text-stone-500 font-sans leading-tight">
                        Name, photo, password & phone
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400 group-hover:text-stone-600">
                    Edit →
                  </span>
                </DropdownMenuItem>

                {/* 3. Disaster Field Guide */}
                <DropdownMenuItem asChild>
                  <Link
                    href="/guide"
                    className="group flex cursor-pointer items-center gap-2.5 rounded-xl border border-transparent p-2.5 transition-all duration-200 hover:border-stone-200/80 hover:bg-stone-50 no-underline"
                  >
                    <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-xs text-stone-800 font-display leading-tight group-hover:text-stone-950">
                      Disaster Field Guide
                    </span>
                  </Link>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="my-1.5 bg-gradient-to-r from-transparent via-stone-200 to-transparent" />

              {/* 4. Sign Out */}
              <DropdownMenuItem asChild>
                <button
                  onClick={handleSignOut}
                  className="group flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-transparent bg-red-500/10 p-2.5 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/15"
                  type="button"
                >
                  <LogOut className="h-4 w-4 text-red-600 group-hover:text-red-700" />
                  <span className="font-bold text-red-600 text-xs font-display group-hover:text-red-700">
                    Sign Out
                  </span>
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </div>
        </DropdownMenu>
      </div>

      {/* Account & Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        roleInfo={roleInfo}
      />
    </>
  );
}
