import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "@linggan_inspirations_v1";

export interface LocalInspiration {
  id: number;
  word1: string;
  word2: string;
  word3: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface InspirationStats {
  total: number;
  todayCount: number;
  weekCount: number;
  streakDays: number;
}

interface InspirationContextValue {
  inspirations: LocalInspiration[];
  loading: boolean;
  stats: InspirationStats;
  addInspiration: (input: Pick<LocalInspiration, "word1" | "word2" | "word3" | "content">) => Promise<LocalInspiration>;
  updateInspiration: (id: number, content: string) => Promise<boolean>;
  deleteInspiration: (id: number) => Promise<boolean>;
  getInspiration: (id: number) => LocalInspiration | undefined;
}

const InspirationContext = createContext<InspirationContextValue | null>(null);

function dayKey(value: string | Date): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function calculateInspirationStats(items: LocalInspiration[], now = new Date()): InspirationStats {
  const today = dayKey(now);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const days = new Set(items.map((item) => dayKey(item.createdAt)));

  let streakDays = 0;
  for (let offset = 0; ; offset += 1) {
    const expected = new Date(now);
    expected.setDate(expected.getDate() - offset);
    if (!days.has(dayKey(expected))) break;
    streakDays += 1;
  }

  return {
    total: items.length,
    todayCount: items.filter((item) => dayKey(item.createdAt) === today).length,
    weekCount: items.filter((item) => new Date(item.createdAt) >= weekStart).length,
    streakDays,
  };
}

export function InspirationProvider({ children }: { children: React.ReactNode }) {
  const [inspirations, setInspirations] = useState<LocalInspiration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setInspirations(parsed);
      })
      .catch((error) => console.error("加载本地灵感失败:", error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (next: LocalInspiration[]) => {
    setInspirations(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addInspiration = useCallback(async (input: Pick<LocalInspiration, "word1" | "word2" | "word3" | "content">) => {
    const now = new Date();
    const item: LocalInspiration = {
      ...input,
      id: now.getTime(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const next = [item, ...inspirations];
    await persist(next);
    return item;
  }, [inspirations, persist]);

  const updateInspiration = useCallback(async (id: number, content: string) => {
    if (!inspirations.some((item) => item.id === id)) return false;
    const next = inspirations.map((item) => item.id === id
      ? { ...item, content, updatedAt: new Date().toISOString() }
      : item);
    await persist(next);
    return true;
  }, [inspirations, persist]);

  const deleteInspiration = useCallback(async (id: number) => {
    const next = inspirations.filter((item) => item.id !== id);
    if (next.length === inspirations.length) return false;
    await persist(next);
    return true;
  }, [inspirations, persist]);

  const getInspiration = useCallback(
    (id: number) => inspirations.find((item) => item.id === id),
    [inspirations],
  );
  const stats = useMemo(() => calculateInspirationStats(inspirations), [inspirations]);
  const value = useMemo(() => ({
    inspirations,
    loading,
    stats,
    addInspiration,
    updateInspiration,
    deleteInspiration,
    getInspiration,
  }), [inspirations, loading, stats, addInspiration, updateInspiration, deleteInspiration, getInspiration]);

  return <InspirationContext.Provider value={value}>{children}</InspirationContext.Provider>;
}

export function useInspirations(): InspirationContextValue {
  const context = useContext(InspirationContext);
  if (!context) throw new Error("useInspirations must be used within InspirationProvider");
  return context;
}
