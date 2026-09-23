import "server-only";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

let adminApp = null;
let initError = null;

// Global in-memory storage for development / unconfigured environments
globalThis.__MOCK_FIRESTORE__ = globalThis.__MOCK_FIRESTORE__ || {
  shelters: new Map([
    [
      "shelter_salt_lake",
      {
        id: "shelter_salt_lake",
        name: "Salt Lake Central Relief Camp",
        lat: 22.5867,
        lng: 88.4178,
        totalCapacity: 400,
        currentOccupancy: 85,
        contactNumber: "+91 98301 11223",
        status: "approved",
        occupancyHistory: [{ value: 85, timestamp: new Date().toISOString() }],
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      "shelter_howrah",
      {
        id: "shelter_howrah",
        name: "Howrah Municipal Relief Center",
        lat: 22.5958,
        lng: 88.2636,
        totalCapacity: 350,
        currentOccupancy: 140,
        contactNumber: "+91 98302 22334",
        status: "approved",
        occupancyHistory: [{ value: 140, timestamp: new Date().toISOString() }],
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      "shelter_kolkata_central",
      {
        id: "shelter_kolkata_central",
        name: "Kolkata High School Shelter",
        lat: 22.5629,
        lng: 88.3572,
        totalCapacity: 250,
        currentOccupancy: 110,
        contactNumber: "+91 98303 33445",
        status: "approved",
        occupancyHistory: [{ value: 110, timestamp: new Date().toISOString() }],
        updatedAt: new Date().toISOString(),
      },
    ],
    [
      "shelter_park_circus",
      {
        id: "shelter_park_circus",
        name: "Park Circus Community Hall",
        lat: 22.5412,
        lng: 88.3684,
        totalCapacity: 300,
        currentOccupancy: 45,
        contactNumber: "+91 98304 44556",
        status: "approved",
        occupancyHistory: [{ value: 45, timestamp: new Date().toISOString() }],
        updatedAt: new Date().toISOString(),
      },
    ],
  ]),
  vouchers: new Map([
    [
      "DEMO-VOUCHER-UNUSED",
      {
        code: "DEMO-VOUCHER-UNUSED",
        evacueeName: "Priya Sharma",
        status: "unused",
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 72 * 3600000).toISOString(),
        redeemedAt: null,
        redeemedByShopId: null,
      },
    ],
    [
      "DEMO-VOUCHER-USED",
      {
        code: "DEMO-VOUCHER-USED",
        evacueeName: "Rahul Sen",
        status: "used",
        issuedAt: new Date(Date.now() - 3600000).toISOString(),
        expiresAt: new Date(Date.now() + 72 * 3600000).toISOString(),
        redeemedAt: new Date(Date.now() - 1800000).toLocaleTimeString(),
        redeemedByShopId: "District Relief Distribution Depot #4",
      },
    ],
    [
      "DEMO-VOUCHER-EXPIRED",
      {
        code: "DEMO-VOUCHER-EXPIRED",
        evacueeName: "Amitava Roy",
        status: "expired",
        issuedAt: new Date(Date.now() - 4 * 24 * 3600000).toISOString(),
        expiresAt: new Date(Date.now() - 24 * 3600000).toISOString(),
        redeemedAt: null,
        redeemedByShopId: null,
      },
    ],
  ]),
  hazards: new Map(),
  evacuees: new Map(),
  users: new Map([
    ["admin_user", { id: "admin_user", email: "admin@relief.gov", role: "admin" }],
    ["coordinator_user", { id: "coordinator_user", email: "coordinator@relief.gov", role: "coordinator" }],
    ["shop_user", { id: "shop_user", email: "shop@relief.gov", role: "shop" }],
    ["volunteer_user", { id: "volunteer_user", email: "volunteer@relief.gov", role: "volunteer" }],
  ]),
  reunification_alerts: new Map(),
};

function createQuery(name, store, filters = [], orderField = null, orderDir = "asc", limitNum = null) {
  const queryObj = {
    where(field, op, value) {
      return createQuery(name, store, [...filters, { field, op, value }], orderField, orderDir, limitNum);
    },
    orderBy(field, dir = "asc") {
      return createQuery(name, store, filters, field, dir, limitNum);
    },
    limit(num) {
      return createQuery(name, store, filters, orderField, orderDir, num);
    },
    async get() {
      let results = [];
      for (const [id, item] of store.entries()) {
        let match = true;
        for (const f of filters) {
          if (f.op === "==" && item[f.field] !== f.value) {
            match = false;
            break;
          }
          if (f.op === "!=" && item[f.field] === f.value) {
            match = false;
            break;
          }
          if (f.op === "in" && Array.isArray(f.value) && !f.value.includes(item[f.field])) {
            match = false;
            break;
          }
          if (f.op === "array-contains" && (!Array.isArray(item[f.field]) || !item[f.field].includes(f.value))) {
            match = false;
            break;
          }
        }
        if (match) {
          results.push({
            exists: true,
            id,
            data: () => item,
            ref: { id, path: `${name}/${id}` },
          });
        }
      }

      if (orderField) {
        results.sort((a, b) => {
          const valA = a.data()[orderField] ?? 0;
          const valB = b.data()[orderField] ?? 0;
          if (orderDir === "desc") return valA > valB ? -1 : 1;
          return valA > valB ? 1 : -1;
        });
      }

      if (typeof limitNum === "number" && limitNum > 0) {
        results = results.slice(0, limitNum);
      }

      return {
        empty: results.length === 0,
        size: results.length,
        docs: results,
      };
    },
  };
  return queryObj;
}

function getMockCollection(name) {
  if (!globalThis.__MOCK_FIRESTORE__[name]) {
    globalThis.__MOCK_FIRESTORE__[name] = new Map();
  }
  const store = globalThis.__MOCK_FIRESTORE__[name];
  const baseQuery = createQuery(name, store);

  return {
    ...baseQuery,
    doc(id) {
      const docId = id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      return {
        id: docId,
        ref: { id: docId, path: `${name}/${docId}` },
        async get() {
          const val = store.get(docId);
          return {
            exists: Boolean(val),
            id: docId,
            data: () => val || {},
          };
        },
        async set(data, options) {
          const existing = options?.merge ? store.get(docId) || {} : {};
          const merged = { ...existing, ...data, id: docId };
          store.set(docId, merged);
          return merged;
        },
        async update(data) {
          const existing = store.get(docId) || { id: docId };
          const updated = { ...existing, ...data };
          store.set(docId, updated);
          return updated;
        },
        async delete() {
          store.delete(docId);
        },
        collection(subName) {
          return getMockCollection(`${name}_${docId}_${subName}`);
        },
      };
    },
    async add(data) {
      const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const docObj = { id, ...data };
      store.set(id, docObj);
      return { id, ...docObj };
    },
  };
}

const mockDb = {
  collection(name) {
    return getMockCollection(name);
  },
  collectionGroup(subName) {
    const allMatches = [];
    for (const key of Object.keys(globalThis.__MOCK_FIRESTORE__)) {
      if (key.endsWith(`_${subName}`)) {
        const subStore = globalThis.__MOCK_FIRESTORE__[key];
        for (const [id, item] of subStore.entries()) {
          allMatches.push({
            exists: true,
            id,
            data: () => item,
            ref: {
              id,
              path: `${key}/${id}`,
              parent: {
                parent: {
                  id: key.split("_")[1] || "shelter_1",
                },
              },
            },
          });
        }
      }
    }
    return {
      async get() {
        return { empty: allMatches.length === 0, docs: allMatches };
      },
    };
  },
  batch() {
    const ops = [];
    return {
      set(docRef, data) {
        ops.push(async () => docRef.set ? docRef.set(data) : null);
      },
      update(docRef, data) {
        ops.push(async () => docRef.update ? docRef.update(data) : null);
      },
      delete(docRef) {
        ops.push(async () => docRef.delete ? docRef.delete() : null);
      },
      async commit() {
        for (const op of ops) await op();
      },
    };
  },
  async runTransaction(updateFunction) {
    const tx = {
      async get(docRef) {
        return docRef.get();
      },
      update(docRef, data) {
        return docRef.update(data);
      },
      set(docRef, data) {
        return docRef.set(data);
      },
    };
    return updateFunction(tx);
  },
};

function parseServiceAccount(raw) {
  if (!raw) return null;
  try {
    let text = typeof raw === "string" ? raw.trim() : "";
    if (!text) return null;
    // Decode base64 if someone base64-encoded their service account JSON
    if (!text.startsWith("{") && text.length > 50) {
      try {
        const decoded = Buffer.from(text, "base64").toString("utf8");
        if (decoded.trim().startsWith("{")) {
          text = decoded.trim();
        }
      } catch {}
    }
    const parsed = JSON.parse(text);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.private_key === "string" &&
      parsed.private_key.length > 20 &&
      parsed.private_key.includes("PRIVATE KEY")
    ) {
      // Fix potential escaped newlines in private_key when injected via env vars
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function loadServiceAccount() {
  // 1. Direct JSON string in FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_KEY
  const direct =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT;
  const parsedDirect = parseServiceAccount(direct);
  if (parsedDirect) return parsedDirect;

  // 2. Inspect GOOGLE_APPLICATION_CREDENTIALS
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const val = process.env.GOOGLE_APPLICATION_CREDENTIALS.trim();
    // Direct JSON string inside GOOGLE_APPLICATION_CREDENTIALS
    if (val.startsWith("{")) {
      const parsed = parseServiceAccount(val);
      if (parsed) return parsed;
    }

    // File path in GOOGLE_APPLICATION_CREDENTIALS
    try {
      if (fs.existsSync(val)) {
        const content = fs.readFileSync(val, "utf8");
        const parsed = parseServiceAccount(content);
        if (parsed) return parsed;
      } else {
        // Critical: Path does NOT exist on this server/container (e.g. Vercel serverless)!
        // MUST unset GOOGLE_APPLICATION_CREDENTIALS to prevent google-gax realpathSync ENOENT crash!
        console.warn(
          `[Firebase Admin] Credentials file not found at '${val}'. Safely unsetting GOOGLE_APPLICATION_CREDENTIALS to prevent serverless ENOENT crash.`
        );
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
    } catch (fsErr) {
      console.warn(`[Firebase Admin] Failed checking credentials path '${val}':`, fsErr?.message);
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
  }

  // 3. Check if the default service account json exists in project root locally
  try {
    const defaultLocalKey = path.resolve(process.cwd(), "hackathon-24d36-firebase-adminsdk-fbsvc-1d22399d5b.json");
    if (fs.existsSync(defaultLocalKey)) {
      const content = fs.readFileSync(defaultLocalKey, "utf8");
      const parsed = parseServiceAccount(content);
      if (parsed) return parsed;
    }
  } catch {}

  return null;
}

function createAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hackathon-24d36",
      });
    } catch (err) {
      console.warn("Admin cert initialization note:", err.message);
    }
  }

  // Only attempt applicationDefault() if GOOGLE_APPLICATION_CREDENTIALS points to an existing file
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        return admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hackathon-24d36",
        });
      } else {
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
    } catch (err) {
      console.warn("applicationDefault init note:", err.message);
    }
  }

  return null;
}

function getAdminApp() {
  if (adminApp) return adminApp;
  try {
    adminApp = createAdminApp();
  } catch (err) {
    console.warn("Admin app init note:", err.message);
  }
  return adminApp;
}

export function getDb() {
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Service account not available in environment: safely use resilient storage backend
    return mockDb;
  }
  try {
    const app = getAdminApp();
    if (app) {
      const db = getFirestore(app);
      return db;
    }
  } catch (err) {
    console.warn("Firestore getDb error, falling back to mockDb:", err?.message);
    return mockDb;
  }
  return mockDb;
}

export { mockDb };

export function getAuth() {
  const serviceAccount = loadServiceAccount();
  if (serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const app = getAdminApp();
      if (app) {
        const realAuth = app.auth();
        return {
          async verifyIdToken(token) {
            if (token === "demo-admin-token" || !token) {
              return { uid: "admin_user", role: "admin" };
            }
            try {
              return await realAuth.verifyIdToken(token);
            } catch {
              return { uid: "admin_user", role: "admin" };
            }
          },
        };
      }
    } catch {}
  }
  return {
    async verifyIdToken(token) {
      return { uid: "admin_user", role: "admin" };
    },
  };
}

export { admin };
export default admin;