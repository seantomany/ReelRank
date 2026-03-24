"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { clearCache } from "@/lib/api";

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

type SignInMethod = "popup" | "redirect";

interface AuthContextValue {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (method?: SignInMethod) => Promise<void>;
  signInWithApple: (method?: SignInMethod) => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser) {
        clearCache();
      }
    });

    getRedirectResult(auth).catch(() => {});

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    clearCache();
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    clearCache();
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const signInWithGoogleFn = useCallback(async (method: SignInMethod = "popup") => {
    clearCache();
    if (method === "redirect") {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInWithAppleFn = useCallback(async (method: SignInMethod = "popup") => {
    clearCache();
    if (method === "redirect") {
      await signInWithRedirect(auth, appleProvider);
      return;
    }
    await signInWithPopup(auth, appleProvider);
  }, []);

  const signOutFn = useCallback(async () => {
    clearCache();
    await firebaseSignOut(auth);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    return auth.currentUser.getIdToken(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signInWithGoogle: signInWithGoogleFn,
        signInWithApple: signInWithAppleFn,
        signOut: signOutFn,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
