"use client";

import { db } from "./firebase";
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

/**
 * EVACORE Disaster Chaos Simulation Engine
 *
 * Designed for SIH presentation and live testing.
 * Injects realistic, high-stakes emergency disaster scenarios:
 * 1. Severe Cyclone Yaas Storm Surge
 * 2. Rapid Urban Flash Flood Inundation
 *
 * Provides 1-click injection and 1-click clean reset.
 */

export const SIMULATION_SCENARIOS = {
  cyclone_yaas: {
    id: "cyclone_yaas",
    name: "Cyclone Yaas • Severe Storm Surge (Cat 4)",
    windSpeedKmph: 155,
    rainfallMmPerHour: 42,
    threatLevel: "CRITICAL RED ALERT",
    description: "Coastal surge and extreme rainfall causing severe urban flooding across Kalighat, Howrah, and Salt Lake sectors.",
    alerts: [
      {
        id: "sim_sos_1",
        simulated: true,
        name: "Mukherjee Family (7 members)",
        message: "House surrounded by 65cm floodwater near Kalighat canal. 8-month infant and elderly grandmother on tin roof. Water rising fast!",
        category: "trapped",
        urgencyLevel: "high",
        lat: 22.5218,
        lng: 88.3485,
        familySize: 7,
        specialNeeds: ["infant", "elderly"],
        triageScore: 96,
        triagePriority: "P1-CRITICAL",
      },
      {
        id: "sim_sos_2",
        simulated: true,
        name: "Bimal Chatterjee",
        message: "Diabetic patient stranded in Howrah Foreshore Road ground floor. Water entering rooms, insulin running out, mobility impaired.",
        category: "medical",
        urgencyLevel: "high",
        lat: 22.5835,
        lng: 88.3320,
        familySize: 2,
        specialNeeds: ["medical", "disability"],
        triageScore: 91,
        triagePriority: "P1-CRITICAL",
      },
      {
        id: "sim_sos_3",
        simulated: true,
        name: "Ananya Roy & College Students",
        message: "4 university students trapped on car roof near Salt Lake Sector V underpass. Water over car hood, heavy current.",
        category: "trapped",
        urgencyLevel: "high",
        lat: 22.5760,
        lng: 88.4310,
        familySize: 4,
        specialNeeds: ["none"],
        triageScore: 84,
        triagePriority: "P2-HIGH",
      },
      {
        id: "sim_sos_4",
        simulated: true,
        name: "Pooja Mondal",
        message: "Pregnant woman (38 weeks) in active labor pains in Ballygunge. Local street impassable for ordinary taxis.",
        category: "medical",
        urgencyLevel: "high",
        lat: 22.5290,
        lng: 88.3680,
        familySize: 3,
        specialNeeds: ["pregnant"],
        triageScore: 98,
        triagePriority: "P1-CRITICAL",
      },
    ],
    hazards: [
      {
        id: "sim_haz_1",
        simulated: true,
        type: "waterlogged",
        lat: 22.5250,
        lng: 88.3520,
        aiVerified: true,
        aiAnalysis: {
          title: "Arterial Roadway Inundation (70cm Depth)",
          summary: "Turbulent floodwater overtopping road divider near Kalighat canal. High hydraulic drag.",
          confidenceScore: 96,
          waterDepth: { estimatedCm: 70, category: "waist" },
          vehiclePassability: { bikesAndSedans: "BLOCKED", fourByFour: "UNSAFE", zodiacBoats: "CLEARED" },
          recommendation: "Close sector to civilian traffic. Authorize emergency Zodiac raft transit only.",
        },
      },
      {
        id: "sim_haz_2",
        simulated: true,
        type: "power_line",
        lat: 22.5860,
        lng: 88.3380,
        aiVerified: true,
        aiAnalysis: {
          title: "Severed 11kV Overhead Power Cable in Standing Water",
          summary: "Live conductor submerged in 40cm floodwater near Howrah station approach. Area-wide electrocution risk.",
          confidenceScore: 98,
          waterDepth: { estimatedCm: 40, category: "knee" },
          vehiclePassability: { bikesAndSedans: "BLOCKED", fourByFour: "BLOCKED", zodiacBoats: "BLOCKED" },
          recommendation: "Emergency 50m cordon. State electricity board alerted to trip feeder breaker.",
        },
      },
      {
        id: "sim_haz_3",
        simulated: true,
        type: "fallen_tree",
        lat: 22.5710,
        lng: 88.4250,
        aiVerified: true,
        aiAnalysis: {
          title: "Uprooted Banyan Tree Blocking Eastern Bypass",
          summary: "Large tree spanning all 4 lanes with entangled telecom lines. Zero ground transit possible.",
          confidenceScore: 92,
          waterDepth: { estimatedCm: 15, category: "ankle" },
          vehiclePassability: { bikesAndSedans: "BLOCKED", fourByFour: "BLOCKED", zodiacBoats: "BLOCKED" },
          recommendation: "Reroute evacuation traffic via Salt Lake southern corridor. Chainsaw squad dispatched.",
        },
      },
    ],
  },
};

/**
 * Injects simulated disaster alerts and hazards into Firestore (or local state)
 */
export async function injectDisasterSimulation(scenarioKey = "cyclone_yaas") {
  const scenario = SIMULATION_SCENARIOS[scenarioKey] || SIMULATION_SCENARIOS.cyclone_yaas;

  // Save active scenario flag in localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem("evacore_active_simulation", JSON.stringify(scenario));
  }

  // Attempt to write to Firestore if available
  if (db) {
    try {
      // 1. Write SOS alerts
      for (const alert of scenario.alerts) {
        const ref = doc(db, "sos_alerts", alert.id);
        await setDoc(ref, {
          ...alert,
          status: "open",
          raisedAt: serverTimestamp(),
        }, { merge: true });
      }

      // 2. Write Hazards
      for (const hazard of scenario.hazards) {
        const ref = doc(db, "hazards", hazard.id);
        await setDoc(ref, {
          ...hazard,
          status: "active",
          reportedAt: serverTimestamp(),
          verifiedCount: 2,
        }, { merge: true });
      }
    } catch (err) {
      console.warn("Firestore simulation injection fallback to local:", err.message);
    }
  }

  return scenario;
}

/**
 * Wipes simulated records to restore a clean live operational dashboard
 */
export async function clearDisasterSimulation() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("evacore_active_simulation");
  }

  if (db) {
    try {
      const sosSnap = await getDocs(query(collection(db, "sos_alerts"), where("simulated", "==", true)));
      for (const d of sosSnap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }

      const hazSnap = await getDocs(query(collection(db, "hazards"), where("simulated", "==", true)));
      for (const d of hazSnap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    } catch (err) {
      console.warn("Firestore simulation cleanup notice:", err.message);
    }
  }

  return true;
}

/**
 * Checks if a simulation is currently active
 */
export function getActiveSimulation() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("evacore_active_simulation");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
