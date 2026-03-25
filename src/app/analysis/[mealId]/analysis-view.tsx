"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Meal, MealComponent, AdequacyLevel } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MealWithComponents = Meal & { components: MealComponent[] };

interface AnalysisViewProps {
  meal: MealWithComponents;
  imagePublicUrl: string;
}

// ---------------------------------------------------------------------------
// Adequacy config
// ---------------------------------------------------------------------------

const ADEQUACY_CONFIG: Record<
  AdequacyLevel,
  { icon: string; label: string; description: string; color: string; bg: string; border: string }
> = {
  ADEQUATE: {
    icon: "✅",
    label: "Piatto Adeguato",
    description: "Questo piatto si adatta bene al tuo obiettivo giornaliero.",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.25)",
  },
  EXCESSIVE: {
    icon: "⚠️",
    label: "Porzione Eccessiva",
    description: "Questo piatto supera il budget calorico residuo consigliato.",
    color: "#e74c3c",
    bg: "rgba(231,76,60,0.08)",
    border: "rgba(231,76,60,0.25)",
  },
  INSUFFICIENT: {
    icon: "ℹ️",
    label: "Apporto Insufficiente",
    description: "Questo piatto contribuisce poco al tuo fabbisogno giornaliero.",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.08)",
    border: "rgba(96,165,250,0.25)",
  },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnalysisView({ meal, imagePublicUrl }: AnalysisViewProps) {
  const router = useRouter();
  const isPending = meal.status === "PENDING";

  // Poll every 3 seconds while the meal is still being analyzed
  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [isPending, router]);

  // -------------------------------------------------------------------
  // PENDING state
  // -------------------------------------------------------------------
  if (isPending) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6 px-4"
        style={{ background: "linear-gradient(135deg, #0f1d15 0%, #0d1a12 50%, #111a0f 100%)" }}
      >
        {/* Spinner */}
        <div className="relative h-20 w-20">
          <svg viewBox="0 0 80 80" className="h-20 w-20 animate-spin">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="5"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#d4a853"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="213.628"
              strokeDashoffset="160"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🍽️</div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: "#f5f2e8" }}>
            Analisi in corso…
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#8fa88b" }}>
            L&apos;AI sta analizzando i componenti del tuo piatto.
            <br />
            La pagina si aggiornerà automaticamente.
          </p>
        </div>

        <Link
          href="/scan"
          className="mt-2 text-sm underline-offset-4 hover:underline"
          style={{ color: "#8fa88b" }}
        >
          ← Scansiona un altro pasto
        </Link>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // ANALYZED state
  // -------------------------------------------------------------------

  const adequacyConfig = meal.adequacy ? ADEQUACY_CONFIG[meal.adequacy] : null;

  // Budget bar
  const totalCal = meal.totalCalories ?? 0;
  const remaining = meal.remainingBudgetAtAnalysis ?? null;
  const budgetTotal = remaining !== null ? Math.max(totalCal + remaining, 1) : null;
  const budgetPercent =
    budgetTotal !== null ? Math.min(Math.max((totalCal / budgetTotal) * 100, 0), 100) : null;

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #0f1d15 0%, #0d1a12 50%, #111a0f 100%)" }}
    >
      <div className="mx-auto max-w-2xl px-4 py-8">

        {/* ------------------------------------------------------------------ */}
        {/* Sezione 1: Header                                                   */}
        {/* ------------------------------------------------------------------ */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <Link href="/scan" className="text-sm" style={{ color: "#8fa88b" }}>
              ← Scansiona altro
            </Link>

            {/* Badge stato */}
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
              style={
                meal.status === "ANALYZED"
                  ? {
                      background: "rgba(34,197,94,0.12)",
                      color: "#22c55e",
                      border: "1px solid rgba(34,197,94,0.3)",
                    }
                  : {
                      background: "rgba(212,168,83,0.12)",
                      color: "#d4a853",
                      border: "1px solid rgba(212,168,83,0.3)",
                    }
              }
            >
              {meal.status === "ANALYZED" ? "Analizzato" : "In attesa"}
            </span>
          </div>

          <h1 className="text-3xl font-bold" style={{ color: "#f5f2e8" }}>
            Analisi Nutrizionale
          </h1>
          {meal.analyzedAt && (
            <p className="mt-1 text-sm" style={{ color: "#8fa88b" }}>
              {new Date(meal.analyzedAt).toLocaleString("it-IT", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>

        {/* Meal image thumbnail */}
        <div
          className="mb-6 overflow-hidden rounded-2xl"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePublicUrl}
            alt="Foto del pasto analizzato"
            className="h-52 w-full object-cover"
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Sezione 2: Semaforo Adeguatezza                                     */}
        {/* ------------------------------------------------------------------ */}
        {adequacyConfig && (
          <div
            className="mb-4 rounded-2xl p-5"
            style={{
              background: adequacyConfig.bg,
              border: `1px solid ${adequacyConfig.border}`,
            }}
          >
            <div className="flex items-start gap-4">
              <span className="mt-0.5 text-2xl">{adequacyConfig.icon}</span>
              <div>
                <p className="font-semibold" style={{ color: adequacyConfig.color }}>
                  {adequacyConfig.label}
                </p>
                <p className="mt-1 text-sm" style={{ color: "#8fa88b" }}>
                  {adequacyConfig.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Sezione 2b: Banner profilo incompleto                               */}
        {/* ------------------------------------------------------------------ */}
        {meal.adequacy === null && (
          <div
            className="mb-4 rounded-2xl p-5"
            style={{
              background: "rgba(212,168,83,0.1)",
              border: "1px solid rgba(212,168,83,0.3)",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "#d4a853" }}>
              Completa il profilo per la valutazione
            </p>
            <p className="mt-1 text-sm" style={{ color: "#8fa88b" }}>
              Imposta il tuo obiettivo calorico per ricevere una valutazione personalizzata.
            </p>
            <Link
              href="/dashboard"
              className="mt-3 inline-block text-sm font-medium"
              style={{ color: "#d4a853" }}
            >
              → Vai al profilo
            </Link>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Sezione 3: Badge frequenza di consumo                               */}
        {/* ------------------------------------------------------------------ */}
        {meal.consumptionFrequency && (
          <div className="mb-4">
            <span
              className="inline-block rounded-full px-4 py-1.5 text-sm font-medium"
              style={{
                background: "rgba(212,168,83,0.1)",
                color: "#d4a853",
                border: "1px solid rgba(212,168,83,0.25)",
              }}
            >
              Frequenza consigliata: {meal.consumptionFrequency}
            </span>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Sezione 4: Barra budget giornaliero                                 */}
        {/* ------------------------------------------------------------------ */}
        {budgetTotal !== null && budgetPercent !== null && (
          <div
            className="mb-4 rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h3 className="mb-3 text-sm font-semibold" style={{ color: "#f5f2e8" }}>
              Budget Calorico Giornaliero
            </h3>

            {/* Bar */}
            <div
              className="h-2.5 w-full overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${budgetPercent}%`,
                  background:
                    budgetPercent > 90
                      ? "linear-gradient(90deg, #e74c3c, #c0392b)"
                      : budgetPercent > 70
                      ? "linear-gradient(90deg, #d4a853, #f0c87a)"
                      : "linear-gradient(90deg, #4a8c5c, #22c55e)",
                }}
              />
            </div>

            <p className="mt-2 text-xs" style={{ color: "#8fa88b" }}>
              {Math.round(totalCal)} kcal usate su {Math.round(budgetTotal)} kcal totali
            </p>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Sezione 5: Riepilogo nutrizionale                                   */}
        {/* ------------------------------------------------------------------ */}
        <div
          className="mb-4 rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, #1a3322, #0d2418)",
            border: "1px solid rgba(212,168,83,0.2)",
          }}
        >
          <h3 className="mb-4 font-semibold" style={{ color: "#f5f2e8" }}>
            Riepilogo Nutrizionale
          </h3>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NutrientCard
              label="Calorie"
              value={meal.totalCalories?.toFixed(0) ?? "—"}
              unit="kcal"
              accent
            />
            <NutrientCard
              label="Proteine"
              value={meal.totalProteins?.toFixed(1) ?? "—"}
              unit="g"
            />
            <NutrientCard
              label="Carboidrati"
              value={meal.totalCarbs?.toFixed(1) ?? "—"}
              unit="g"
            />
            <NutrientCard
              label="Grassi"
              value={meal.totalFats?.toFixed(1) ?? "—"}
              unit="g"
            />
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Sezione 6: Componenti del piatto                                    */}
        {/* ------------------------------------------------------------------ */}
        {meal.components.length > 0 && (
          <div>
            <h3 className="mb-3 font-semibold" style={{ color: "#f5f2e8" }}>
              Componenti del piatto
            </h3>

            <div className="flex flex-col gap-3">
              {meal.components.map((component) => (
                <div
                  key={component.id}
                  className="rounded-2xl p-5"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {/* Component header */}
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-semibold capitalize" style={{ color: "#f5f2e8" }}>
                      {component.name}
                    </h4>
                    <span
                      className="rounded px-2 py-0.5 text-xs font-bold"
                      style={{
                        background: "rgba(212,168,83,0.15)",
                        color: "#d4a853",
                        border: "1px solid rgba(212,168,83,0.3)",
                      }}
                    >
                      {component.estimatedGrams}g
                    </span>
                  </div>

                  {/* Nutrient grid */}
                  <div className="grid grid-cols-4 gap-2">
                    <ComponentNutrient
                      label="Calorie"
                      value={component.calories.toFixed(0)}
                      unit="kcal"
                      accent
                    />
                    <ComponentNutrient
                      label="Proteine"
                      value={component.proteins.toFixed(1)}
                      unit="g"
                    />
                    <ComponentNutrient
                      label="Carbs"
                      value={component.carbs.toFixed(1)}
                      unit="g"
                    />
                    <ComponentNutrient
                      label="Grassi"
                      value={component.fats.toFixed(1)}
                      unit="g"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <Link
          href="/scan"
          className="mt-6 flex items-center justify-center rounded-2xl py-3 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#f5f2e8",
          }}
        >
          📷 Analizza un altro pasto
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NutrientCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center rounded-xl py-4"
      style={{ background: "rgba(255,255,255,0.05)" }}
    >
      <span
        className="text-2xl font-bold"
        style={{ color: accent ? "#d4a853" : "#f5f2e8" }}
      >
        {value}
      </span>
      <span className="mt-0.5 text-xs" style={{ color: "#8fa88b" }}>
        {unit}
      </span>
      <span className="mt-1 text-xs" style={{ color: "#5a6858" }}>
        {label}
      </span>
    </div>
  );
}

function ComponentNutrient({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center rounded-xl py-3"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <span
        className="text-base font-bold"
        style={{ color: accent ? "#d4a853" : "#f5f2e8" }}
      >
        {value}
      </span>
      <span className="text-xs" style={{ color: "#8fa88b" }}>
        {unit}
      </span>
      <span className="mt-0.5 text-xs" style={{ color: "#5a6858" }}>
        {label}
      </span>
    </div>
  );
}
