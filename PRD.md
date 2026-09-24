# 🌊 EVACORE — Product Requirements Document (PRD)
## Disaster Operations, Real-Time Shelter Capacity Allocation & Resilient Relief Ecosystem
**Document Version:** 2.0.0 (Production / SIH Edition)  
**Status:** Live & Implemented  
**Repository:** [https://github.com/alburhanfroskhan07/Evacoremain](https://github.com/alburhanfroskhan07/Evacoremain)  
**Live Production URL:** [https://evacore-nu.vercel.app](https://evacore-nu.vercel.app)  
**Production Alias:** [https://evacore-vedant29-codes-projects.vercel.app](https://evacore-vedant29-codes-projects.vercel.app)  
**Hosting Environment:** Vercel Global Edge (Washington, D.C. `iad1`)  

---

## 1. Executive Summary & Vision

### 1.1 Product Identity
**EvacorE** is an ultra-resilient, offline-first emergency disaster response platform engineered to eliminate chaos during rapid-onset natural disasters (such as cyclones, coastal storm surges, and monsoon flash floods). It unifies real-time shelter capacity allocation, AI-powered multilingual evacuee intake, live citizen SOS distress tracking, zero-internet offline ration vouchers, family reunification, and automated volunteer dispatch into a single unified web platform.

### 1.2 Problem Statement & Ground Realities
During severe natural catastrophes (e.g., Cyclone Amphan/Yaas-scale events across West Bengal and coastal India), disaster management frameworks experience catastrophic failures across four critical vectors:
1. **The "Full Shelter" Paradox:** Evacuees navigate flooded roads in panic, only to arrive at relief camps that are already overflowing, forcing hazardous backtracking.
2. **Communication Blackouts:** Traditional cellular networks congest or collapse (0G/2G or complete data drops), leaving citizens unable to call for help and coordinators unable to sync counts.
3. **Manual Coordination Bottlenecks:** Phone-call, spreadsheet, and paper-based tracking break down within hours, causing severe misallocations of life-saving rations, baby food, and medical supplies.
4. **Separated Families & Missing Persons:** Panic during evacuations fragments families across different shelters with no central mechanism for cross-shelter reconciliation.

### 1.3 Mission & Value Proposition
EvacorE bridges the gap between stranded citizens, ground shelter coordinators, volunteer rescue squads, and District Disaster Management Authorities (DDMA / EOC) by ensuring:
- **Zero-Latency Capacity Visibility:** Live color-coded occupancy indicators and flood-safe routing prevent shelter overcrowding before it happens.
- **Resilient Multi-Modal Distress:** High-accuracy live GPS beacon tracking, 1-tap pre-filled Emergency SMS relay (`1070`), and in-browser Web Audio acoustic rescue sirens ensure distress signals pierce through network blackouts.
- **Multilingual AI Accessibility:** Panicked or low-literacy citizens register in < 30 seconds simply by speaking in their native dialect (Bengali, Hindi, English).
- **100% Offline Survival Mode:** PWA-cached emergency passes, IndexedDB queueing, and additive delta syncing ensure the platform functions seamlessly without active internet.

---

## 2. Target Personas & Role-Based Access Control (RBAC)

EvacorE features a streamlined **PersonaGateway** landing page with strict role boundaries:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   EVACORE PERSONA GATEWAY                              │
└───────┬────────────────────┬───────────────────┬───────────────────┬───────────────────┘
        ▼                    ▼                   ▼                   ▼
 ┌──────────────┐     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
 │   Citizen/   │     │     Camp     │    │     EOC      │    │    Field     │
 │   Evacuee    │     │ Coordinator  │    │  Command HQ  │    │  Volunteer   │
 └──────┬───────┘     └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
        │                    │                   │                   │
        │                    │                   │                   ▼
        │                    │                   │            ┌──────────────┐
        │                    │                   │            │ Relief Shop/ │
        │                    │                   │            │  Merchant    │
        │                    │                   │            └──────────────┘
```

| Persona | Primary Goal | Environment Constraints | Access Level & Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Citizen / Evacuee** | Find open shelter, trigger SOS distress beacon, get digital ration pass, find missing kin | Panicked, mobile browser, poor/no cellular connectivity (2G/3G/Offline) | **Public / Anonymous / Pass Vault**: Zero-login barrier. Voice intake, live GPS tracking, SMS fallback, printable PDF pass, acoustic sirens. |
| **Camp Coordinator** | Manage shelter intake, report supply deficits, audit headcount | Relief camp site, tablet/phone, fluctuating cellular coverage | **Authenticated (`coordinator`)**: Modify occupancy steppers (`-5`, `-1`, `+1`, `+5`), update supply triage pills, queue offline deltas. |
| **EOC Admin / Incident Commander** | District-wide oversight, hazard moderation, volunteer dispatch, shelter approvals | District HQ Command Room, multi-monitor desktop, high-speed broadband | **Super Admin (`admin`)**: Approve pending shelters, monitor radar weather, review AI triage queues, execute emergency diverts, run simulations. |
| **Field Volunteer** | Respond to citizen SOS distress, deliver supplies, report road hazards | Flooded terrain, boat/foot patrol, mobile device | **Authenticated (`volunteer`)**: Check in to high-priority SOS rescues, view real-time citizen coordinates, submit hazard photos. |
| **Relief Merchant / Shopkeeper** | Redeem food/water ration vouchers for evacuees without handling physical cash | Local grocery store or ration depot, phone camera | **Authenticated (`shop`)**: HTML5 QR scanner, instantaneous transaction-level voucher redemption with anti-double-spend locks. |

---

## 3. High-Level Architecture & Technology Stack

```
                              ┌─────────────────────────────────────────┐
                              │        Next.js 14.2 (App Router)        │
                              │    Tailwind CSS v4 • Custom Tokens      │
                              │       next-intl (EN / HI / BN)          │
                              └────────────────────┬────────────────────┘
                                                   │
        ┌──────────────────────────────────────────┼──────────────────────────────────────────┐
        ▼                                          ▼                                          ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐  ┌───────────────────────────────┐
│     Client & Perception       │  │    Backend, API & AI Tier     │  │    Offline & Resilience       │
│ • Web Speech API (TTS/STT)    │  │ • Google Gemini 2.0 Flash     │  │ • @ducanh2912/next-pwa        │
│ • Web Audio API Synthesizer   │  │ • Next.js Route Handlers      │  │ • IndexedDB Vault (50MB+)     │
│ • Leaflet.js + OSM Tiles      │  │ • Firebase Admin SDK          │  │ • Additive Delta Sync Engine  │
│ • OSRM Routing Engine         │  │ • In-Memory Fallback Stores   │  │ • jsPDF Client Pass Vector    │
│ • html5-qrcode Scanner        │  │ • Overpass API (OSM Hospitals)│  │ • Native 2G SMS Dispatch      │
└───────────────────────────────┘  └───────────────────────────────┘  └───────────────────────────────┘
                                                   │
                                                   ▼
                              ┌─────────────────────────────────────────┐
                              │      Cloud Database & Security          │
                              │ • Firebase Firestore (NoSQL Live DB)   │
                              │ • Hard Security Rules (Spark Tier Safe) │
                              │ • Firestore Transactions (Anti-Race)    │
                              └─────────────────────────────────────────┘
```

### 3.1 Technology Matrix
- **Frontend Framework:** Next.js 14.2 (React 18 Server Components + Client Hydration)
- **Styling & Aesthetics:** Tailwind CSS v4 with custom disaster tokens, glassmorphism, squircles, multi-layer elevation, and accessible high-contrast palettes.
- **Multilingual Localization:** `next-intl` (full English `en`, Hindi `hi`, and Bengali `bn` parity).
- **AI Intelligence:** Google Gemini 2.0 Flash (`@google/genai` SDK) tuned for low-latency JSON extraction (< 250ms), vision hazard analysis, and triage classification.
- **Mapping & Spatial Routing:** Leaflet.js, OpenStreetMap, OSRM turn-by-turn API with geodesic Haversine fallback, and Overpass API for live hospital queries.
- **Audio & Sensory Hardware:** Web Audio API (OscillatorNode/GainNode) for synthetic acoustic sirens, Web Speech API (`SpeechSynthesis`), and `navigator.vibrate`.
- **Database & Realtime Layer:** Firebase Firestore (`onSnapshot` WebSocket streams) with Firebase Admin SDK server endpoints and robust mock in-memory fallback stores.
- **Offline Storage:** IndexedDB (`idb-storage.js`) providing persistent offline storage for passes, vouchers, and mutation queues.
- **PDF Generation:** `jspdf` for client-side offline vector rendering of ISO ID cards and A4 Family Passes.

---

## 4. Comprehensive Feature Specifications

### 4.1 Module 1: Geospatial Evacuation Grid & Live Map
- **Interactive Multi-Layer Map:** Leaflet-powered disaster grid displaying live shelters, reported road hazards, volunteer locations, and medical centers.
- **Color-Coded Capacity Rings:**
  - 🟢 **Green (0% – 69%):** Adequate capacity, open for intake.
  - 🟡 **Amber (70% – 94%):** Constrained capacity, filling rapidly.
  - 🔴 **Red (95% – 100%):** Camp full, intake diverted.
- **Click-to-Pin Geolocation:** If browser GPS is degraded or IP geolocation is inaccurate in a flood zone, users can tap anywhere on the map to pin their exact location.
- **Turn-by-Turn Disaster Routing:** Integrated OSRM road routing engine automatically routes evacuees along navigable roads. If road hazard reports intersect the path, or if OSRM times out (> 2.5s), the system degrades gracefully to compass geodesic lines.
- **Overpass Hospital Integration:** Real-time query to OpenStreetMap Overpass API for all trauma centers and hospitals within a configurable radius, showing 24/7 ER badges, contact numbers, and 1-tap driving routes. Cached in IndexedDB for 24 hours.
- **Physical TideGauge Component:** A skeuomorphic physical flood gauge post reflecting camp capacity and water alert states.

### 4.2 Module 2: AI Multilingual Voice Intake & Instant Tokenizer
- **Voice-First Registration:** Evacuees or panicked citizens tap the microphone icon and speak in natural colloquial speech (e.g., *"Hum 4 log hain, 2 bache aur ek bujurg ko wheelchair chahiye, Kasba ke paas hain"*).
- **Zero-Latency Client Regex Tokenizer:** As the user speaks, a 0ms client-side regex engine extracts numerical family size, key location tokens, and urgent medical words, instantly populating the form before the cloud API returns.
- **Gemini 2.0 Flash Structured Extraction:** Sends speech transcripts to `/api/ai/extract-evacuee-info` (`temperature: 0.1`, `maxOutputTokens: 256`) to extract structured JSON:
  - `name`: string or null
  - `familySize`: integer
  - `location`: approximate locality text
  - `specialNeeds`: array of flags (`wheelchair`, `infant`, `elderly`, `medical_critical`, `disability`)
  - `urgencyLevel`: `"low"` | `"medium"` | `"high"`
- **Text-to-Speech Guidance:** Built-in Web Speech API voice synthesis (`lib/voice-guidance.js`) speaks prompts and instructions aloud in Hindi (`hi-IN`), Bengali (`bn-IN`), and English (`en-IN`) with garbage collection protection preventing audio clipping.

### 4.3 Module 3: Citizen SOS Distress Engine & Live GPS Tracking
- **Portal-Gated SOS Button:** Floating circular SOS button rendered strictly in the Citizen/Evacuee Portal (`CitizenSOSButton.js`). It automatically hides on administrative, coordinator, volunteer, and shopkeeper routes.
- **Continuous GPS Watch Stream:** Upon trigger, begins high-accuracy GPS tracking (`navigator.geolocation.watchPosition` with `enableHighAccuracy: true`, `maximumAge: 0`).
- **Live Beacon API (`/api/sos/update-location`):** Coordinates (`lat`, `lng`, `accuracy`, `speed`, `heading`) are streamed to the backend and Firestore every few seconds so rescue fleets can track moving citizens.
- **Background Tracking with Minimize:** Evacuees can minimize the emergency modal to browse shelter maps or guide instructions while the live GPS beacon continues streaming in the background.
- **"I Am Rescued" Safety Confirmation:** Prevents accidental cancellation of active distress signals through a two-step confirmation before terminating the beacon.
- **Zero-Data 2G SMS Relay (1070):** When cellular data fails, a single tap opens the device's native SMS messenger pre-filled with exact GPS coordinates, timestamp, and distress message addressed to the State Disaster Control Room (`1070`).
- **National Emergency 112 Hotline:** 1-tap direct phone dialer to national emergency services.
- **Family Location Share:** Generates a direct WhatsApp / SMS broadcast link containing live Google Maps coordinates.
- **Acoustic Rescue Beacon Synthesizer (`lib/acoustic-beacon.js`):**
  Uses the Web Audio API to generate high-penetration acoustic signals entirely in-browser without network downloads:
  1. *Dual-Tone SAR Warble:* Oscillates between 650Hz and 1250Hz for maximum acoustic penetration through wind and rain.
  2. *3.2 kHz Storm Whistle:* Pierces through storm roar and flooding noise.
  3. *International Morse Code SOS:* Generates acoustic `... --- ...` distress sequences.

### 4.4 Module 4: Shelter Capacity Allocation & Coordinator Logistics
- **Rapid Headcount Steppers:** Touch-friendly stepper controls (`-5`, `-1`, `+1`, `+5`) allow camp managers to update occupancy counts in seconds during chaotic intake rushes.
- **Optimistic UI with Auto-Clamp:** Client UI updates immediately while validating bounds (`0 <= occupancy <= capacity`).
- **5-Vector Supply Triage:**
  Monitors 5 core relief necessities: Food Rations, Potable Drinking Water, Medical Supplies, Blankets/Bedding, and Baby Formula.
  - Three-tier pill buttons: **Adequate**, **Low**, and **Critical**.
- **Resource Priority Ranking:** Automatic cross-shelter aggregation sorting camps by supply urgency to guide relief supply trucks.
- **Spark-Tier Firestore Rules:** Enforces mathematical validation (`isValidOccupancyUpdate()`) directly in Firestore security rules, rejecting invalid updates at zero server cost.

### 4.5 Module 5: Offline-First PWA, IDB Vault & Additive Delta Sync
- **Installable Progressive Web App (PWA):** Built using `@ducanh2912/next-pwa`, offering complete offline functionality, home-screen installation on Android/iOS, and fast service worker caching.
- **Asynchronous IndexedDB Vault (`lib/idb-storage.js`):**
  Maintains local databases for:
  - `family_passes`: Encrypted offline credentials.
  - `offline_queue`: Queued coordinator occupancy changes and hazard reports.
  - `vouchers`: Offline voucher cache for shopkeepers.
- **Additive Delta Sync Engine (`lib/offline-sync.js`):**
  Instead of sending absolute occupancy counts (which overwrite concurrent edits), offline changes are queued as numeric deltas (`+4`, `-2`). Upon reconnect, deltas are merged using Firestore's atomic `increment()`, guaranteeing conflict-free multi-coordinator synchronization.
- **Vector PDF Emergency Passes (`lib/pdf-pass.js`):**
  Client-side rendering via `jspdf`:
  - *Standard ID Card (85x54mm):* Compact card with QR code, family head details, and shelter allocation.
  - *Comprehensive A4 Family Pass:* Full dossier with member breakdown, special medical needs, emergency barcodes, and offline instructions.

### 4.6 Module 6: Relief Ration Vouchers & Merchant Anti-Double-Redemption
- **Zero-Capacity Safety Valve:** When all nearby shelters are at 100% capacity, the system automatically issues a Digital Relief Voucher.
- **Cryptographic Unguessable Codes:** Generates 8-character unique alphanumeric identifiers with QR encoding.
- **Transaction-Guarded Merchant Scanner:**
  Shopkeepers use an in-browser camera scanner (`html5-qrcode`). Redemption uses Firestore transactions (`runTransaction`), preventing double-redemption race conditions even if a voucher is scanned simultaneously at two counters.
- **Configurable Expiration:** Standard 72-hour TTL prevents hoarding or secondary-market abuse.
- **AI Anomaly Flagging (`/api/ai/flag-voucher-anomalies`):** Identifies rapid repeated redemptions or geographical anomalies for administrator audit.

### 4.7 Module 7: Missing Persons & Family Reunification
- **Multi-Camp Family Matching:** Evacuees can record missing family members during intake.
- **Fuzzy Levenshtein & Phonetic Tolerance:** Solves spelling discrepancies and transliteration errors between Bengali, Hindi, and English names.
- **Shelter Sightings Photo Repo (`/api/shelter-sightings`):** Coordinators can photograph arriving evacuees.
- **AI Visual & Description Matching (`/api/ai/match-family-photo`):** Compares reported descriptions and photos against shelter sightings, automatically alerting coordinators when a match is discovered.

### 4.8 Module 8: Volunteer Network & Automated Incident Dispatch
- **Volunteer Onboarding & Task Check-In:** Volunteers register with skill tags (First Aid, Boat Rescue, Food Distribution, Vehicle Transport).
- **AI Auto-Dispatch (`/api/ai/auto-dispatch`):** Automatically evaluates active SOS alerts, calculates proximity, assesses volunteer skill compatibility, and generates 1-click dispatch assignments.
- **Crowdsourced Hazard Reporting:** Volunteers and citizens report flooded roads, fallen power lines, and collapsed bridges with photos.
- **AI Hazard Vision Verification (`/api/ai/analyze-hazard-image`):** Evaluates uploaded photos using Gemini Vision to verify authenticity and estimate flood depth.

### 4.9 Module 9: EOC Command Center & Disaster Chaos Simulator
- **District Telemetry & Weather Radar:** Live monitoring of rainfall rate (mm/h), wind speed (km/h), barometric pressure, and regional flood alert levels.
- **AI Shelter Overflow Forecaster (`/api/ai/forecast-shelter`):** Analyzes recent occupancy velocity and incoming storm paths to project camp overflow 2 to 6 hours in advance, providing a 1-click **"Divert Intake"** command.
- **AI Incident Commander Assistant (`/api/ai/incident-commander`):** Natural-language conversational copilot for EOC directors to query district resources (e.g., *"Which camps in Howrah have critical baby food shortages?"*).
- **Disaster Chaos Simulation Engine (`lib/simulation.js`):** Built-in high-stakes scenario simulator for live demonstrations and drills:
  1. *Scenario 1: Cyclone Yaas Severe Storm Surge (Cat 4)*
  2. *Scenario 2: Urban Flash Flood & Canal Breach*
  Includes 1-click chaotic scenario injection (spawning trapped families, medical panics, flooded roads) and 1-click clean database reset.

---

## 5. Complete Data Model & Schema Specifications

### 5.1 `shelters`
```typescript
interface Shelter {
  id: string;                         // Auto-generated Firestore ID
  name: string;                       // e.g. "Salt Lake Community Hall Camp #4"
  lat: number;                        // Latitude (WGS84)
  lng: number;                        // Longitude (WGS84)
  totalCapacity: number;              // Maximum allowable occupants
  currentOccupancy: number;           // Current real-time occupants (0 <= n <= totalCapacity)
  contactNumber: string;              // Camp phone hotline
  coordinatorUid: string;             // Firebase Auth UID of assigned coordinator
  status: "pending" | "approved";     // Admin verification gate
  supplies: {
    food: "adequate" | "low" | "critical";
    water: "adequate" | "low" | "critical";
    medical: "adequate" | "low" | "critical";
    blankets: "adequate" | "low" | "critical";
    babyFood: "adequate" | "low" | "critical";
    lastUpdated?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 5.2 `evacuees`
```typescript
interface Evacuee {
  id: string;                         // Unique ID
  name: string;                       // Primary family contact name
  familySize: number;                 // Total head count including registrant
  lat: number;                        // Registration latitude
  lng: number;                        // Registration longitude
  assignedShelterId: string | null;   // Matched shelter, or null if vouchers issued
  missingFamilyMemberName?: string;   // For family reunification matching
  specialNeeds: Array<"wheelchair" | "infant" | "elderly" | "medical_critical" | "disability">;
  urgencyLevel: "low" | "medium" | "high";
  rawIntakeTranscript?: string;       // Original speech transcript (if voice used)
  registeredAt: Timestamp;
}
```

### 5.3 `sos_alerts`
```typescript
interface SOSAlert {
  id: string;                         // Alert ID
  lat: number;                        // Current GPS Latitude
  lng: number;                        // Current GPS Longitude
  liveLat?: number;                   // Dynamically updated beacon latitude
  liveLng?: number;                   // Dynamically updated beacon longitude
  accuracy?: number;                  // GPS accuracy radius in meters
  speed?: number;                     // Current travel speed (m/s)
  heading?: number;                   // Direction of movement (degrees)
  isLiveTracking: boolean;            // Flag indicating active background GPS streaming
  lastLiveLocationUpdate?: Timestamp; // Timestamp of latest GPS ping
  name?: string;                      // Citizen name or "Anonymous Citizen"
  message?: string;                   // Text/Voice description of emergency
  category: "medical" | "trapped" | "food_water" | "structural" | "other";
  urgencyLevel: "low" | "medium" | "high";
  triagePriority?: "P1-CRITICAL" | "P2-URGENT" | "P3-STANDARD";
  triageScore?: number;               // 0 - 100 AI priority rank
  status: "open" | "assigned" | "resolved";
  assignedVolunteerId?: string;       // Dispatched volunteer UID
  raisedAt: Timestamp;
  resolvedAt?: Timestamp;
}
```

### 5.4 `vouchers`
```typescript
interface Voucher {
  id: string;                         // Voucher ID
  code: string;                       // Cryptographic redemption code (e.g. "EVAC-8841-K7")
  evacueeId: string;                  // Associated evacuee document ID
  familySize: number;                 // Number of ration allotments authorized
  status: "unused" | "used" | "expired";
  issuedAt: Timestamp;
  expiresAt: Timestamp;               // issuedAt + 72 hours
  redeemedAt?: Timestamp;
  redeemedByShopId?: string;          // Authenticated merchant UID
}
```

### 5.5 `hazards`
```typescript
interface Hazard {
  id: string;                         // Hazard ID
  lat: number;                        // Location Latitude
  lng: number;                        // Location Longitude
  type: "flooding" | "road_blocked" | "power_line" | "bridge_collapse" | "other";
  severity: "moderate" | "severe" | "impassable";
  description: string;
  imageUrl?: string;                  // Cloud storage URL
  aiVerified?: boolean;               // Verified by Gemini Vision
  reportedBy: string;                 // User ID or "Citizen"
  reportedAt: Timestamp;
  status: "active" | "cleared";
}
```

---

## 6. Security, Privacy & Safeguard Architecture

### 6.1 Firestore Security Rules (Free Spark Tier Hard Backstop)
- **Role Verification:** Client writes require valid Firebase Auth tokens with assigned custom claims (`coordinator`, `admin`, `volunteer`, `shop`).
- **Coordinator Scoping:** Coordinators can only modify documents where `coordinatorUid == request.auth.uid`.
- **Mathematical Clamping:** Security rules validate `currentOccupancy <= totalCapacity` and `currentOccupancy >= 0`, rejecting out-of-bounds writes without requiring Cloud Functions.
- **Admin Approval Gate:** Shelters created by coordinators default to `status: "pending"` and cannot appear on the public evacuee map until reviewed and approved by an admin.

### 6.2 Transaction-Safe Voucher Redemption
To eliminate double-redemption vulnerabilities, all merchant redemptions execute inside an atomic Firestore `runTransaction`:
```javascript
await runTransaction(db, async (transaction) => {
  const voucherDoc = await transaction.get(voucherRef);
  if (!voucherDoc.exists()) throw new Error("Invalid voucher code.");
  if (voucherDoc.data().status !== "unused") throw new Error("Voucher already redeemed.");
  if (voucherDoc.data().expiresAt.toMillis() < Date.now()) throw new Error("Voucher expired.");
  
  transaction.update(voucherRef, {
    status: "used",
    redeemedAt: serverTimestamp(),
    redeemedByShopId: shopId,
  });
});
```

### 6.3 PII Minimization & 7-Day Privacy TTL
- Evacuee health conditions are restricted to standardized categorical enums (`wheelchair`, `infant`, `medical_critical`) rather than unstructured personal medical notes.
- Temporary digital relief passes and live GPS tracking tokens expire automatically after 7 days, purging historical location telemetry.

---

## 7. Non-Functional Requirements (NFRs) & Constraints

| Parameter | Specification | Verification Method |
| :--- | :--- | :--- |
| **Response Latency** | Dashboard updates reflect across clients in **< 1.5 seconds**. | Firestore WebSocket `onSnapshot` benchmarks. |
| **AI Processing Time** | Voice-to-JSON extraction completes in **< 300ms**. | Server timing headers on `/api/ai/extract-evacuee-info` with Gemini 2.0 Flash. |
| **Zero-Cost Deployment** | 100% executable within free tiers (Firebase Spark, Vercel Hobby, OpenStreetMap/OSRM). | Zero paid API dependencies or mandatory billing setup. |
| **Network Resilience** | Fully functional in 0G/2G offline conditions with local caching and SMS fallback. | Chrome DevTools Network Offline throttling and IndexedDB audit. |
| **Browser Compatibility** | Chrome, Edge, Safari, Firefox on Android, iOS, Windows, macOS, Linux. | Cross-browser testing suite and PWA install validation. |
| **Accessibility (a11y)** | High-contrast emergency themes, WCAG 2.1 AA compliance, full screen-reader support. | Lighthouse Accessibility score $\ge 95$. |

---

## 8. Technical Roadmap & Honesty Matrix

The following matrix documents current implementations versus future enterprise v2 targets:

| Domain | Current Implementation (v1.0 Production) | Enterprise Roadmap (v2.0 Scale) |
| :--- | :--- | :--- |
| **Offline Sync Conflict Resolution** | **Additive Delta Merging:** Queues signed occupancy adjustments (`+5`, `-2`) and merges via Firestore `increment()`. | Full CRDT (Conflict-Free Replicated Data Type) or operational transformation engine for multi-master sync. |
| **Emergency 2G SMS Broadcast** | **Pre-Formatted SMS Relay:** Direct 1-tap intent opening native SMS app pre-populated with GPS coordinates to `1070`. | Direct hardware GSM modem AT-command dispatch on dedicated native Android builds. |
| **Evacuation Routing Engine** | **OSRM with Geodesic Fallback:** Queries OSRM road network; falls back to Haversine geodesic vectors if unreachable. | Self-hosted edge OSRM cluster deployed with regional disaster elevation topological maps. |
| **Speech-to-Text (STT) Offline Gate** | **Hybrid Pipeline:** Web Speech API online; degrades to 0ms client regex parser when disconnected. | Embedded on-device WebAssembly Whisper model for local speech-to-text. |
| **Voucher Double-Redemption** | **Optimistic Terminal Lock + Cloud Transactions:** Scanned vouchers lock in local IDB; Firestore transactions prevent cloud collisions. | Local mesh peer-to-peer Bluetooth / Wi-Fi Direct ledger sync between nearby merchant terminals. |
| **Credential Privacy** | **Categorical Enums & 7-Day TTL:** Strict sanitization of medical data with auto-expiring passes. | Zero-Knowledge Proof (ZKP) credentials and asymmetric public-key pass encryption. |

---

## 9. Comprehensive SIH / Demonstration Script

Follow this step-by-step procedure to showcase all platform capabilities during an evaluation or hackathon pitch:

1. **Persona Entry & Gatekeeper Check:**
   - Open the web app; observe the **PersonaGateway** landing screen.
   - Select **Citizen / Evacuee** portal. Observe that the circular floating **SOS Panic Button** appears with live pulse animations.
2. **AI Voice Intake Demonstration:**
   - Navigate to **Register Evacuee**.
   - Tap the microphone and speak in colloquial Hindi/Bengali: *"Mera naam Rahul hai, 5 log hain, Salt Lake stadium ke paas hain, ek bujurg ko wheelchair chahiye."*
   - Show the 0ms client regex tokenizer updating fields instantly, followed by Gemini 2.0 Flash populating the structured form and special needs tags in < 250ms.
   - Submit registration and show automatic assignment to the nearest open shelter with space.
3. **Live SOS Distress & Live Tracking:**
   - Tap the circular **SOS Button**.
   - Trigger the alert. Show the active GPS beacon acquiring coordinates.
   - Click **"Keep Live Tracking Active in Background (Minimize)"**; demonstrate that the beacon stays active while the user navigates other pages.
   - Show the **Pre-filled SMS (1070)** button generating pre-formatted emergency coordinates for 0G/offline environments.
   - Trigger the **Acoustic Rescue Siren**; demonstrate high-decibel European SAR warbles and Morse SOS synthesized entirely in-browser.
4. **Coordinator Dashboard & Supply Steppers:**
   - Open `/coordinator` in a separate window or device.
   - Demonstrate rapid headcount changes using the `+5` and `-1` steppers with instant optimistic updates.
   - Toggle supply triage pills for Food and Drinking Water to **Critical**.
5. **Relief Voucher Fallback:**
   - In the coordinator view, max out camp capacity to 100%.
   - Return to evacuee intake and register a new family; demonstrate that because all camps are full, the system automatically issues a **Digital Relief Voucher (QR)**.
   - Download the printable 85x54mm emergency ID card and A4 Family Pass PDF.
6. **Merchant Redemption:**
   - Navigate to `/shop` on a mobile device or second browser tab.
   - Scan the voucher QR using the device camera.
   - Show the transaction executing and immediately flipping status to **Redeemed**, preventing duplicate redemption attempts.
7. **EOC Admin Command Center & Chaos Simulation:**
   - Access `/admin`.
   - Review the aggregate district telemetry: total capacity, occupancy percentages, and voucher metrics.
   - Open the **Chaos Simulation Engine**; inject the **"Cyclone Yaas Cat 4 Storm Surge"** scenario.
   - Watch the live map populate with incoming high-urgency SOS distress alerts, flooded road hazards, and hospital route recommendations.
   - Execute 1-click volunteer dispatch on a P1-Critical trapped family alert.
   - Click **Reset Simulation** to return the database to clean baseline.
8. **Offline PWA Validation:**
   - Open Chrome DevTools $\rightarrow$ Network $\rightarrow$ toggle **Offline**.
   - Refresh the page to show complete PWA offline availability, IndexedDB pass vault access, and offline delta queueing.

---

## 10. Live Hosting, Cloud Infrastructure & Vercel Deployment

### 10.1 Production Deployment Profile
EvacorE is hosted as an optimized Next.js 14 production application on **Vercel** with global edge caching and serverless API execution:
- **Canonical Production URL:** [https://evacore-nu.vercel.app](https://evacore-nu.vercel.app)
- **Deployment Project:** `vedant29-codes-projects/evacore`
- **Region:** Washington, D.C., USA (`iad1`)
- **Package Manager & Lockfile:** `pnpm@9.15.5` with `--no-frozen-lockfile` install strategy via [vercel.json](file:///c:/Users/vedan/Downloads/Evacoremain-main%20%281%29/Evacoremain-main/vercel.json)

### 10.2 Continuous Deployment & Redeployment Runbook
To deploy code changes or redeploy the latest commit to the live production URL without modifying existing alias endpoints:

1. **Verify Local Production Build:**
   ```bash
   pnpm run build
   # or
   npm run build
   ```
2. **Execute Vercel Production Deployment:**
   ```bash
   npx vercel --prod --yes
   ```
3. **Automated Alias Routing:**
   Vercel automatically promotes the built deployment and routes traffic atomically to:
   - Primary: `https://evacore-nu.vercel.app`
   - Team Fallback: `https://evacore-vedant29-codes-projects.vercel.app`
   Zero downtime is incurred during deployments due to Vercel's atomic edge alias switching.

