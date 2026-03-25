import { ActivityLevel, Goal } from "@prisma/client";

export interface ProfileForGoals {
  height: number;
  weight: number;
  age: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface GoalSuggestion {
  id: string;
  title: string;
  description: string;
  targetCalories: number;
  timeframeDays: number;
  recommended?: boolean;
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  INTENSE: 1.725,
};

export function calculateBMR(profile: ProfileForGoals): number {
  const { weight, height, age } = profile;
  // Mifflin-St Jeor (neutral — no sex constant, using average +5/-161 → 0 as neutral approximation)
  // We use the male formula as default; in a real app, sex would be a profile field.
  return 10 * weight + 6.25 * height - 5 * age + 5;
}

export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel
): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activityLevel]);
}

export function generateGoalSuggestions(
  profile: ProfileForGoals
): GoalSuggestion[] {
  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(bmr, profile.activityLevel);

  switch (profile.goal) {
    case "LOSE_WEIGHT": {
      const moderate: GoalSuggestion = {
        id: "lose-weight-moderate",
        title: "Perdita peso moderata",
        description:
          "Deficit calorico moderato e sostenibile. Circa 0.4 kg a settimana con un approccio graduale che preserva la massa muscolare.",
        targetCalories: Math.round(tdee - 420),
        timeframeDays: 84, // 12 weeks
        recommended: true,
      };
      const aggressive: GoalSuggestion = {
        id: "lose-weight-aggressive",
        title: "Perdita peso accelerata",
        description:
          "Deficit più marcato per risultati più rapidi. Circa 0.7 kg a settimana. Richiede disciplina alimentare costante.",
        targetCalories: Math.round(tdee - 700),
        timeframeDays: 56, // 8 weeks
      };
      return [moderate, aggressive];
    }

    case "GAIN_MUSCLE": {
      const suggestion: GoalSuggestion = {
        id: "gain-muscle",
        title: "Aumento massa muscolare",
        description:
          "Surplus calorico controllato con alto apporto proteico. Ideale per costruire massa magra con allenamento di resistenza.",
        targetCalories: Math.round(tdee + 300),
        timeframeDays: 112, // 16 weeks
        recommended: true,
      };
      const lean: GoalSuggestion = {
        id: "gain-muscle-lean",
        title: "Bulk pulito",
        description:
          "Surplus minimo per guadagno muscolare con minimo accumulo di grasso. Crescita più lenta ma di qualità.",
        targetCalories: Math.round(tdee + 150),
        timeframeDays: 168, // 24 weeks
      };
      return [suggestion, lean];
    }

    case "REDUCE_FAT": {
      const recomp: GoalSuggestion = {
        id: "reduce-fat-recomp",
        title: "Riduzione grasso corporeo",
        description:
          "Ricomposizione corporea con surplus proteico. Perdi grasso mantenendo la massa magra con alimentazione mirata.",
        targetCalories: Math.round(tdee - 300),
        timeframeDays: 112, // 16 weeks
        recommended: true,
      };
      return [recomp];
    }

    case "MAINTAIN":
    default: {
      const maintain: GoalSuggestion = {
        id: "maintain",
        title: "Mantenimento equilibrato",
        description:
          "Mantieni il peso attuale con un piano alimentare bilanciato. Ideale per stabilizzare le abitudini alimentari.",
        targetCalories: tdee,
        timeframeDays: 0, // ongoing
        recommended: true,
      };
      return [maintain];
    }
  }
}
