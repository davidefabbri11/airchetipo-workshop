import { AdequacyLevel, Goal, MealStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdequacyResult {
  adequacy: AdequacyLevel;
  consumptionFrequency: string;
  remainingBudgetAtAnalysis: number;
}

// ---------------------------------------------------------------------------
// computeRemainingBudget
// ---------------------------------------------------------------------------

/**
 * Calcola il budget calorico residuo per l'utente nella giornata corrente,
 * escludendo il pasto corrente (ancora in analisi).
 *
 * @param userId - ID utente nel DB Prisma
 * @param excludeMealId - ID del pasto corrente da escludere dalla somma
 * @param targetCalories - budget calorico giornaliero target dell'utente
 * @returns calorie residue (può essere negativo se il budget è già sforato)
 */
export async function computeRemainingBudget(
  userId: string,
  excludeMealId: string,
  targetCalories: number
): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const result = await prisma.meal.aggregate({
    where: {
      userId,
      id: { not: excludeMealId },
      status: MealStatus.ANALYZED,
      analyzedAt: { gte: todayStart, lte: todayEnd },
    },
    _sum: { totalCalories: true },
  });

  const consumed = result._sum.totalCalories ?? 0;
  return targetCalories - consumed;
}

// ---------------------------------------------------------------------------
// computeAdequacy
// ---------------------------------------------------------------------------

/**
 * Valuta se un pasto è adeguato rispetto al budget calorico residuo.
 *
 * Soglie:
 * - mealCalories > remainingBudget × 1.3 → EXCESSIVE
 * - mealCalories < remainingBudget × 0.15 → INSUFFICIENT
 * - altrimenti → ADEQUATE
 *
 * Caso speciale: se remainingBudget ≤ 0 il budget è già sforato,
 * qualunque pasto aggiuntivo è EXCESSIVE (tranne pasti con 0 calorie).
 */
export function computeAdequacy(
  mealCalories: number,
  remainingBudget: number
): AdequacyLevel {
  if (remainingBudget <= 0) {
    return mealCalories > 0 ? AdequacyLevel.EXCESSIVE : AdequacyLevel.ADEQUATE;
  }
  if (mealCalories > remainingBudget * 1.3) {
    return AdequacyLevel.EXCESSIVE;
  }
  if (mealCalories < remainingBudget * 0.15) {
    return AdequacyLevel.INSUFFICIENT;
  }
  return AdequacyLevel.ADEQUATE;
}

// ---------------------------------------------------------------------------
// suggestFrequency
// ---------------------------------------------------------------------------

/**
 * Suggerisce una frequenza di consumo settimanale in base alla densità
 * calorica del pasto e all'obiettivo dell'utente.
 */
export function suggestFrequency(mealCalories: number, goal: Goal): string {
  const isHighCalorie = mealCalories > 700;
  const isMediumCalorie = mealCalories >= 300 && mealCalories <= 700;

  switch (goal) {
    case Goal.LOSE_WEIGHT:
      if (isHighCalorie) return "1 volta a settimana";
      if (isMediumCalorie) return "2-3 volte a settimana";
      return "Tutti i giorni";

    case Goal.REDUCE_FAT:
      if (isHighCalorie) return "1-2 volte a settimana";
      if (isMediumCalorie) return "3-4 volte a settimana";
      return "Tutti i giorni";

    case Goal.GAIN_MUSCLE:
      if (isHighCalorie) return "3-4 volte a settimana";
      if (isMediumCalorie) return "Tutti i giorni";
      return "2 volte al giorno";

    case Goal.MAINTAIN:
    default:
      if (isHighCalorie) return "2-3 volte a settimana";
      if (isMediumCalorie) return "4-5 volte a settimana";
      return "Tutti i giorni";
  }
}
