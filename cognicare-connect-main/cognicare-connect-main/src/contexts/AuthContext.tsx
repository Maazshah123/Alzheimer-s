import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "doctor" | "patient";
export type DoctorStatus = "pending" | "approved" | "rejected" | "suspended";
export type PatientStatus = "pending" | "approved" | "rejected" | "suspended";

const parseAppRole = (v: unknown): AppRole | null =>
  v === "admin" || v === "doctor" || v === "patient" ? v : null;

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  doctorStatus: DoctorStatus | null;
  patientStatus: PatientStatus | null;
  loading: boolean;
  signOut: () => Promise<void>;
  /**
   * Reload session + role from Supabase.
   * After sign-in, pass `sessionFromSignIn` from `signInWithPassword` so we skip `getSession()` and avoid
   * deadlocking with `onAuthStateChange` (see auth-js #762 — never await Supabase inside that callback).
   */
  refresh: (explicitUserId?: string | null, sessionFromSignIn?: Session | null) => Promise<AppRole | null>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [doctorStatus, setDoctorStatus] = useState<DoctorStatus | null>(null);
  const [patientStatus, setPatientStatus] = useState<PatientStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRoleAndStatus = useCallback(async (uid: string, authUser?: User | null): Promise<AppRole | null> => {
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();
    // Prefer table row; if RLS hides it (empty result) fall back to signup metadata — same source of truth as triggers.
    const fromDb = (roleRow?.role as AppRole | undefined) ?? null;
    const r = fromDb ?? parseAppRole(authUser?.user_metadata?.role);
    setRole(r);

    if (r === "doctor") {
      const { data: ds } = await supabase
        .from("doctor_status")
        .select("status")
        .eq("user_id", uid)
        .maybeSingle();
      setDoctorStatus((ds?.status as DoctorStatus | undefined) ?? "pending");
      setPatientStatus(null);
    } else if (r === "patient") {
      const { data: ps } = await supabase
        .from("patient_status")
        .select("status")
        .eq("user_id", uid)
        .maybeSingle();
      setPatientStatus((ps?.status as PatientStatus | undefined) ?? "pending");
      setDoctorStatus(null);
    } else {
      setDoctorStatus(null);
      setPatientStatus(null);
    }
    return r;
  }, []);

  const refresh = useCallback(
    async (explicitUserId?: string | null, sessionFromSignIn?: Session | null) => {
      let s: Session | null = sessionFromSignIn ?? null;
      if (!s) {
        const { data } = await supabase.auth.getSession();
        s = data.session;
      }
      setSession(s);
      setUser(s?.user ?? null);
      const uid = explicitUserId ?? s?.user?.id ?? null;
      if (!uid) {
        setRole(null);
        setDoctorStatus(null);
        setPatientStatus(null);
        return null;
      }
      setLoading(true);
      try {
        return await loadRoleAndStatus(uid, s?.user ?? null);
      } catch {
        setRole(null);
        setDoctorStatus(null);
        setPatientStatus(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [loadRoleAndStatus],
  );

  useEffect(() => {
    let deferredRoleLoad: ReturnType<typeof setTimeout> | null = null;

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (deferredRoleLoad) {
        clearTimeout(deferredRoleLoad);
        deferredRoleLoad = null;
      }

      if (event === "TOKEN_REFRESHED" && s?.user) {
        setSession(s);
        setUser(s.user);
        return;
      }

      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setRole(null);
        setDoctorStatus(null);
        setPatientStatus(null);
        setLoading(false);
        return;
      }
      // Never await Supabase inside this callback — it deadlocks other client calls (e.g. login `refresh`).
      setLoading(true);
      deferredRoleLoad = setTimeout(() => {
        deferredRoleLoad = null;
        void (async () => {
          try {
            await loadRoleAndStatus(s.user.id, s.user);
          } finally {
            setLoading(false);
          }
        })();
      }, 0);
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadRoleAndStatus(s.user.id, s.user);
      setLoading(false);
    });

    return () => {
      if (deferredRoleLoad) clearTimeout(deferredRoleLoad);
      sub.subscription.unsubscribe();
    };
  }, [loadRoleAndStatus]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setDoctorStatus(null);
    setPatientStatus(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, doctorStatus, patientStatus, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
