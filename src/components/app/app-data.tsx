"use client";

import type { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { AppHustle, AppProfile, AppTransaction, Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";

/**
 * The app's live data layer.
 *
 * Everything is server-persisted in Supabase and mirrored into React state via
 * Realtime, which is what makes the cross-device promise real: a receipt
 * scanned on the phone INSERTs a row, Postgres broadcasts it, and the row
 * appears here without a refresh. Nothing lives in localStorage — a user who
 * onboarded on mobile must not be treated as new on the web.
 */

type AppDataValue = {
  userId: string;
  profile: AppProfile | null;
  hustles: AppHustle[];
  transactions: AppTransaction[];
  loading: boolean;
  /** Ids that arrived over realtime this session — used to animate them in. */
  freshIds: Set<string>;
  saveProfile: (patch: Partial<Omit<AppProfile, "user_id">>) => Promise<void>;
  saveHustles: (hustles: { id: string; name: string; color: string }[]) => Promise<void>;
  addTransaction: (row: AppTransaction) => Promise<void>;
  updateTransaction: (id: string, patch: Partial<AppTransaction>) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
};

const AppDataContext = createContext<AppDataValue | null>(null);

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside <AppDataProvider>");
  return ctx;
}

function byDateDesc(a: AppTransaction, b: AppTransaction) {
  if (a.date === b.date) return b.updated_at.localeCompare(a.updated_at);
  return b.date.localeCompare(a.date);
}

export function AppDataProvider({
  userId,
  initialProfile,
  initialHustles,
  initialTransactions,
  children,
}: {
  userId: string;
  initialProfile: AppProfile | null;
  initialHustles: AppHustle[];
  initialTransactions: AppTransaction[];
  children: ReactNode;
}) {
  const [supabase] = useState<SupabaseClient<Database>>(() => createClient());
  const [profile, setProfile] = useState<AppProfile | null>(initialProfile);
  const [hustles, setHustles] = useState<AppHustle[]>(initialHustles);
  const [transactions, setTransactions] = useState<AppTransaction[]>(initialTransactions);
  const [loading] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());

  // Ids this tab wrote itself. Realtime echoes our own INSERTs back, and we
  // don't want to flash "new!" on a row the user just created here.
  const localWrites = useRef<Set<string>>(new Set());

  const markFresh = useCallback((id: string) => {
    setFreshIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Let the animation play once, then stop treating the row as new.
    setTimeout(() => {
      setFreshIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 6000);
  }, []);

  // ---- Realtime -----------------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel(`app-data-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_transactions", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<AppTransaction>) => {
          if (payload.eventType === "DELETE") {
            const gone = payload.old as AppTransaction;
            setTransactions((prev) => prev.filter((t) => t.id !== gone.id));
            return;
          }

          const row = payload.new as AppTransaction;
          setTransactions((prev) => {
            const idx = prev.findIndex((t) => t.id === row.id);
            if (idx === -1) return [row, ...prev].sort(byDateDesc);
            const next = [...prev];
            next[idx] = row;
            return next.sort(byDateDesc);
          });

          // Only celebrate rows that came from somewhere else (i.e. the phone).
          if (payload.eventType === "INSERT" && !localWrites.current.has(row.id)) {
            markFresh(row.id);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_hustles", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<AppHustle>) => {
          if (payload.eventType === "DELETE") {
            const gone = payload.old as AppHustle;
            setHustles((prev) => prev.filter((h) => h.id !== gone.id));
            return;
          }
          const row = payload.new as AppHustle;
          setHustles((prev) => {
            const idx = prev.findIndex((h) => h.id === row.id);
            if (idx === -1) return [...prev, row];
            const next = [...prev];
            next[idx] = row;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, markFresh]);

  // ---- Mutations ----------------------------------------------------------
  // Each one writes through to Postgres and updates local state optimistically,
  // so the UI is instant on this device and correct on every other one.

  const saveProfile = useCallback(
    async (patch: Partial<Omit<AppProfile, "user_id">>) => {
      setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
      const { error } = await supabase
        .from("app_profiles")
        .upsert(
          { user_id: userId, ...patch, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      if (error) throw new Error(error.message);
    },
    [supabase, userId],
  );

  const saveHustles = useCallback(
    async (next: { id: string; name: string; color: string }[]) => {
      const rows = next.map((h) => ({
        user_id: userId,
        id: h.id,
        name: h.name,
        color: h.color,
        updated_at: new Date().toISOString(),
      }));
      setHustles(rows);
      if (!rows.length) return;
      const { error } = await supabase
        .from("app_hustles")
        .upsert(rows, { onConflict: "user_id,id" });
      if (error) throw new Error(error.message);
    },
    [supabase, userId],
  );

  const addTransaction = useCallback(
    async (row: AppTransaction) => {
      localWrites.current.add(row.id);
      setTransactions((prev) => [row, ...prev].sort(byDateDesc));
      const { error } = await supabase.from("app_transactions").insert(row);
      if (error) {
        // Roll back so the list never shows a row the server rejected.
        setTransactions((prev) => prev.filter((t) => t.id !== row.id));
        throw new Error(error.message);
      }
    },
    [supabase],
  );

  const updateTransaction = useCallback(
    async (id: string, patch: Partial<AppTransaction>) => {
      const before = transactions.find((t) => t.id === id);
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t)).sort(byDateDesc),
      );
      const { error } = await supabase
        .from("app_transactions")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) {
        if (before) setTransactions((prev) => prev.map((t) => (t.id === id ? before : t)));
        throw new Error(error.message);
      }
    },
    [supabase, userId, transactions],
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      const before = transactions.find((t) => t.id === id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      const { error } = await supabase
        .from("app_transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) {
        if (before) setTransactions((prev) => [before, ...prev].sort(byDateDesc));
        throw new Error(error.message);
      }
      // Drop the receipt image too, so we don't pay to store orphans. Mobile's
      // delete path does the same. Best-effort: the row is already gone.
      if (before?.image_path) {
        await supabase.storage.from("receipts").remove([before.image_path]);
      }
    },
    [supabase, userId, transactions],
  );

  const value = useMemo<AppDataValue>(
    () => ({
      userId,
      profile,
      hustles,
      transactions,
      loading,
      freshIds,
      saveProfile,
      saveHustles,
      addTransaction,
      updateTransaction,
      removeTransaction,
    }),
    [
      userId,
      profile,
      hustles,
      transactions,
      loading,
      freshIds,
      saveProfile,
      saveHustles,
      addTransaction,
      updateTransaction,
      removeTransaction,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
