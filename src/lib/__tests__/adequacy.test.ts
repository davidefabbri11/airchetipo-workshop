import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdequacyLevel, Goal } from "@prisma/client";

// ---------------------------------------------------------------------------
// Hoisted mocks (vi.hoisted ensures these are available before vi.mock)
// ---------------------------------------------------------------------------
const { mockMealAggregate } = vi.hoisted(() => ({
  mockMealAggregate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    meal: {
      aggregate: (...args: unknown[]) => mockMealAggregate(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Import functions under test (after mocks are declared)
// ---------------------------------------------------------------------------
import {
  computeAdequacy,
  computeRemainingBudget,
  suggestFrequency,
} from "@/lib/nutrition/adequacy";

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// computeAdequacy — funzione pura, nessun mock necessario
// ===========================================================================
describe("computeAdequacy", () => {
  it("budget abbondante → ADEQUATE (meal=400, budget=1000)", () => {
    expect(computeAdequacy(400, 1000)).toBe(AdequacyLevel.ADEQUATE);
  });

  it("pasto eccessivo rispetto al budget → EXCESSIVE (meal=800, budget=500)", () => {
    // 800 > 500 * 1.3 = 650 → EXCESSIVE
    expect(computeAdequacy(800, 500)).toBe(AdequacyLevel.EXCESSIVE);
  });

  it("pasto trascurabile → INSUFFICIENT (meal=30, budget=500)", () => {
    // 30 < 500 * 0.15 = 75 → INSUFFICIENT
    expect(computeAdequacy(30, 500)).toBe(AdequacyLevel.INSUFFICIENT);
  });

  it("esattamente al limite EXCESSIVE (meal = budget * 1.3) → ADEQUATE", () => {
    // 650 = 500 * 1.3 → not strictly greater, so ADEQUATE
    expect(computeAdequacy(650, 500)).toBe(AdequacyLevel.ADEQUATE);
  });

  it("esattamente al limite INSUFFICIENT (meal = budget * 0.15) → ADEQUATE", () => {
    // 75 = 500 * 0.15 → not strictly less, so ADEQUATE
    expect(computeAdequacy(75, 500)).toBe(AdequacyLevel.ADEQUATE);
  });

  it("budget a zero → EXCESSIVE (pasto con calorie > 0)", () => {
    expect(computeAdequacy(100, 0)).toBe(AdequacyLevel.EXCESSIVE);
  });

  it("budget negativo → EXCESSIVE (pasto con calorie > 0)", () => {
    expect(computeAdequacy(200, -100)).toBe(AdequacyLevel.EXCESSIVE);
  });

  it("meal a 0 calorie con budget ≤ 0 → ADEQUATE", () => {
    expect(computeAdequacy(0, 0)).toBe(AdequacyLevel.ADEQUATE);
    expect(computeAdequacy(0, -50)).toBe(AdequacyLevel.ADEQUATE);
  });
});

// ===========================================================================
// computeRemainingBudget — usa Prisma (mockato)
// ===========================================================================
describe("computeRemainingBudget", () => {
  const USER_ID = "user-uuid-abc";
  const EXCLUDE_MEAL_ID = "meal-uuid-xyz";
  const TARGET_CALORIES = 2000;

  it("primo pasto della giornata (nessun pasto today) → restituisce targetCalories intero", async () => {
    mockMealAggregate.mockResolvedValue({ _sum: { totalCalories: null } });

    const result = await computeRemainingBudget(
      USER_ID,
      EXCLUDE_MEAL_ID,
      TARGET_CALORIES
    );

    expect(result).toBe(2000);
  });

  it("con pasti già consumati → restituisce targetCalories - somma", async () => {
    mockMealAggregate.mockResolvedValue({ _sum: { totalCalories: 600 } });

    const result = await computeRemainingBudget(
      USER_ID,
      EXCLUDE_MEAL_ID,
      TARGET_CALORIES
    );

    expect(result).toBe(1400); // 2000 - 600
  });

  it("esclude correttamente il mealId passato nella query", async () => {
    mockMealAggregate.mockResolvedValue({ _sum: { totalCalories: 800 } });

    await computeRemainingBudget(USER_ID, EXCLUDE_MEAL_ID, TARGET_CALORIES);

    expect(mockMealAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: USER_ID,
          id: { not: EXCLUDE_MEAL_ID },
        }),
      })
    );
  });

  it("budget negativo (già sforato) → restituisce valore negativo", async () => {
    mockMealAggregate.mockResolvedValue({ _sum: { totalCalories: 2500 } });

    const result = await computeRemainingBudget(
      USER_ID,
      EXCLUDE_MEAL_ID,
      TARGET_CALORIES
    );

    expect(result).toBe(-500); // 2000 - 2500
    expect(result).toBeLessThan(0);
  });
});

// ===========================================================================
// suggestFrequency — funzione pura, nessun mock necessario
// ===========================================================================
describe("suggestFrequency — LOSE_WEIGHT", () => {
  it("alta calorie (>700) → stringa non vuota", () => {
    const result = suggestFrequency(800, Goal.LOSE_WEIGHT);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toBe("1 volta a settimana");
  });

  it("media calorie (300-700) → stringa non vuota", () => {
    const result = suggestFrequency(500, Goal.LOSE_WEIGHT);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toBe("2-3 volte a settimana");
  });

  it("bassa calorie (<300) → stringa non vuota", () => {
    const result = suggestFrequency(200, Goal.LOSE_WEIGHT);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toBe("Tutti i giorni");
  });
});

describe("suggestFrequency — REDUCE_FAT", () => {
  it("alta calorie (>700) → stringa non vuota", () => {
    const result = suggestFrequency(900, Goal.REDUCE_FAT);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toBe("1-2 volte a settimana");
  });

  it("media calorie (300-700) → stringa non vuota", () => {
    const result = suggestFrequency(400, Goal.REDUCE_FAT);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toBe("3-4 volte a settimana");
  });

  it("bassa calorie (<300) → stringa non vuota", () => {
    const result = suggestFrequency(100, Goal.REDUCE_FAT);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toBe("Tutti i giorni");
  });
});

describe("suggestFrequency — GAIN_MUSCLE", () => {
  it("alta calorie (>700) → stringa non vuota", () => {
    const result = suggestFrequency(1000, Goal.GAIN_MUSCLE);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toBe("3-4 volte a settimana");
  });

  it("media calorie (300-700) → stringa non vuota", () => {
    const result = suggestFrequency(600, Goal.GAIN_MUSCLE);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toBe("Tutti i giorni");
  });

  it("bassa calorie (<300) → stringa non vuota", () => {
    const result = suggestFrequency(250, Goal.GAIN_MUSCLE);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toBe("2 volte al giorno");
  });
});

describe("suggestFrequency — MAINTAIN", () => {
  it("alta calorie (>700) → stringa non vuota", () => {
    const result = suggestFrequency(750, Goal.MAINTAIN);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toBe("2-3 volte a settimana");
  });

  it("media calorie (300-700) → stringa non vuota", () => {
    const result = suggestFrequency(500, Goal.MAINTAIN);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toBe("4-5 volte a settimana");
  });

  it("bassa calorie (<300) → stringa non vuota", () => {
    const result = suggestFrequency(150, Goal.MAINTAIN);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toBe("Tutti i giorni");
  });
});
