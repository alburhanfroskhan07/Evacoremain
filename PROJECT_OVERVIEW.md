# 🌊 EVACORE - Complete Project Overview & Technical Architecture

**EVACORE** is an ultra-resilient, offline-first emergency disaster management platform designed for rapid flood response, real-time shelter capacity allocation, AI-powered multilingual evacuee intake, and zero-internet relief ration voucher distribution.

---

## 1. Core Architecture & Tech Stack

```
                                  ┌──────────────────────────────┐
                                  │      Next.js 14 (App Router)  │
                                  │  • Squircles & Glassmorphism │
                                  │  • next-intl (EN / HI / BN)  │
                                  └──────────────┬───────────────┘
                                                 │
                  ┌──────────────────────────────┼──────────────────────────────┐
                  ▼                              ▼                              ▼
      ┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
      │   Client & Voice Layer│      │  Backend & AI Routing │      │  Offline & PWA Layer  │
      │ • Web Speech API (TTS)│      │ • Gemini 2.0 Flash    │      │ • IndexedDB Engine    │
      │ • 0ms Client Parser   │      │ • OSRM Routing Engine │      │ • jsPDF ID Cards      │
      │ • Leaflet Interactive │      │ • Firebase Firestore  │      │ • SMS / 2G Emergency  │
      └───────────────────────┘      └───────────────────────┘      └───────────────────────┘
```

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js 14.2 (App Router) | Server & Client component architecture with multi-lingual routing (`/en`, `/hi`, `/bn`). |
| **Styling** | Tailwind CSS + Custom Tokens | Squircles, multi-layer elevation shadows, glassmorphism docks, and high-contrast emergency palettes. |
| **AI Intelligence** | Google Gemini 2.0 Flash | Structured JSON extraction from natural speech transcripts in < 250ms (`maxOutputTokens: 256`). |
| **Geospatial & Maps** | Leaflet + OpenStreetMap + OSRM | Live GPS tracking, turn-by-turn flood evacuation routing, and interactive click-to-pin navigation. |
| **State & Database** | Firebase Firestore | Real-time listeners for shelter occupancy, emergency SOS alerts, and road hazard reports. |
| **Offline Storage** | IndexedDB (`lib/idb-storage.js`) | 50MB+ asynchronous local storage for family pass QR cards, mutation queues, and voucher locks. |

---

## 2. Key Modules & Functions (What They Do & Why)

### 🎙️ 1. AI Voice Intake & Multilingual Guidance
* **`lib/voice-guidance.js`**:
  * `speakVoiceGuidance(text, locale)`: Uses browser `SpeechSynthesis` with language adaptation (`hi-IN`, `bn-IN`, `en-IN`) and utterance garbage-collection guards to ensure smooth playback without cutoffs.
  * `stopVoiceGuidance()`: Instantly cancels pending audio to avoid audio overlap.
* **`components/evacuee/EvacueeRegistrationForm.js`**:
  * `instantClientExtract(text)`: **0ms regex-token parser** that updates the form fields in real-time as the user speaks before the server response returns.
  * `handleAIExtract()`: Dispatches transcript to `/api/ai/extract-evacuee-info` using **Gemini 2.0 Flash** (`temperature: 0.1`) for ~250ms structured JSON extraction.
  * `handleGeo()`: Multi-tier geolocation query (Tier 1: High accuracy GPS $\rightarrow$ Tier 2: Standard network triangulation fallback).

---

### 🗺️ 2. Live Interactive Map & Disaster Grid
* **`components/map/ShelterMapInner.js`**:
  * `MapController`: Auto-fits bounding boxes around nearby camps, reported road hazards, hospitals, and evacuee routes.
  * `MapClickHandler`: Enables **1-Tap Click-to-Pin** anywhere on the map so users can manually position their pin if ISP IP location is inaccurate.
  * `acquireLocation(shouldFlyTo)`: Queries live coordinates and animates the camera (`map.flyTo`) directly to the user with a pulsing 3-layer radar beacon.
  * **Hospital Layer**: Floating toggle `🏥 Hospitals` rendering real-time medical centers with ER badges, contact numbers, and 1-tap driving route generation.
* **`lib/hospitals.js`**:
  * `fetchNearbyHospitals(lat, lng, radiusKm)`: Queries the free OpenStreetMap Overpass API for `amenity=hospital` nodes/ways/relations within the search radius. Parses `{ id, name, lat, lng, emergency: boolean, phone }` with 24-hour IndexedDB client-side caching.
* **`lib/routing.js`**:
  * `findNearestHospital(userLat, userLng, hospitals, preferEmergency, hazards)`: Matches the closest medical center via Haversine distance and computes real turn-by-turn road routes via OSRM, prioritizing 24/7 ER-capable facilities during medical emergencies.
* **`components/ui/TideGauge.js`**:
  * Signature physical flood-gauge post that visually reflects real-time camp capacity (Green $<70\%$, Amber $70-95\%$, Red $\ge95\%$).

---

### 🏕️ 3. Camp Coordinator Logistics & Supplies
* **`components/shelter/ShelterOccupancyEditor.js`**:
  * Rapid touch-friendly occupancy steppers (`-5`, `-1`, `+1`, `+5`) with immediate optimistic UI updates and offline delta queuing.
* **`components/shelter/SuppliesCard.js` & `SupplyStatusRow.js`**:
  * 3-segment triage pill controls for instant status updates: **Adequate**, **Low**, and **Critical**.
* **`lib/shelters.js`**:
  * `subscribeToShelters(callback)`: Real-time listener for approved shelters.
  * `saveShelter(data)`: Registers new emergency shelters with status `pending`.
  * `getResourcePriorityList()`: Cross-shelter aggregation query finding all critical camp supply deficits.
* **`firestore.rules` (Security Rules Hard Backstop - Free Spark Tier)**:
  * `isValidOccupancyUpdate()`: Validates that `0 <= currentOccupancy <= capacity` (or `totalCapacity`), rejecting out-of-bounds writes directly in Firestore without requiring Blaze/Cloud Functions.
* **`components/shelter/ShelterOccupancyEditor.js` & `lib/offline-sync.js` (Client-Side Clamp & Auto-Retry)**:
  * Automatically calculates safe non-negative and sub-capacity deltas before sending.
  * Employs catch-and-retry logic on rejection to refresh live counts and ensure seamless coordinator operation.

---

### 🛡️ 4. EOC (Emergency Operations Center) & Admin Command
* **`components/admin/AdminWeatherCard.js`**:
  * Meteorological radar telemetry (Rainfall intensity, wind speed, pressure, water level alert scale).
* **`components/admin/ForecastWarningPanel.js`**:
  * Overflow risk detector that calculates camp overflow projections and gives 1-click **"Divert Intake"** buttons.
* **`components/admin/SOSAlertList.js`**:
  * Critical panic alerts queue ranked by urgency (Medical Emergency, Trapped in Flood, Structural Collapse) with 1-click volunteer dispatch.

---

### 🎫 5. Offline Emergency ID Passes & Ration Vouchers
* **`lib/idb-storage.js`**:
  * High-capacity asynchronous IndexedDB manager storing `family_passes`, `offline_queue`, `vouchers`, and `occupancy_deltas`.
* **`lib/pdf-pass.js`**:
  * `generateEmergencyPassPDF(pass, qrDataUrl)`: Client-side vector engine generating **printable 85x54mm ID cards** and **A4 Family passes** with QR codes, shelter assignment, and barcode lines.
* **`components/evacuee/FamilyPassVault.js`**:
  * IndexedDB-backed vault displaying active family passes even when completely disconnected from the internet.
* **`components/evacuee/ShopRedemptionPage.js`**:
  * In-browser QR camera scanner (`html5-qrcode`) with optimistic local anti-double-redemption locking for merchant relief food distribution.

---

### 🚨 6. Offline SOS Panic Button & Sync Engine
* **`components/ui/SOSButton.js`**:
  * Emergency panic trigger with device vibration (`navigator.vibrate`) and pre-filled SMS dispatch targeting the State Disaster Control Room (`1070`) when data is unavailable.
* **`lib/offline-sync.js`**:
  * `queueOfflineOccupancyDelta()`: Queues signed numeric occupancy changes (`+3`, `-1`) instead of raw values.
  * `syncAllOfflineData()`: Auto-detects network restoration and flushes all queued records to Firestore with additive delta merging.

---

## 3. Security, Access Control & Role Model

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Evacuee    │     │  Volunteer   │     │ Coordinator  │     │  EOC Admin   │
│  (Public)    │     │ (Auth User)  │     │ (Auth Camp)  │     │ (Super Admin)│
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
• Rate-limited POST  • Read SOS feed      • Edit own camp      • Approve camps
• Session token live • Check-in to tasks  • Update supplies    • Dispatch teams
  location sharing   • View open camps    • Queued deltas      • Moderate hazards
```

* **Firestore Security Rules**: Hard-gated by role enums (`evacuee`, `coordinator`, `admin`).
* **Coordinator Scoping**: Coordinators can only modify occupancy and supplies for their own registered camp ID.
* **Evacuee Privacy**: Evacuee writes are processed server-side via the Admin SDK; live GPS tracking requires opt-in session tokens that are never leaked to public read feeds.

---

## 4. Known Limitations & Technical Roadmap (Honesty Matrix)

| Domain | Current Implementation & Behavior | v2 Production Roadmap |
| :--- | :--- | :--- |
| **Offline Sync Conflict Resolution** | **Additive Delta Merging**: Occupancy updates are queued as deltas (`+4`, `-2`) and merged using Firestore `increment()` so concurrent offline edits do not overwrite each other. Non-numeric status uses last-write-wins with client timestamps. | Full CRDT (Conflict-Free Replicated Data Type) or operational transformation engine for granular multi-master sync. |
| **Emergency 2G SMS Broadcast** | **Pre-Formatted SMS Dispatch**: Opens the native mobile SMS messenger with pre-formatted GPS distress coordinates targeting State Disaster Helpline **`1070`**; user taps Send once. | Direct hardware GSM modem API integration on native Android builds. |
| **Evacuation Routing Engine** | **OSRM with Geodesic Fallback**: Queries OSRM routing engine; if OSRM is unreachable or times out (>2.5s), falls back to Haversine geodesic waypoint geometry and straight-line compass heading. | Self-hosted edge OSRM cluster deployed with regional disaster elevation topological maps. |
| **Speech-to-Text (STT) Offline Gate** | **Gated with 0ms Offline Fallback**: Browser Speech-to-Text requires active internet; when offline, the UI directs users to typed input which executes **100% offline in 0ms** via client regex extraction. | Embedded on-device WebAssembly Whisper model for local speech-to-text. |
| **Voucher Double-Redemption** | **Optimistic Terminal Lock + Cloud Collision Flags**: Scanned vouchers are locked in local IndexedDB. Cross-merchant offline collisions are flagged in cloud sync logs for coordinator review. | Local mesh peer-to-peer Bluetooth/Wi-Fi Direct ledger sync between nearby merchant terminals. |
| **PII & Data Retention** | **Privacy Enums & 7-Day TTL**: Medical flags are stored as strictly typed enums (`wheelchair`, `medical_critical`, `infant`) rather than open text. Digital passes auto-expire after 7 days. | Zero-Knowledge Proof credentials and client-side asymmetric public key encryption for evacuee names. |
