"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";
import { cn } from "@/lib/utils";

type ActivityLevel = ProfileInput["activityLevel"];
type Goal = ProfileInput["goal"];

const ACTIVITY_OPTIONS: {
  value: ActivityLevel;
  icon: string;
  name: string;
  desc: string;
}[] = [
  {
    value: "SEDENTARY",
    icon: "\u{1F9D8}",
    name: "Sedentario",
    desc: "Lavoro d'ufficio, poco movimento quotidiano",
  },
  {
    value: "LIGHT",
    icon: "\u{1F6B6}",
    name: "Leggero",
    desc: "Camminate regolari, 1-2 allenamenti a settimana",
  },
  {
    value: "MODERATE",
    icon: "\u{1F3C3}",
    name: "Moderato",
    desc: "3-5 allenamenti a settimana, stile di vita attivo",
  },
  {
    value: "INTENSE",
    icon: "\u{1F3CB}\u{FE0F}",
    name: "Intenso",
    desc: "6-7 allenamenti, sport competitivo o lavoro fisico",
  },
];

const GOAL_OPTIONS: {
  value: Goal;
  icon: string;
  name: string;
  desc: string;
}[] = [
  {
    value: "LOSE_WEIGHT",
    icon: "\u{2B07}\u{FE0F}",
    name: "Perdita peso",
    desc: "Deficit calorico controllato per perdere peso in modo sano e sostenibile.",
  },
  {
    value: "GAIN_MUSCLE",
    icon: "\u{1F4AA}",
    name: "Aumento massa",
    desc: "Surplus calorico mirato con alto apporto proteico per massa muscolare magra.",
  },
  {
    value: "REDUCE_FAT",
    icon: "\u{1F525}",
    name: "Riduzione grasso",
    desc: "Ricomposizione corporea \u2014 perdere grasso mantenendo la massa muscolare.",
  },
  {
    value: "MAINTAIN",
    icon: "\u{2696}\u{FE0F}",
    name: "Mantenimento",
    desc: "Mantieni il peso attuale con una dieta equilibrata e nutriente.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");

  // Step 2
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(
    null
  );

  // Step 3
  const [goal, setGoal] = useState<Goal | null>(null);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateStep1(): boolean {
    const result = profileSchema.pick({ height: true, weight: true, age: true }).safeParse({
      height: height !== "" ? parseFloat(height) : undefined,
      weight: weight !== "" ? parseFloat(weight) : undefined,
      age: age !== "" ? parseInt(age, 10) : undefined,
    });

    if (result.success) {
      setErrors({});
      return true;
    }

    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    setErrors(fieldErrors);
    return false;
  }

  function validateStep2(): boolean {
    if (!activityLevel) {
      setErrors({ activityLevel: "Il livello di attivit\u00E0 \u00E8 obbligatorio" });
      return false;
    }
    setErrors({});
    return true;
  }

  function validateStep3(): boolean {
    if (!goal) {
      setErrors({ goal: "L'obiettivo \u00E8 obbligatorio" });
      return false;
    }
    setErrors({});
    return true;
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step < 3) {
      setStep(step + 1);
      setErrors({});
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    }
  }

  async function handleComplete() {
    if (!validateStep3()) return;

    const data: ProfileInput = {
      height: parseFloat(height),
      weight: parseFloat(weight),
      age: parseInt(age, 10),
      activityLevel: activityLevel!,
      goal: goal!,
    };

    // Full validation
    const result = profileSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrors({ submit: body.error || "Errore durante il salvataggio" });
        return;
      }

      router.replace("/goals");
    } catch {
      setErrors({ submit: "Errore di rete. Riprova." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-[680px] flex-1 flex-col px-6 py-8 md:px-6">
        {/* Progress bar */}
        <div className="mb-10 flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                i < step
                  ? "bg-primary"
                  : i === step
                    ? "bg-muted-foreground/30 relative overflow-hidden"
                    : "bg-muted"
              )}
            >
              {i === step && (
                <div className="absolute inset-y-0 left-0 w-1/2 animate-pulse rounded-full bg-primary/60" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1">
          {/* ========== STEP 1 ========== */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Passo 1 di 3
              </p>
              <h2 className="mb-2 text-3xl font-bold">
                Raccontaci di te {"\u{1F4CF}"}
              </h2>
              <p className="mb-8 max-w-[500px] text-base text-muted-foreground">
                Queste informazioni ci servono per calcolare il tuo fabbisogno
                calorico e creare un piano personalizzato.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6">
                {/* Height */}
                <div className="space-y-2">
                  <Label htmlFor="height">Altezza (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="165"
                    min={50}
                    max={300}
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    aria-invalid={!!errors.height}
                  />
                  {errors.height && (
                    <p className="text-xs text-destructive">{errors.height}</p>
                  )}
                </div>

                {/* Weight */}
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso attuale (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="70"
                    min={20}
                    max={500}
                    step={0.1}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    aria-invalid={!!errors.weight}
                  />
                  {errors.weight && (
                    <p className="text-xs text-destructive">{errors.weight}</p>
                  )}
                </div>

                {/* Age — full width */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="age">Et&agrave;</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="34"
                    min={10}
                    max={120}
                    className="max-w-[200px]"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    aria-invalid={!!errors.age}
                  />
                  {errors.age && (
                    <p className="text-xs text-destructive">{errors.age}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========== STEP 2 ========== */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Passo 2 di 3
              </p>
              <h2 className="mb-2 text-3xl font-bold">
                Quanto ti muovi? {"\u{1F3C3}"}
              </h2>
              <p className="mb-8 max-w-[500px] text-base text-muted-foreground">
                Il tuo livello di attivit&agrave; ci aiuta a calibrare le
                calorie giornaliere raccomandate.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {ACTIVITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setActivityLevel(opt.value);
                      setErrors({});
                    }}
                    className={cn(
                      "cursor-pointer rounded-xl border bg-card p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-sm",
                      activityLevel === opt.value
                        ? "border-primary bg-primary/5 shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                        : "border-border"
                    )}
                  >
                    <div className="mb-3 text-4xl">{opt.icon}</div>
                    <div className="mb-1 text-base font-semibold">
                      {opt.name}
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>

              {errors.activityLevel && (
                <p className="mt-4 text-xs text-destructive">
                  {errors.activityLevel}
                </p>
              )}
            </div>
          )}

          {/* ========== STEP 3 ========== */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Passo 3 di 3
              </p>
              <h2 className="mb-2 text-3xl font-bold">
                Qual &egrave; il tuo obiettivo? {"\u{1F3AF}"}
              </h2>
              <p className="mb-8 max-w-[500px] text-base text-muted-foreground">
                Scegli il risultato che vuoi raggiungere. Potrai sempre
                cambiarlo dalle impostazioni.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {GOAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setGoal(opt.value);
                      setErrors({});
                    }}
                    className={cn(
                      "relative cursor-pointer rounded-2xl border bg-card p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md",
                      goal === opt.value
                        ? "border-primary shadow-[0_0_0_3px_rgba(0,0,0,0.04)] bg-gradient-to-br from-primary/5 to-card"
                        : "border-border"
                    )}
                  >
                    {goal === opt.value && (
                      <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {"\u2713"}
                      </span>
                    )}
                    <div className="mb-3 text-4xl">{opt.icon}</div>
                    <div className="mb-2 text-lg font-semibold">{opt.name}</div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>

              {errors.goal && (
                <p className="mt-4 text-xs text-destructive">{errors.goal}</p>
              )}
            </div>
          )}
        </div>

        {/* Submit error */}
        {errors.submit && (
          <p className="mt-4 text-sm text-destructive">{errors.submit}</p>
        )}

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className={cn(step === 1 && "invisible")}
          >
            {"\u2190"} Indietro
          </Button>

          <span className="text-sm text-muted-foreground">
            Passo {step} di 3
          </span>

          {step < 3 ? (
            <Button onClick={handleNext}>Avanti {"\u2192"}</Button>
          ) : (
            <Button onClick={handleComplete} disabled={submitting}>
              {submitting ? "Salvataggio..." : "Completa \u{1F680}"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
