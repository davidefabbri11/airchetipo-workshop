"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const supabase = createClient();

type MealComponent = {
  id: string;
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  estimatedGrams: number;
};

type Meal = {
  id: string;
  imageUrl: string;
  status: string;
  createdAt: string;
  components: MealComponent[];
};

type Period = "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Oggi",
  week: "Questa settimana",
  month: "Questo mese",
};

function getTotalCalories(components: MealComponent[]): number {
  return Math.round(components.reduce((sum, c) => sum + c.calories, 0));
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MealCard({ meal }: { meal: Meal }) {
  const router = useRouter();
  const { data } = supabase.storage.from("meals").getPublicUrl(meal.imageUrl);
  const publicUrl = data.publicUrl;

  const topComponents = meal.components.slice(0, 3);
  const totalCalories = getTotalCalories(meal.components);

  return (
    <Card
      className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
      onClick={() => router.push(`/analysis/${meal.id}`)}
    >
      <div className="flex gap-3 p-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
          {publicUrl && (
            <Image
              src={publicUrl}
              alt="Foto pasto"
              fill
              sizes="80px"
              className="object-cover"
            />
          )}
        </div>
        <CardContent className="flex flex-1 flex-col justify-between p-0">
          <div className="flex flex-wrap gap-1">
            {topComponents.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center rounded-md bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-100"
              >
                {c.name}
              </span>
            ))}
            {meal.components.length > 3 && (
              <span className="inline-flex items-center rounded-md bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-400">
                +{meal.components.length - 3}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-sm font-semibold text-primary">
              {totalCalories} kcal
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(meal.createdAt)}
            </span>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export default function HistoryPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeals = useCallback(async (selectedPeriod: Period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/meals/history?period=${selectedPeriod}&limit=10`
      );
      if (!res.ok) throw new Error("Errore nel caricamento dei pasti");
      const data = await res.json();
      setMeals(data.meals);
      setNextCursor(data.nextCursor);
    } catch {
      setError("Impossibile caricare i pasti. Riprova.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/meals/history?period=${period}&limit=10&cursor=${nextCursor}`
      );
      if (!res.ok) throw new Error("Errore nel caricamento");
      const data = await res.json();
      setMeals((prev) => [...prev, ...data.meals]);
      setNextCursor(data.nextCursor);
    } catch {
      setError("Impossibile caricare altri pasti. Riprova.");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchMeals(period);
  }, [period, fetchMeals]);

  const handlePeriodChange = (newPeriod: Period) => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    setMeals([]);
    setNextCursor(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Storico pasti</h1>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Dashboard
          </Link>
        </div>

        {/* Filter buttons */}
        <div className="mb-6 flex gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange(p)}
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl bg-zinc-800"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        ) : meals.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">
              Nessun pasto registrato per questo periodo.
            </p>
            <Button asChild>
              <Link href="/scan">Scatta una foto</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>

            {nextCursor && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Caricamento..." : "Carica altri"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
