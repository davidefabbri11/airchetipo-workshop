"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { GoalSuggestion } from "@/lib/nutrition/goals";
import { selectedGoalSchema } from "@/lib/validations/goals";

interface ProfileSummary {
  height: number;
  weight: number;
  age: number;
  activityLevel: "SEDENTARY" | "LIGHT" | "MODERATE" | "INTENSE";
}

const ACTIVITY_LABELS: Record<ProfileSummary["activityLevel"], string> = {
  SEDENTARY: "Sedentario",
  LIGHT: "Leggero",
  MODERATE: "Moderato",
  INTENSE: "Intenso",
};

const GOAL_ICONS: Record<string, string> = {
  "lose-weight-moderate": "⚖️",
  "lose-weight-aggressive": "⬇️",
  "gain-muscle": "💪",
  "gain-muscle-lean": "🏋️",
  "reduce-fat-recomp": "🔥",
  maintain: "⚖️",
};

const GOAL_ICON_BG: Record<string, string> = {
  "lose-weight-moderate": "bg-gradient-to-br from-green-50 to-green-100",
  "lose-weight-aggressive": "bg-gradient-to-br from-red-50 to-red-100",
  "gain-muscle": "bg-gradient-to-br from-blue-50 to-blue-100",
  "gain-muscle-lean": "bg-gradient-to-br from-indigo-50 to-indigo-100",
  "reduce-fat-recomp": "bg-gradient-to-br from-amber-50 to-amber-100",
  maintain: "bg-gradient-to-br from-sky-50 to-sky-100",
};

function getDefaultIcon(id: string): string {
  return GOAL_ICONS[id] ?? "🎯";
}

function getDefaultIconBg(id: string): string {
  return GOAL_ICON_BG[id] ?? "bg-gradient-to-br from-gray-50 to-gray-100";
}

function formatTimeframe(days: number): string {
  if (days === 0) return "Continuo";
  const weeks = Math.round(days / 7);
  return `${weeks} settimane`;
}

export default function GoalsPage() {
  const router = useRouter();

  const [suggestions, setSuggestions] = useState<GoalSuggestion[]>([]);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCalories, setSelectedCalories] = useState<number | null>(null);
  const [selectedDescription, setSelectedDescription] = useState<string>("");

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customCalories, setCustomCalories] = useState("");
  const [customDescription, setCustomDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [suggestionsRes, profileRes] = await Promise.all([
          fetch("/api/goals/suggestions"),
          fetch("/api/profile"),
        ]);

        if (suggestionsRes.ok) {
          const data: GoalSuggestion[] = await suggestionsRes.json();
          setSuggestions(data);
        }

        if (profileRes.ok) {
          const data: ProfileSummary = await profileRes.json();
          setProfile(data);
        }
      } catch {
        // silently ignore fetch errors on mount
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, []);

  function handleSelectCard(suggestion: GoalSuggestion) {
    setSelectedId(suggestion.id);
    setSelectedCalories(suggestion.targetCalories);
    setSelectedDescription(suggestion.title);
    setShowCustomForm(false);
    setCustomCalories("");
    setCustomDescription("");
    setError(null);
  }

  function handleToggleCustomForm() {
    const next = !showCustomForm;
    setShowCustomForm(next);
    if (next) {
      setSelectedId(null);
      setSelectedCalories(null);
      setSelectedDescription("");
    }
    setError(null);
  }

  const isCustomActive = showCustomForm && customCalories !== "";

  const canConfirm = selectedId !== null || isCustomActive;

  async function handleConfirm() {
    if (!canConfirm) return;

    let targetCalories: number;
    let goalDescription: string;

    if (showCustomForm) {
      const parsed = selectedGoalSchema.safeParse({
        targetCalories: customCalories !== "" ? parseInt(customCalories, 10) : undefined,
        goalDescription: customDescription.trim() || "Obiettivo personalizzato",
      });
      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        setError(firstError?.message ?? "Dati non validi");
        return;
      }
      targetCalories = parsed.data.targetCalories;
      goalDescription = parsed.data.goalDescription;
    } else {
      targetCalories = selectedCalories!;
      goalDescription = selectedDescription;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCalories, goalDescription }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Errore durante il salvataggio");
        return;
      }

      router.replace("/dashboard");
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-[780px] flex-1 flex-col px-6 py-8">
        {/* Top bar — logo */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-lg text-background">
              🍽️
            </div>
            <span className="text-xl font-bold">
              Magn<span className="text-amber-500">AI</span>
            </span>
          </div>
        </div>

        {/* Progress strip — 4 bars, first 3 filled, 4th active/animated */}
        <div className="mb-10 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                i < 4
                  ? "bg-primary"
                  : "relative overflow-hidden bg-muted-foreground/30"
              )}
            >
              {i === 4 && (
                <div className="absolute inset-y-0 left-0 w-1/2 animate-pulse rounded-full bg-primary/60" />
              )}
            </div>
          ))}
        </div>

        {/* Hero section */}
        <div className="animate-in fade-in slide-in-from-bottom-3 mb-10 text-center duration-300">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            Profilo analizzato
          </div>
          <h1 className="mb-3 text-4xl font-bold leading-tight">
            I tuoi obiettivi{" "}
            <em className="font-bold italic text-amber-600 not-italic">
              su misura
            </em>
          </h1>
          <p className="mx-auto max-w-[520px] text-lg leading-relaxed text-muted-foreground">
            Abbiamo analizzato i tuoi dati e calcolato obiettivi realistici.
            Scegline uno oppure definiscine uno personalizzato.
          </p>
        </div>

        {/* Profile summary strip */}
        {profile && (
          <div className="animate-in fade-in mb-10 flex flex-wrap items-center justify-center gap-3 duration-300 sm:gap-6">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {profile.height} cm
              </span>{" "}
              altezza
            </div>
            <div className="hidden h-5 w-px bg-border sm:block" />
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {profile.weight} kg
              </span>{" "}
              peso
            </div>
            <div className="hidden h-5 w-px bg-border sm:block" />
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {profile.age}
              </span>{" "}
              anni
            </div>
            <div className="hidden h-5 w-px bg-border sm:block" />
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {ACTIVITY_LABELS[profile.activityLevel]}
              </span>{" "}
              attività
            </div>
          </div>
        )}

        {/* Goal cards */}
        <div className="mb-8 flex flex-col gap-5">
          {loadingData && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Caricamento suggerimenti...
            </div>
          )}

          {!loadingData && suggestions.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nessun suggerimento disponibile. Completa prima il profilo.
            </div>
          )}

          {suggestions.map((suggestion) => {
            const isSelected = selectedId === suggestion.id;
            return (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleSelectCard(suggestion)}
                className={cn(
                  "relative grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-5 overflow-hidden rounded-2xl border bg-card px-8 py-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md",
                  isSelected
                    ? "border-primary bg-gradient-to-br from-primary/5 to-card shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                    : suggestion.recommended
                      ? "border-amber-400"
                      : "border-border"
                )}
              >
                {/* Recommended ribbon */}
                {suggestion.recommended && (
                  <span className="absolute right-0 top-0 rounded-bl-lg rounded-tr-2xl bg-amber-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                    Consigliato
                  </span>
                )}

                {/* Icon column */}
                <div
                  className={cn(
                    "flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl text-3xl transition-transform hover:scale-105",
                    getDefaultIconBg(suggestion.id)
                  )}
                >
                  {getDefaultIcon(suggestion.id)}
                </div>

                {/* Content column */}
                <div className="min-w-0">
                  <div className="mb-1 text-xl font-semibold">
                    {suggestion.title}
                  </div>
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                    {suggestion.description}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="opacity-70">🔥</span>
                      <span className="font-semibold text-foreground">
                        {suggestion.targetCalories.toLocaleString("it-IT")}
                      </span>{" "}
                      kcal/giorno
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="opacity-70">⏱️</span>
                      <span className="font-semibold text-foreground">
                        {formatTimeframe(suggestion.timeframeDays)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Check indicator column */}
                <div
                  className={cn(
                    "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {isSelected && (
                    <span className="text-xs font-bold">✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom goal toggle button */}
        <button
          type="button"
          onClick={handleToggleCustomForm}
          className={cn(
            "mb-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium transition-all",
            showCustomForm
              ? "border-primary bg-card text-foreground"
              : "border-dashed border-border text-muted-foreground hover:border-primary hover:bg-muted hover:text-foreground"
          )}
        >
          <span
            className={cn(
              "text-lg transition-transform duration-200",
              showCustomForm && "rotate-45"
            )}
          >
            +
          </span>
          Preferisco definire un obiettivo personalizzato
        </button>

        {/* Custom goal form (collapsible) */}
        {showCustomForm && (
          <div className="animate-in fade-in slide-in-from-top-2 mb-6 rounded-2xl border bg-card px-8 py-6 duration-200">
            <div className="mb-5 flex items-center gap-2 text-lg font-semibold">
              ✏️ Obiettivo personalizzato
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="customCalories">
                  Calorie giornaliere (kcal)
                </Label>
                <Input
                  id="customCalories"
                  type="number"
                  placeholder="1800"
                  min={800}
                  max={5000}
                  step={50}
                  value={customCalories}
                  onChange={(e) => {
                    setCustomCalories(e.target.value);
                    setError(null);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Inserisci il tuo target calorico giornaliero
                </p>
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="customDescription">
                  Descrizione obiettivo (opzionale)
                </Label>
                <Input
                  id="customDescription"
                  type="text"
                  placeholder="es. Perdere 5 kg entro l'estate"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Una breve descrizione del tuo obiettivo
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}

        {/* Action bar */}
        <div className="mt-auto flex flex-col items-stretch gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-muted-foreground sm:max-w-[280px]">
            Potrai modificare il tuo obiettivo in qualsiasi momento dalle
            impostazioni del profilo.
          </p>
          <div className="flex items-center justify-center gap-3 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => router.replace("/onboarding")}
            >
              ← Indietro
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm || submitting}
            >
              {submitting ? "Salvataggio..." : "Conferma obiettivo →"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
