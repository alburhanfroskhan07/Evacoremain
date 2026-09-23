"use client";

import { useState } from "react";
import Spinner from "@/components/ui/Spinner";

/**
 * IncidentCommanderHUD
 *
 * Autonomous EOC AI Incident Commander Terminal.
 * Demonstrates real agentic tool-calling with live ReAct reasoning steps:
 * [THOUGHT] -> [ACTION / TOOL] -> [OBSERVATION] -> [TACTICAL DIRECTIVE]
 */
export default function IncidentCommanderHUD({ activeSOS = null, onDispatched, toast }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [agentSteps, setAgentSteps] = useState([]);
  const [finalDirective, setFinalDirective] = useState(null);
  const [authorized, setAuthorized] = useState(false);

  const incident = activeSOS || {
    id: "sim_sos_1",
    name: "Mukherjee Family (7 members)",
    message: "House surrounded by 65cm floodwater near Kalighat canal. 8-month infant and elderly grandmother on tin roof. Water rising fast!",
    familySize: 7,
    specialNeeds: ["infant", "elderly"],
    triageScore: 96,
    urgencyLevel: "high",
  };

  const handleRunCommander = async () => {
    setIsRunning(true);
    setCurrentStepIndex(0);
    setAgentSteps([]);
    setFinalDirective(null);
    setAuthorized(false);

    try {
      const res = await fetch("/api/ai/incident-commander", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sosAlert: incident }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Agent execution failed.");
      }

      // Progressive playback of the agent steps for a dramatic, realistic EOC effect
      const steps = data.steps || [];
      for (let i = 0; i < steps.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 380));
        setAgentSteps((prev) => [...prev, steps[i]]);
        setCurrentStepIndex(i + 1);
      }

      setFinalDirective(data.finalDirective);
    } catch (err) {
      console.error("Commander Agent Error:", err);
      toast?.({ type: "error", message: err.message || "Failed to engage Incident Commander." });
    } finally {
      setIsRunning(false);
    }
  };

  const handleAuthorizeMission = () => {
    setAuthorized(true);
    toast?.({
      type: "success",
      message: `Tactical Mission Authorized! Rescue unit ${finalDirective?.assignedVolunteer?.volunteerName} dispatched.`,
    });
    onDispatched?.(finalDirective);
  };

  return (
    <div className="rounded-3xl border-2 border-[#1C1917] bg-[#11100F] text-white p-5 sm:p-6 space-y-4 shadow-2xl relative overflow-hidden font-mono">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-50" />

      {/* Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#DC2626]/20 border border-[#DC2626]/40 flex items-center justify-center text-[#EF4444] shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.25)]">
            <svg className="w-5 h-5 text-[#EF4444] animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M12 12h.008v.008H12V12z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white font-display">
                Autonomous EOC Incident Commander
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/20 border border-[#16A34A]/40 text-[#4ADE80] text-[9.5px] font-bold">
                Agentic AI • ReAct Engine
              </span>
            </div>
            <p className="text-[11px] text-white/60">
              Autonomous multi-tool reasoning for complex search, rescue & casualty routing.
            </p>
          </div>
        </div>

        {/* Trigger Button */}
        <button
          type="button"
          onClick={handleRunCommander}
          disabled={isRunning}
          className="
            px-4 py-2 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#B91C1C] hover:from-[#EF4444] hover:to-[#DC2626]
            text-white text-xs font-bold font-display shadow-lg shadow-[#DC2626]/30 transition-all
            active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2
          "
        >
          {isRunning ? (
            <>
              <Spinner size="sm" className="text-white" />
              <span>Agent Reasoning ({currentStepIndex}/9)…</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <span>Engage AI Commander</span>
            </>
          )}
        </button>
      </div>

      {/* Target Incident Snapshot */}
      <div className="relative z-10 p-3 rounded-2xl bg-white/5 border border-white/10 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold block">
            Target Incident Casualty:
          </span>
          <span className="font-bold text-white text-sm">{incident.name}</span>
          <span className="text-white/60 block text-[11px] max-w-xl truncate">
            &quot;{incident.message}&quot;
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-lg bg-[#DC2626]/30 border border-[#DC2626]/50 text-[#FCA5A5] text-[10px] font-bold uppercase">
            Priority: {incident.triagePriority || "P1-CRITICAL"}
          </span>
          <span className="px-2 py-1 rounded-lg bg-white/10 text-white/80 text-[10px]">
            Family: {incident.familySize} heads
          </span>
        </div>
      </div>

      {/* Agent Live Reasoning Terminal */}
      {agentSteps.length > 0 && (
        <div className="relative z-10 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-[11px] text-white/50 border-b border-white/5 pb-1">
            <span>REAL-TIME AGENTIC TOOL EXECUTION TRACE</span>
            <span>Grounded ReAct Loop</span>
          </div>

          {agentSteps.map((step, idx) => {
            const isThought = step.type === "thought";
            const isAction = step.type === "action";
            const isObservation = step.type === "observation";
            const isDirective = step.type === "directive";

            return (
              <div
                key={idx}
                className={`
                  p-3 rounded-2xl border transition-all text-xs space-y-1.5 animate-fade-in
                  ${isThought ? "bg-[#1E1B18] border-[#D97706]/40 text-[#FDE68A]" : ""}
                  ${isAction ? "bg-[#141B2D] border-[#38BDF8]/40 text-[#BAE6FD]" : ""}
                  ${isObservation ? "bg-[#15231B] border-[#16A34A]/40 text-[#BBF7D0]" : ""}
                  ${isDirective ? "bg-[#2A1715] border-[#EF4444]/60 text-white" : ""}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`
                        px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
                        ${isThought ? "bg-[#D97706]/20 text-[#F59E0B]" : ""}
                        ${isAction ? "bg-[#0284C7]/20 text-[#38BDF8]" : ""}
                        ${isObservation ? "bg-[#16A34A]/20 text-[#4ADE80]" : ""}
                        ${isDirective ? "bg-[#DC2626]/30 text-[#F87171]" : ""}
                      `}
                    >
                      {step.type}
                    </span>
                    <span className="font-bold text-[11px] text-white">{step.title}</span>
                  </div>
                  <span className="text-[9.5px] text-white/40">Step {step.stepIndex || idx + 1}</span>
                </div>

                {/* Content */}
                {step.content && (
                  <p className="text-[11px] leading-relaxed opacity-90 pl-1">{step.content}</p>
                )}

                {/* Tool Action Arguments */}
                {isAction && step.args && (
                  <div className="p-2 rounded-xl bg-black/40 text-[10px] text-[#38BDF8] font-mono border border-white/5">
                    <span className="font-bold uppercase tracking-wider text-[9px] text-[#38BDF8] mr-1">[EXEC]</span>
                    Invoking <span className="font-bold">{step.toolName}</span>: {JSON.stringify(step.args)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Final Tactical Directive Card */}
      {finalDirective && (
        <div className="relative z-10 p-4 rounded-2xl border-2 border-[#16A34A] bg-[#0E2014] space-y-3 animate-fade-in shadow-xl">
          <div className="flex items-start justify-between gap-2 border-b border-[#16A34A]/30 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#4ADE80]">
                  Autonomous Mission Authorization
                </span>
              </div>
              <h3 className="text-sm font-bold text-white font-display mt-0.5">
                Tactical Dispatch Order Generated
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-[#DC2626] text-white text-[10px] font-bold">
              {finalDirective.priorityLevel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
              <span className="text-[10px] text-white/50 block">Assigned Specialist:</span>
              <span className="font-bold text-[#38BDF8] block">
                {finalDirective.assignedVolunteer?.volunteerName} ({finalDirective.assignedVolunteer?.organization})
              </span>
              <span className="text-[10.5px] text-white/80 block">
                {finalDirective.assignedVolunteer?.phone} • ETA ~{finalDirective.assignedVolunteer?.estimatedEtaMinutes} mins
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
              <span className="text-[10px] text-white/50 block">Authorized Transport:</span>
              <span className="font-bold text-[#FBBF24] block">
                {finalDirective.authorizedVehicle}
              </span>
              <span className="text-[10.5px] text-white/80 block truncate">
                Corridor: {finalDirective.tacticalRoute}
              </span>
            </div>
          </div>

          {/* Target Shelter Admission */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] flex items-center justify-between">
            <span className="text-white/60">Target Relief Hub:</span>
            <span className="font-bold text-[#4ADE80]">
              {finalDirective.targetShelter?.shelterName} (Reserved {incident.familySize} berths)
            </span>
          </div>

          {/* Action Button */}
          {!authorized ? (
            <button
              type="button"
              onClick={handleAuthorizeMission}
              className="
                w-full py-2.5 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D]
                text-white font-bold font-display text-xs flex items-center justify-center gap-2
                transition-all active:scale-98 cursor-pointer shadow-lg shadow-[#16A34A]/30
              "
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Execute & Broadcast Mission Order</span>
            </button>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#16A34A]/20 border border-[#16A34A] text-center text-xs font-bold text-[#4ADE80] flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-[#4ADE80]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Mission Authorized. Emergency Volunteer Dispatched & Sector Base Notified.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
