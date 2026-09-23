"use client";

/**
 * ResourcePriorityList - Step F3
 *
 * Props:
 * - priorityItems: Array<{ shelterId: string, shelterName: string, itemName: string, status: 'critical' | 'low' | 'adequate' }>
 *
 * Renders priority supply shortages sorted critical-first, matching ForecastWarningPanel's forecast-item pattern.
 */
export default function ResourcePriorityList({ priorityItems = [] }) {
  // Filter for low and critical shortages only
  const shortages = priorityItems.filter(
    (item) => item.status === "critical" || item.status === "low"
  );

  if (shortages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E2D7C3] p-6 text-center text-xs text-[#78716C] bg-[#FAF8F5] space-y-1.5 animate-fade-in">
        <div className="w-8 h-8 rounded-full bg-[#ECFDF3] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center mx-auto">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div className="font-semibold text-[#1C1917]">No critical shortages reported</div>
        <p className="text-[11px] text-[#78716C]">
          All district relief shelters currently report adequate supply levels across essential items.
        </p>
      </div>
    );
  }

  const criticalCount = shortages.filter((s) => s.status === "critical").length;
  const lowCount = shortages.filter((s) => s.status === "low").length;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-center justify-center font-bold text-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.948c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold font-display text-[#1C1917]">
              District Resource Priority Heatmap
            </h2>
            <p className="text-[11px] text-[#78716C]">
              Critical camp supply deficits prioritized for immediate relief truck dispatch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {criticalCount > 0 && (
            <span className="badge badge-crit text-[9px]">
              {criticalCount} Critical
            </span>
          )}
          {lowCount > 0 && (
            <span className="badge badge-warn text-[9px]">
              {lowCount} Low
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
        {shortages.map((item, idx) => {
          const isCritical = item.status === "critical";

          return (
            <div
              key={`${item.shelterId}-${item.itemName}-${idx}`}
              className={`
                p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-xs
                ${isCritical
                  ? "bg-[#FFF8F8] border-l-4 border-l-[#DC2626] border-[#FECACA]"
                  : "bg-[#FFFDF5] border-l-4 border-l-[#D97706] border-[#FDE68A]"
                }
              `}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#1C1917] truncate">
                    {item.shelterName || "Relief Shelter"}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#44403C] flex items-center gap-1">
                  <span>Deficit:</span>
                  <span className="text-[#1C1917] underline decoration-[#FF5A1F] decoration-2">
                    {item.itemName}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right space-y-1">
                <span
                  className={`
                    inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border
                    ${isCritical
                      ? "bg-[#FBE7E5] text-[#DC2626] border-[#FECACA]"
                      : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                    }
                  `}
                >
                  {isCritical ? "Critical Shortage" : "Low Supply"}
                </span>
                <div className="text-[10px] text-[#78716C] font-mono">
                  Priority #{idx + 1}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
