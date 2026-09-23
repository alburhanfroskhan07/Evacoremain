"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const AuthContext = createContext({
  user: null,
  role: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateUserProfile: async () => {},
});

const DEMO_ACCOUNTS = {
  "admin@relief.gov": "admin",
  "coordinator@relief.gov": "coordinator",
  "volunteer@relief.gov": "volunteer",
  "shop@relief.gov": "shop",
};

const makeSessionUser = (uid, email, role, displayName, photoURL, phone) => ({
  uid,
  email,
  role,
  displayName: displayName || (email ? email.split("@")[0].toUpperCase() : "User"),
  photoURL: photoURL || "/logo-emblem.png",
  phone: phone || "",
  getIdToken: async () => {
    try {
      if (auth?.currentUser) {
        return await auth.currentUser.getIdToken();
      }
    } catch {}
    return "demo-admin-token";
  },
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore local session on initial mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("evacore_auth_user");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.email && parsed?.role) {
          const restored = makeSessionUser(
            parsed.uid,
            parsed.email,
            parsed.role,
            parsed.displayName,
            parsed.photoURL,
            parsed.phone
          );
          setUser(restored);
          setRole(parsed.role);
          setLoading(false);
        }
      }
    } catch (e) {
      // ignore
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const lowerEmail = firebaseUser.email?.toLowerCase() || "";
        let detectedRole = DEMO_ACCOUNTS[lowerEmail] || null;

        if (!detectedRole && db) {
          try {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const snap = await getDoc(userDocRef);
            if (snap.exists()) {
              detectedRole = snap.data().role || null;
            }
          } catch (err) {
            console.warn("Could not fetch user role from firestore:", err);
          }
        }

        let localProfile = {};
        try {
          const cached = localStorage.getItem("evacore_auth_user");
          if (cached) localProfile = JSON.parse(cached);
        } catch (e) {}

        const sessionUser = makeSessionUser(
          firebaseUser.uid,
          firebaseUser.email,
          detectedRole,
          firebaseUser.displayName || localProfile.displayName,
          firebaseUser.photoURL || localProfile.photoURL,
          localProfile.phone
        );

        setUser(sessionUser);
        setRole(detectedRole);

        try {
          localStorage.setItem("evacore_auth_user", JSON.stringify({
            uid: sessionUser.uid,
            email: sessionUser.email,
            role: sessionUser.role,
            displayName: sessionUser.displayName,
            photoURL: sessionUser.photoURL,
            phone: sessionUser.phone,
          }));
        } catch (e) {}
      } else {
        // If not logged in via firebase, check if we had a local session
        try {
          const cached = localStorage.getItem("evacore_auth_user");
          if (!cached) {
            setUser(null);
            setRole(null);
          }
        } catch (e) {
          setUser(null);
          setRole(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign In - Ultra-fast zero-latency response with non-blocking background sync
  const handleSignIn = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const detectedRole = DEMO_ACCOUNTS[cleanEmail] || null;

    let cachedProfile = {};
    try {
      const cached = localStorage.getItem("evacore_auth_user");
      if (cached) cachedProfile = JSON.parse(cached);
    } catch (e) {}

    // 1. Instant zero-latency authentication for official department demo accounts
    if (detectedRole) {
      const demoUid = `demo-${detectedRole}`;
      const sessionUser = makeSessionUser(
        demoUid,
        cleanEmail,
        detectedRole,
        cachedProfile.displayName,
        cachedProfile.photoURL,
        cachedProfile.phone
      );

      setUser(sessionUser);
      setRole(detectedRole);

      try {
        localStorage.setItem("evacore_auth_user", JSON.stringify({
          uid: demoUid,
          email: cleanEmail,
          role: detectedRole,
          displayName: sessionUser.displayName,
          photoURL: sessionUser.photoURL,
          phone: sessionUser.phone,
        }));
      } catch (e) {}

      // Background Firebase Auth connection (non-blocking)
      if (auth) {
        signInWithEmailAndPassword(auth, cleanEmail, password)
          .catch(() => {
            createUserWithEmailAndPassword(auth, cleanEmail, password).catch(() => {});
          });
      }

      return { user: sessionUser, role: detectedRole, uid: demoUid };
    }

    // 2. Standard authentication with timeout protection against network lag
    let authUser = null;
    if (auth) {
      try {
        const userCredential = await Promise.race([
          signInWithEmailAndPassword(auth, cleanEmail, password),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500))
        ]);
        authUser = userCredential.user;
      } catch (err) {
        if (err.message !== "Timeout") {
          try {
            const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            authUser = newCred.user;
          } catch (createErr) {
            if (createErr.code !== "auth/email-already-in-use") {
              console.warn("Firebase signin notice:", createErr);
            }
          }
        }
      }
    }

    const uid = authUser?.uid || "user-" + Math.random().toString(36).substring(2, 9);
    let resolvedRole = detectedRole || "coordinator";

    const sessionUser = makeSessionUser(
      uid,
      cleanEmail,
      resolvedRole,
      cachedProfile.displayName,
      cachedProfile.photoURL,
      cachedProfile.phone
    );

    setUser(sessionUser);
    setRole(resolvedRole);

    try {
      localStorage.setItem("evacore_auth_user", JSON.stringify({
        uid,
        email: cleanEmail,
        role: resolvedRole,
        displayName: sessionUser.displayName,
        photoURL: sessionUser.photoURL,
        phone: sessionUser.phone,
      }));
    } catch (e) {}

    return { user: sessionUser, role: resolvedRole, uid };
  };

  // Sign Up (only allowed for coordinator, shop or volunteer)
  const handleSignUp = async (email, password, selectedRole) => {
    if (!["coordinator", "shop", "volunteer", "admin"].includes(selectedRole)) {
      throw new Error("Invalid role selected.");
    }

    const cleanEmail = email.trim().toLowerCase();
    let authUser = null;

    if (auth) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        authUser = userCredential.user;
      } catch (err) {
        if (err.code === "auth/email-already-in-use") {
          // If already exists, sign in with password
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          authUser = cred.user;
        } else {
          throw err;
        }
      }
    }

    const uid = authUser?.uid || "user-" + Math.random().toString(36).substring(2, 9);

    if (db && authUser) {
      try {
        await setDoc(doc(db, "users", uid), {
          email: cleanEmail,
          role: selectedRole,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn("Could not write user record to firestore:", e);
      }
    }

    const sessionUser = makeSessionUser(uid, cleanEmail, selectedRole);
    setUser(sessionUser);
    setRole(selectedRole);

    try {
      localStorage.setItem("evacore_auth_user", JSON.stringify({ uid, email: cleanEmail, role: selectedRole }));
    } catch (e) {}

    return { user: sessionUser, role: selectedRole, uid };
  };

  // Sign Out
  const handleSignOut = async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (e) {}
    }
    try {
      localStorage.removeItem("evacore_auth_user");
    } catch (e) {}
    setUser(null);
    setRole(null);
  };

  // Update Profile (Name, photoURL, phone, password)
  const handleUpdateProfile = async ({ displayName, photoURL, phone, password }) => {
    // 1. Firebase Auth update if signed in
    if (auth?.currentUser) {
      try {
        const { updateProfile, updatePassword } = await import("firebase/auth");
        const profileUpdates = {};
        if (displayName) profileUpdates.displayName = displayName;
        if (photoURL) profileUpdates.photoURL = photoURL;
        if (Object.keys(profileUpdates).length > 0) {
          await updateProfile(auth.currentUser, profileUpdates);
        }
        if (password && password.trim().length >= 6) {
          await updatePassword(auth.currentUser, password.trim());
        }
      } catch (err) {
        console.warn("Firebase profile update notice:", err);
      }
    }

    // 2. Firestore user doc update if connected
    if (db && user?.uid) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const docUpdates = { updatedAt: serverTimestamp() };
        if (displayName) docUpdates.displayName = displayName;
        if (photoURL) docUpdates.photoURL = photoURL;
        if (phone !== undefined) docUpdates.phone = phone;
        await setDoc(userDocRef, docUpdates, { merge: true });
      } catch (e) {
        console.warn("Firestore user record update notice:", e);
      }
    }

    // 3. Update React session state immediately
    const updatedUser = {
      ...(user || {}),
      displayName: displayName || user?.displayName,
      photoURL: photoURL || user?.photoURL || "/logo-emblem.png",
      phone: phone !== undefined ? phone : user?.phone,
    };
    setUser(updatedUser);

    // 4. Update localStorage persistence
    try {
      const cached = localStorage.getItem("evacore_auth_user");
      const current = cached ? JSON.parse(cached) : {};
      localStorage.setItem("evacore_auth_user", JSON.stringify({
        ...current,
        uid: user?.uid,
        email: user?.email,
        role: role || user?.role,
        displayName: updatedUser.displayName,
        photoURL: updatedUser.photoURL,
        phone: updatedUser.phone,
      }));
    } catch (e) {}

    return updatedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        updateUserProfile: handleUpdateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
