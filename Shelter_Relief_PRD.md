# Product Requirements Document (PRD)
## Shelter Capacity Live-Tracker + Relief Voucher System
**SIH 2026 Submission**

---

## 1. Problem Statement

During disasters (floods, cyclones - especially relevant to West Bengal's monsoon flooding context), relief camp coordinators and disaster management authorities lack real-time visibility into shelter capacity. This causes:

- Evacuees arriving at already-full shelters, wasting critical time during emergencies
- No centralized way for authorities to see aggregate capacity across a district/region
- No fallback mechanism when shelters are full (evacuees are simply turned away)
- No way to reunite separated family members across different shelters
- Manual, phone-call-based coordination that breaks down at scale

**Target users:**
- Camp coordinators (register/manage shelter data)
- Evacuees / field volunteers (register evacuees, find nearest available shelter)
- Local shopkeepers (redeem relief vouchers)
- District/state disaster management authorities (aggregate oversight)
**Impact framing for pitch:** West Bengal sees recurring monsoon flooding (cite Cyclone Amphan/Yaas-scale displacement numbers in the actual deck - pull current stats before submission). Reducing evacuee-to-shelter matching time and giving authorities real-time capacity data directly reduces response time and prevents shelter overcrowding.

---

## 2. Goals & Non-Goals

**Goals (what this system must do):**
1. Let coordinators register and update shelter capacity in real time
2. Let evacuees (or volunteers on their behalf) register and get auto-matched to the nearest shelter with space
3. Provide a fallback relief voucher when no shelter has space
4. Give a live map view with color-coded capacity status
5. Work reasonably well under poor network conditions (disaster zones)
6. Be usable in Bengali and English/Hindi

**Non-goals (explicitly out of scope):**
- Payment processing for vouchers (vouchers are relief goods redemption codes, not currency)
- Native mobile app - building this as an installable **PWA (Progressive Web App)** instead, so it works cross-platform, offline, and installs from browser without an app store
- Multi-district/state-level analytics beyond a basic aggregate view
- Full-blown custom ML model training (all "AI" features use Gemini API for NL understanding/generation, not custom-trained models - faster to build and easier to explain/defend to judges)

---

## 3. Tech Stack (final)

| Layer | Tool | Reasoning |
|---|---|---|
| Frontend | Next.js 14 + Tailwind CSS | Fast AI-assisted scaffolding, good component ecosystem |
| Backend / DB | Firebase (Firestore + Auth) | Real-time listeners built-in, no custom server code needed |
| Maps | Leaflet.js (OpenStreetMap tiles) | Free, no billing/card requirement |
| Voucher / QR | qrcode.react | Simple unique code + QR generation |
| Hosting | Vercel | Free tier, one-click GitHub deploy |
| Offline support | Firestore offline persistence + localStorage queue | No extra cost, works within Firebase SDK |
| Installability | PWA (manifest.json + service worker, `next-pwa`) | Installable app-like experience, no app store needed |
| AI Layer | Google Gemini API (`google-genai` SDK) | NL extraction, triage, and forecasting - same pattern you already used in FloodSafe Navigate |

---

## 4. Data Model (Firestore Collections)

### `shelters`
```
{
  id: string (auto),
  name: string,
  lat: number,
  lng: number,
  totalCapacity: number,
  currentOccupancy: number,
  contactNumber: string,
  coordinatorUid: string,       // links to Firebase Auth user
  status: "pending" | "approved",  // admin approval gate - see Section 6.1
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `evacuees`
```
{
  id: string (auto),
  name: string,
  familySize: number,
  lat: number,
  lng: number,
  assignedShelterId: string | null,
  missingFamilyMemberName: string | null,
  rawIntakeText: string | null,     // original free-text/voice transcript, if AI intake used
  specialNeeds: string[] | null,    // e.g. ["medical", "elderly", "infant", "disability"] - AI-extracted
  urgencyLevel: "low" | "medium" | "high" | null,  // AI-triaged - see F7
  registeredAt: timestamp
}
```

### `vouchers`
```
{
  id: string (auto),
  code: string (unique, unguessable - see Section 6.3),
  evacueeId: string,
  status: "unused" | "used" | "expired",
  issuedAt: timestamp,
  expiresAt: timestamp,          // issuedAt + 72hrs, configurable
  redeemedAt: timestamp | null,
  redeemedByShopId: string | null
}
```

### `sos_alerts` (stretch feature)
```
{
  id: string (auto),
  lat: number,
  lng: number,
  message: string | null,           // free-text if user typed/spoke a reason
  urgencyLevel: "low" | "medium" | "high" | null,  // AI-triaged - see F8
  category: string | null,          // e.g. "medical", "trapped", "food/water" - AI-classified
  raisedAt: timestamp,
  status: "open" | "resolved"
}
```

### `shelter_forecasts` (stretch feature - see F9)
```
{
  id: string (= shelterId),
  predictedOverflowRisk: "low" | "medium" | "high",
  predictedHoursToFull: number | null,
  lastComputedAt: timestamp
}
```

---

## 5. Feature Breakdown (MVP first, then stretch)

### MVP - Core Flow (must work for demo)

**F1. Shelter Registration + Live Update**
- Coordinator signs up/logs in (Firebase Auth, email/password)
- Registration form: name, lat/lng (or pick-on-map), total capacity, current occupancy, contact number
- Coordinator can update occupancy in real time from their own dashboard
- New shelters default to `status: pending` until admin-approved (fraud/spam prevention - see 6.1)

**F2. Live Dashboard + Map**
- Real-time Firestore `onSnapshot` listener renders all approved shelters
- Leaflet map, pin color coding: green (0–70%), yellow (70–95%), red (95–100%)
- Click pin → popup with name, capacity, occupancy, contact

**F3. Evacuee Registration + Auto-Routing**
- Simple form: name, family size, current location (geolocation or manual pin)
- On submit: Haversine distance calculation against all approved shelters with `currentOccupancy < totalCapacity`
- Assigns nearest shelter with space; if none found, sets flag `no_capacity` → triggers F4

**F4. Relief Voucher (QR) System**
- On `no_capacity`, generate a unique voucher code + QR (qrcode.react)
- Save to `vouchers` collection, `status: unused`, `expiresAt` set (e.g. +72 hrs)
- Shop-side redemption page: shopkeeper enters/scans code → Firestore **transaction** flips status to `used` (prevents double-redemption race conditions - see 6.3)

**F5. Admin Aggregate View**
- Single page showing: total shelters, total capacity, total occupancy %, total vouchers issued/redeemed, pending shelter approvals
- This is the "district authority" view judges will ask about

**F6. PWA - Installable + Offline-First**
- `manifest.json` + service worker (via `next-pwa`) so the app can be installed to home screen on any phone (Android/iOS) without an app store
- Works with Firestore offline persistence (Section 6.2) so core screens stay usable with no signal
- This directly replaces the "native app" idea - same install-and-use feel, zero app-store overhead, works on any OS

**F7. AI Natural-Language Intake Assistant** ⭐ *(headline differentiator - recommend building this)*
- On the evacuee registration form, add a "speak or type your situation" free-text/voice box alongside the structured fields
- Example input: *"Mera parivar 5 log hai, hum Salt Lake mein phase 3 ke paas hai, ek boodha aadmi ko wheelchair chahiye"*
- Send this text to **Gemini** with a structured-JSON-only prompt → extract `name` (if mentioned), `familySize`, approximate `location`, and `specialNeeds` (medical/elderly/infant/disability/etc.)
- Auto-fills the form fields; user just confirms instead of typing everything manually
- **Why this matters for judges:** solves a real accessibility problem - low-literacy or panicked users can just describe their situation in their own words/language instead of navigating a form. This is the single most "award-winning" feature because it's a genuine UX innovation, not just a checkbox feature, and reuses a pattern (Gemini NL extraction) you've already proven works in FloodSafe Navigate.

### Full Feature Set (all planned to be built - you have the runway)

**S1. Firestore Security Rules** - *(treat as MVP-adjacent, not truly optional - see Section 6.1)*

**S2. Offline Queue** - form submissions cached in localStorage when offline, auto-sync on reconnect (Section 6.2)

**S3. Bengali/English Language Toggle** - i18n on evacuee + coordinator forms (reuse pattern from FloodSafe Navigate if applicable)

**S4. SOS Button** - Geolocation API → `sos_alerts` collection → distinct marker (purple/black) on coordinator map

**S5. Family Reunification Match** - optional "missing family member name" field on evacuee form; fuzzy match (not exact - see 6.4) against existing evacuee names across shelters; alert both coordinators on match

**S6. Road-network routing** - replace Haversine with OSRM for realistic distance/ETA (worth building now if you have the days, rather than leaving as future scope)

**F8. AI SOS/Need Triage & Prioritization**
- Builds on S4 (SOS button) - user optionally adds a short voice/text note explaining what's wrong
- Gemini classifies the note into `category` (medical / trapped / food-water / other) and `urgencyLevel` (low/medium/high)
- Admin dashboard sorts open SOS alerts by urgency instead of just arrival time - high-urgency medical cases surface first
- **Why it matters:** turns a flat alert list into a triage system, which is what actual disaster response coordination needs - strong "real deployment thinking" signal to judges

**F9. AI Shelter Overflow Forecasting**
- Periodically (e.g. every few minutes, or on-demand from admin dashboard) feed each shelter's recent occupancy trend + local weather data (OpenWeatherMap, same source FloodSafe already uses) into Gemini
- Ask it to estimate `predictedOverflowRisk` (low/medium/high) and roughly how many hours until a shelter fills up, store in `shelter_forecasts`
- Admin dashboard shows a "shelters likely to overflow soon" warning list - lets authorities pre-emptively redirect evacuees or request more supplies *before* a shelter actually hits capacity
- **Why it matters:** shifts the system from reactive (shelter is full, now what) to proactive (we saw this coming) - this is usually the difference between a "good build" and an "award-winning" pitch in disaster-tech tracks

**F10. AI Voucher Anomaly Flagging**
- Flags if the same shop redeems an unusually high number of vouchers in a short window, or if a voucher is redeemed from a location far from where it was issued
- Since you have the days, worth making this genuinely AI-assisted rather than pure rule-based: feed redemption patterns to Gemini periodically and ask it to flag statistically unusual clusters, not just hard thresholds
- Flagged redemptions show a warning badge on the admin dashboard for manual review

---

## 6. Key Risks & Required Safeguards

These were gaps in the original roadmap - treat 6.1 and 6.3 as **must-fix**, not optional polish, since judges will directly probe them.

### 6.1 Data integrity - Firestore security rules + approval gate
Without rules, Firestore is wide open - anyone can inject fake shelters or evacuees. Minimum bar:
- Only authenticated coordinators can write to `shelters`, and only to documents where `coordinatorUid == request.auth.uid`
- New shelters start `status: pending`; only an admin role can flip to `approved`
- Evacuee/voucher writes should be rate-limited or require a lightweight auth (even anonymous Firebase Auth) to prevent spam

### 6.2 Network reliability
Disaster zones commonly lose connectivity. Enable Firestore's built-in offline persistence at minimum; stretch goal is a localStorage queue for form submissions that syncs when the connection returns.

### 6.3 Voucher fraud / double-redemption
Two shopkeepers redeeming the same code simultaneously is a race condition if you do a plain read-then-write. Use a Firestore **transaction** for the redemption write, and add an `expiresAt` field so stale vouchers can't be redeemed indefinitely.

### 6.4 Name-matching accuracy
Exact string match on `missingFamilyMemberName` will fail on transliteration/spelling variants (common with Bengali names in Latin script). Use a simple fuzzy match (lowercase + trim + Levenshtein distance threshold, or a partial-match library) instead of `===`.

### 6.5 Distance accuracy
Haversine (straight-line) distance can route evacuees toward shelters that are actually unreachable due to flooded/blocked roads. Since you have the runway, build S6 (OSRM road-routing) as the real distance/ETA engine rather than leaving Haversine as final - use Haversine only as an initial quick-filter (e.g. "find shelters within 5km straight-line") before running the more expensive OSRM route calculation on the shortlist.

---

## 7. Non-Functional Requirements

- **Responsiveness:** Must work cleanly on mobile (field volunteers will use phones, not laptops)
- **Language:** English/Hindi minimum; Bengali toggle strongly recommended given the West Bengal context
- **Cost:** Entire stack must stay within free tiers for the hackathon (Firebase Spark plan, Vercel Hobby, no paid map API)
- **Latency:** Dashboard updates should reflect Firestore changes within ~1–2 seconds (native to `onSnapshot`)
- **AI response time:** Gemini calls (intake extraction, triage) should return within ~2–4 seconds with a visible loading state - never block form submission if the API is slow or fails (always allow manual fallback entry)
- **Graceful AI degradation:** If Gemini API fails or is unreachable, the app must still work with plain manual forms - AI is an enhancement layer, not a hard dependency

---

## 8. Build Roadmap & Time Estimates

Since you have multiple days rather than a single overnight sprint, here's the plan laid out across days instead of squeezed into hours - build everything in Sections 5 and F7–F10, nothing needs to be cut.

| Day | Focus | Steps Covered |
|---|---|---|
| Day 1 | Project setup + shelter registration + Firestore schema | Steps 1–2 |
| Day 2 | Live dashboard + Leaflet map + security rules + admin approval gate | Step 3, 5b |
| Day 3 | Evacuee registration + auto-routing (Haversine) + admin aggregate dashboard | Step 4, 5c |
| Day 4 | Voucher/QR system + transaction-safe redemption + PWA setup | Step 5, 5d |
| Day 5 | AI Natural-Language Intake (F7) - Gemini integration, prompt tuning, fallback handling | Step 5e |
| Day 6 | SOS button + AI SOS Triage (F8) + fuzzy-match family reunification (S5) | Step 6, 6b |
| Day 7 | AI Overflow Forecasting (F9) + Bengali/English i18n toggle (S3) | Step 6c, S3 |
| Day 8 | AI Voucher Anomaly Flagging (F10) + offline queue polish (S2) | Step 6d, S2 |
| Day 9 | Full integration testing, dummy dataset, bug fixes across all features | - |
| Day 10 | Deploy, pitch deck, demo rehearsal, buffer for last-minute fixes | Step 7 |

**Total scope:** MVP (F1–F6) + all AI features (F7–F10) + all stretch features (S1–S6) - full build, nothing deprioritized.

Even with more days, keep the same prompting discipline: build in small AI-prompted increments per feature (form → DB connection → styling → edge cases) rather than one giant prompt per day. Easier to debug, and you'll be able to explain every part confidently to judges.

Suggested team split if multiple people are working in parallel:
- **Person A:** Core CRUD + dashboard (Steps 1–4)
- **Person B:** Voucher system + PWA + security rules (Steps 5, 5b, 5d)
- **Person C:** AI layer - Gemini integration for F7/F8/F9/F10 (can start once evacuee/SOS schemas exist)
- Merge and integration-test at the end of each day rather than only at the end of the build

Build in small AI-prompted increments (one component at a time - form, then DB connection, then styling) rather than one giant prompt per step. Easier to debug and easier to explain to judges.

---

## 9. Demo Script (for judging round)

1. Show coordinator registering a shelter → gets `pending` status
2. Show admin approving it → appears on map
3. Show 2–3 pre-seeded shelters at different occupancy levels (green/yellow/red)
4. **Register an evacuee using the AI intake box** - speak/type a free-form sentence in Hinglish/Bengali, show Gemini auto-filling the structured form fields including special needs → this is your standout moment, spend the most demo time here
5. Show auto-match to nearest shelter with capacity
6. Register another evacuee where all nearby shelters are full → show voucher + QR generation
7. Switch to shop-side page → redeem the voucher → show status flip to `used`
8. Show admin aggregate dashboard (total capacity, occupancy %, vouchers issued/redeemed)
9. (If built) Show AI overflow forecast warning, AI-triaged SOS list, or family reunification match
10. Show the app installed on a phone home screen (PWA) - reinforces "works on any device, no app store"
11. Close with the "future scope" slide: OSRM road-routing, SMS/IVR fallback for feature phones, multi-district analytics

---

## 10. Success Metrics (for pitch deck framing)

- Reduction in evacuee-to-shelter matching time vs. manual/phone-based coordination
- % of relief camp overcrowding incidents preventable with real-time visibility
- Number of districts/authorities that could plug into the admin aggregate view during an actual disaster response

---

## 11. Pre-Submission Checklist

- [ ] Firestore security rules deployed (not just written)
- [ ] Dummy dataset seeded (5–6 shelters across occupancy tiers, ~10 evacuees, 2–3 vouchers)
- [ ] Voucher redemption tested for race condition (two rapid redemption attempts)
- [ ] Mobile responsiveness checked on an actual phone, not just browser resize
- [ ] PWA installs correctly on a real phone (Add to Home Screen tested, not just Lighthouse audit)
- [ ] AI intake tested with messy/casual/Hinglish input, not just clean English sentences
- [ ] AI features have a manual-fallback path if Gemini API is slow/down during the actual demo (don't let the whole demo depend on a live API call working perfectly)
- [ ] Pitch deck has problem statement, target user, and impact metrics - not just the tech build
- [ ] "Future scope" slide ready (OSRM routing, SMS/IVR, multi-district scale)
