import {
  calculateBMR,
  calculateTDEE,
  generateGoalSuggestions,
  type ProfileForGoals,
} from "@/lib/nutrition/goals";

// ---------------------------------------------------------------------------
// Profili di test riutilizzabili
// ---------------------------------------------------------------------------

/** Profilo base: 70 kg, 175 cm, 30 anni, SEDENTARY, MAINTAIN */
const profileBase: ProfileForGoals = {
  weight: 70,
  height: 175,
  age: 30,
  activityLevel: "SEDENTARY",
  goal: "MAINTAIN",
};

/** Profilo pesante: 90 kg, 180 cm, 25 anni, MODERATE, GAIN_MUSCLE */
const profileHeavy: ProfileForGoals = {
  weight: 90,
  height: 180,
  age: 25,
  activityLevel: "MODERATE",
  goal: "GAIN_MUSCLE",
};

/** Profilo leggero: 55 kg, 160 cm, 45 anni, LIGHT, LOSE_WEIGHT */
const profileLight: ProfileForGoals = {
  weight: 55,
  height: 160,
  age: 45,
  activityLevel: "LIGHT",
  goal: "LOSE_WEIGHT",
};

// ---------------------------------------------------------------------------
// calculateBMR
// ---------------------------------------------------------------------------

describe("calculateBMR", () => {
  it("calcola correttamente BMR per il profilo base (70 kg / 175 cm / 30 anni)", () => {
    // 10×70 + 6.25×175 - 5×30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75
    expect(calculateBMR(profileBase)).toBe(1648.75);
  });

  it("calcola correttamente BMR per il profilo pesante (90 kg / 180 cm / 25 anni)", () => {
    // 10×90 + 6.25×180 - 5×25 + 5 = 900 + 1125 - 125 + 5 = 1905
    expect(calculateBMR(profileHeavy)).toBe(1905);
  });

  it("calcola correttamente BMR per il profilo leggero (55 kg / 160 cm / 45 anni)", () => {
    // 10×55 + 6.25×160 - 5×45 + 5 = 550 + 1000 - 225 + 5 = 1330
    expect(calculateBMR(profileLight)).toBe(1330);
  });

  it("applica correttamente la formula Mifflin-St Jeor: 10w + 6.25h - 5a + 5", () => {
    const profile: ProfileForGoals = {
      weight: 80,
      height: 170,
      age: 35,
      activityLevel: "SEDENTARY",
      goal: "MAINTAIN",
    };
    // 10×80 + 6.25×170 - 5×35 + 5 = 800 + 1062.5 - 175 + 5 = 1692.5
    expect(calculateBMR(profile)).toBe(1692.5);
  });
});

// ---------------------------------------------------------------------------
// calculateTDEE
// ---------------------------------------------------------------------------

describe("calculateTDEE", () => {
  // Usiamo il BMR del profilo base: 1648.75
  const bmr = 1648.75;

  it("SEDENTARY applica il fattore 1.2", () => {
    // round(1648.75 × 1.2) = round(1978.5) = 1979
    expect(calculateTDEE(bmr, "SEDENTARY")).toBe(1979);
  });

  it("LIGHT applica il fattore 1.375", () => {
    // round(1648.75 × 1.375) = round(2267.03125) = 2267
    expect(calculateTDEE(bmr, "LIGHT")).toBe(2267);
  });

  it("MODERATE applica il fattore 1.55", () => {
    // round(1648.75 × 1.55) = round(2555.5625) = 2556
    expect(calculateTDEE(bmr, "MODERATE")).toBe(2556);
  });

  it("INTENSE applica il fattore 1.725", () => {
    // round(1648.75 × 1.725) = round(2844.09375) = 2844
    expect(calculateTDEE(bmr, "INTENSE")).toBe(2844);
  });

  it("restituisce un numero intero (arrotondato)", () => {
    const result = calculateTDEE(bmr, "LIGHT");
    expect(Number.isInteger(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateGoalSuggestions — LOSE_WEIGHT
// ---------------------------------------------------------------------------

describe("generateGoalSuggestions — LOSE_WEIGHT", () => {
  const profile: ProfileForGoals = { ...profileLight }; // attività LIGHT
  // BMR profilo leggero = 1330, TDEE LIGHT = round(1330 × 1.375) = 1829
  const expectedTdee = 1829;

  it("restituisce tra 1 e 3 suggerimenti", () => {
    const suggestions = generateGoalSuggestions(profile);
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it("tutti i suggerimenti hanno targetCalories < TDEE", () => {
    const suggestions = generateGoalSuggestions(profile);
    for (const s of suggestions) {
      expect(s.targetCalories).toBeLessThan(expectedTdee);
    }
  });

  it("il suggerimento moderato punta a TDEE - 420 kcal", () => {
    const suggestions = generateGoalSuggestions(profile);
    const moderate = suggestions.find((s) => s.id === "lose-weight-moderate");
    expect(moderate).toBeDefined();
    expect(moderate!.targetCalories).toBe(expectedTdee - 420);
  });

  it("il suggerimento aggressivo punta a TDEE - 700 kcal", () => {
    const suggestions = generateGoalSuggestions(profile);
    const aggressive = suggestions.find((s) => s.id === "lose-weight-aggressive");
    expect(aggressive).toBeDefined();
    expect(aggressive!.targetCalories).toBe(expectedTdee - 700);
  });

  it("almeno un suggerimento è marcato come recommended", () => {
    const suggestions = generateGoalSuggestions(profile);
    const hasRecommended = suggestions.some((s) => s.recommended === true);
    expect(hasRecommended).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateGoalSuggestions — GAIN_MUSCLE
// ---------------------------------------------------------------------------

describe("generateGoalSuggestions — GAIN_MUSCLE", () => {
  const profile: ProfileForGoals = { ...profileHeavy };
  // BMR profilo pesante = 1905, TDEE MODERATE = round(1905 × 1.55) = 2953
  const expectedTdee = 2953;

  it("tutti i suggerimenti hanno targetCalories > TDEE", () => {
    const suggestions = generateGoalSuggestions(profile);
    for (const s of suggestions) {
      expect(s.targetCalories).toBeGreaterThan(expectedTdee);
    }
  });

  it("il suggerimento principale aggiunge +300 kcal al TDEE", () => {
    const suggestions = generateGoalSuggestions(profile);
    const main = suggestions.find((s) => s.id === "gain-muscle");
    expect(main).toBeDefined();
    expect(main!.targetCalories).toBe(expectedTdee + 300);
  });

  it("il suggerimento lean bulk aggiunge +150 kcal al TDEE", () => {
    const suggestions = generateGoalSuggestions(profile);
    const lean = suggestions.find((s) => s.id === "gain-muscle-lean");
    expect(lean).toBeDefined();
    expect(lean!.targetCalories).toBe(expectedTdee + 150);
  });
});

// ---------------------------------------------------------------------------
// generateGoalSuggestions — REDUCE_FAT
// ---------------------------------------------------------------------------

describe("generateGoalSuggestions — REDUCE_FAT", () => {
  const profile: ProfileForGoals = {
    ...profileBase,
    goal: "REDUCE_FAT",
    activityLevel: "MODERATE",
  };
  // BMR profilo base = 1648.75, TDEE MODERATE = round(1648.75 × 1.55) = 2556
  const expectedTdee = 2556;

  it("restituisce almeno un suggerimento", () => {
    const suggestions = generateGoalSuggestions(profile);
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it("tutti i suggerimenti hanno targetCalories < TDEE", () => {
    const suggestions = generateGoalSuggestions(profile);
    for (const s of suggestions) {
      expect(s.targetCalories).toBeLessThan(expectedTdee);
    }
  });

  it("il suggerimento di ricomposizione punta a TDEE - 300 kcal", () => {
    const suggestions = generateGoalSuggestions(profile);
    const recomp = suggestions.find((s) => s.id === "reduce-fat-recomp");
    expect(recomp).toBeDefined();
    expect(recomp!.targetCalories).toBe(expectedTdee - 300);
  });
});

// ---------------------------------------------------------------------------
// generateGoalSuggestions — MAINTAIN
// ---------------------------------------------------------------------------

describe("generateGoalSuggestions — MAINTAIN", () => {
  const profile: ProfileForGoals = { ...profileBase };
  // BMR profilo base = 1648.75, TDEE SEDENTARY = 1979
  const expectedTdee = 1979;

  it("restituisce esattamente un suggerimento", () => {
    const suggestions = generateGoalSuggestions(profile);
    expect(suggestions).toHaveLength(1);
  });

  it("targetCalories è uguale al TDEE (nessun deficit o surplus)", () => {
    const suggestions = generateGoalSuggestions(profile);
    expect(suggestions[0].targetCalories).toBe(expectedTdee);
  });

  it("il suggerimento ha id 'maintain' ed è marcato recommended", () => {
    const suggestions = generateGoalSuggestions(profile);
    expect(suggestions[0].id).toBe("maintain");
    expect(suggestions[0].recommended).toBe(true);
  });

  it("timeframeDays è 0 (obiettivo continuativo)", () => {
    const suggestions = generateGoalSuggestions(profile);
    expect(suggestions[0].timeframeDays).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Struttura dei GoalSuggestion — campi obbligatori
// ---------------------------------------------------------------------------

describe("GoalSuggestion — struttura dei campi", () => {
  it("ogni suggerimento ha id, title, description, targetCalories, timeframeDays", () => {
    const profiles: ProfileForGoals[] = [
      { ...profileBase, goal: "MAINTAIN" },
      { ...profileLight, goal: "LOSE_WEIGHT" },
      { ...profileHeavy, goal: "GAIN_MUSCLE" },
      { ...profileBase, goal: "REDUCE_FAT", activityLevel: "MODERATE" },
    ];

    for (const profile of profiles) {
      const suggestions = generateGoalSuggestions(profile);
      for (const s of suggestions) {
        expect(typeof s.id).toBe("string");
        expect(s.id.length).toBeGreaterThan(0);
        expect(typeof s.title).toBe("string");
        expect(typeof s.description).toBe("string");
        expect(typeof s.targetCalories).toBe("number");
        expect(typeof s.timeframeDays).toBe("number");
      }
    }
  });
});
