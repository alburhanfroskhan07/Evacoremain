"use client";

import React from "react";

/**
 * Base Skeleton Shimmer Box
 */
export function Skeleton({ className = "", ...props }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-bg-secondary/80 bg-gradient-to-r from-bg-secondary via-border/50 to-bg-secondary bg-[length:200%_100%] ${className}`}
      {...props}
    />
  );
}

/**
 * StatCardSkeleton
 */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl bg-bg-card border border-border p-4 shadow-card space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-5 h-5 rounded-md" />
        <Skeleton className="w-20 h-3" />
      </div>
      <Skeleton className="w-16 h-7" />
    </div>
  );
}

/**
 * DashboardSkeleton
 * Skeletons for stats ribbons, controls, and full map view.
 */
export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Title & Subtitle */}
      <div className="space-y-2">
        <Skeleton className="w-48 sm:w-64 h-8" />
        <Skeleton className="w-72 sm:w-96 h-4" />
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Legend Skeleton */}
      <div className="flex items-center gap-4 px-1">
        <Skeleton className="w-28 h-4" />
        <Skeleton className="w-32 h-4 hidden sm:block" />
        <Skeleton className="w-32 h-4 hidden sm:block" />
      </div>

      {/* Map Skeleton */}
      <div className="rounded-2xl border border-border bg-bg-card/70 overflow-hidden shadow-card p-6 h-[480px] sm:h-[520px] flex flex-col items-center justify-center gap-4 text-center">
        <div className="relative">
          <Skeleton className="w-16 h-16 rounded-2xl" />
          <div className="absolute inset-0 flex items-center justify-center text-[#FF5A1F]">
            <svg className="w-7 h-7 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </div>
        </div>
        <div className="space-y-1.5">
          <Skeleton className="w-40 h-4 mx-auto" />
          <Skeleton className="w-56 h-3 mx-auto" />
        </div>
      </div>
    </div>
  );
}

/**
 * TableSkeleton
 * Used when loading admin moderation lists, voucher tables, etc.
 */
export function TableSkeleton({ rows = 4, cols = 5 }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-bg-secondary/40 flex justify-between gap-4">
        <Skeleton className="w-36 h-4" />
        <Skeleton className="w-24 h-4" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-1/3">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              <div className="space-y-1.5 w-full">
                <Skeleton className="w-3/4 h-3.5" />
                <Skeleton className="w-1/2 h-2.5" />
              </div>
            </div>
            <Skeleton className="w-24 h-3.5 hidden sm:block" />
            <Skeleton className="w-16 h-3.5 hidden md:block" />
            <Skeleton className="w-20 h-7 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * CardListSkeleton
 * Used for coordinator shelters or evacuee cards.
 */
export function CardListSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 max-w-4xl">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="rounded-2xl border border-border bg-bg-card p-5 shadow-card space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <Skeleton className="w-40 h-4" />
              <Skeleton className="w-24 h-3" />
            </div>
            <Skeleton className="w-14 h-5 rounded-full" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="w-20 h-3" />
              <Skeleton className="w-12 h-3" />
            </div>
            <Skeleton className="w-full h-3 rounded-full" />
          </div>

          <div className="pt-2 border-t border-border flex justify-between items-center">
            <Skeleton className="w-28 h-3" />
            <Skeleton className="w-24 h-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
