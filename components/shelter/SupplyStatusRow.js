"use client";

/**
 * SupplyStatusRow - Step F1
 *
 * Polished 3-segment pill control with rounded-full shapes and smooth active states.
 */
export default function SupplyStatusRow({ itemName, status = "adequate", onChange }) {
  const options = [
    {
      value: "adequate",
      label: "Adequate",
      dot: "bg-[#22C55E]",
      activeBg: "bg-gradient-to-r from-[#15803D] to-[#16A34A] text-white border-[#15803D] shadow-xs ring-2 ring-[#16A34A]/20",
      inactive: "border-[#86EFAC] text-[#15803D] bg-[#F0FDF4] hover:bg-[#DCFCE7]",
    },
    {
      value: "low",
      label: "Low",
      dot: "bg-[#F59E0B]",
      activeBg: "bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white border-[#B45309] shadow-xs ring-2 ring-[#D97706]/20",
      inactive: "border-[#FDE68A] text-[#B45309] bg-[#FFFBEB] hover:bg-[#FEF3C7]",
    },
    {
      value: "critical",
      label: "Critical",
      dot: "bg-[#EF4444]",
      activeBg: "bg-gradient-to-r from-[#DC2626] to-[#EF4444] text-white border-[#B91C1C] shadow-xs ring-2 ring-[#DC2626]/20",
      inactive: "border-[#FECACA] text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2]",
    },
  ];

  const supplyIcons = {
    "Drinking Water": (
      <svg className="w-4 h-4 text-[#0284C7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.75c-3.728 0-6.75-3.022-6.75-6.75 0-3.375 5.25-10.5 6.75-12 1.5 1.5 6.75 8.625 6.75 12 0 3.728-3.022 6.75-6.75 6.75z" />
      </svg>
    ),
    "Food": (
      <svg className="w-4 h-4 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75m-15-.75 1.5.75m0 0a3 3 0 0 0 3 0l1.5-.75a3 3 0 0 1 3 0l1.5.75a3 3 0 0 0 3 0l1.5-.75a3 3 0 0 1 3 0l1.5.75" />
      </svg>
    ),
    "Food Rations": (
      <svg className="w-4 h-4 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75m-15-.75 1.5.75m0 0a3 3 0 0 0 3 0l1.5-.75a3 3 0 0 1 3 0l1.5.75a3 3 0 0 0 3 0l1.5-.75a3 3 0 0 1 3 0l1.5.75" />
      </svg>
    ),
    "First Aid / Medicine": (
      <svg className="w-4 h-4 text-[#DC2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    "Baby Formula": (
      <svg className="w-4 h-4 text-[#7C3AED]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    "Blankets": (
      <svg className="w-4 h-4 text-[#059669]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    "Oxygen": (
      <svg className="w-4 h-4 text-[#2563EB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    "Emergency Oxygen": (
      <svg className="w-4 h-4 text-[#2563EB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  };

  const icon = supplyIcons[itemName] || (
    <svg className="w-4 h-4 text-[#6E7973]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
    </svg>
  );

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-[#DCE8E2] last:border-b-0 min-w-0 w-full">
      {/* Title & Live Status Pill */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#F0F7F4] border border-[#DCE8E2] flex items-center justify-center shrink-0 shadow-2xs">
            {icon}
          </div>
          <span className="text-xs sm:text-sm font-bold text-[#1C1917] font-display truncate">{itemName}</span>
        </div>
        <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full shrink-0 border ${
          status === "adequate" ? "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]" :
          status === "low" ? "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]" : "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]"
        }`}>
          {status}
        </span>
      </div>

      {/* Touch-Friendly 3-Segment Pill Options - Always Visible on Phone */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full min-w-0 mt-0.5">
        {options.map((opt) => {
          const isActive = status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`
                min-h-[38px] sm:min-h-[40px] px-1.5 sm:px-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wide
                transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 text-center
                ${isActive
                  ? `${opt.activeBg} font-black shadow-xs`
                  : `${opt.inactive} hover:scale-[1.02] active:scale-98`
                }
              `}
              aria-pressed={isActive}
              title={`Mark ${itemName} as ${opt.label}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-white" : opt.dot}`} />
              <span className="truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
