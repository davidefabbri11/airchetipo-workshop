import { ActivityLevel, Goal } from "@prisma/client";

// --- Mock di @/lib/supabase/server ---
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// --- Mock di @/lib/prisma ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    profile: {
      update: vi.fn(),
    },
  },
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/goals/suggestions/route";
import { PATCH } from "@/app/api/profile/route";
import { calculateBMR, calculateTDEE } from "@/lib/nutrition/goals";

// Helper per costruire il mock di createClient
function mockSupabaseUser(user: { id: string } | null) {
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  });
}

// Profilo LOSE_WEIGHT realistico
const loseWeightProfile = {
  id: "profile-lw-1",
  userId: "user-db-1",
  height: 175,
  weight: 80,
  age: 35,
  activityLevel: ActivityLevel.MODERATE,
  goal: Goal.LOSE_WEIGHT,
  targetCalories: null,
  goalDescription: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const loseWeightDbUser = {
  id: "user-db-1",
  supabaseId: "supabase-user-1",
  email: "mario.rossi@example.com",
  name: "Mario Rossi",
  image: null,
  profile: loseWeightProfile,
};

// Profilo MAINTAIN realistico
const maintainProfile = {
  id: "profile-mt-1",
  userId: "user-db-2",
  height: 168,
  weight: 65,
  age: 28,
  activityLevel: ActivityLevel.LIGHT,
  goal: Goal.MAINTAIN,
  targetCalories: null,
  goalDescription: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const maintainDbUser = {
  id: "user-db-2",
  supabaseId: "supabase-user-2",
  email: "giulia.bianchi@example.com",
  name: "Giulia Bianchi",
  image: null,
  profile: maintainProfile,
};

// =============================================================
// US-002 / TASK-08 — Flusso end-to-end selezione obiettivo
// =============================================================

describe("US-002 / TASK-08 — Flusso selezione obiettivo suggerito (LOSE_WEIGHT)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chiama GET /api/goals/suggestions e riceve suggerimenti validi per LOSE_WEIGHT", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      loseWeightDbUser
    );

    const req = new Request("http://localhost/api/goals/suggestions", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    const suggestions = await response.json();

    // LOSE_WEIGHT deve restituire 2 suggerimenti
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions).toHaveLength(2);

    // Verifica struttura di ogni suggerimento
    for (const s of suggestions) {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("title");
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("targetCalories");
      expect(s).toHaveProperty("timeframeDays");
      expect(typeof s.targetCalories).toBe("number");
      expect(s.targetCalories).toBeGreaterThan(0);
    }

    // Il primo suggerimento deve essere "recommended"
    expect(suggestions[0].recommended).toBe(true);
    expect(suggestions[0].id).toBe("lose-weight-moderate");
  });

  it("seleziona il primo suggerimento e chiama PATCH /api/profile con i suoi dati", async () => {
    // --- Step 1: ottieni i suggerimenti ---
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      loseWeightDbUser
    );

    const getReq = new Request("http://localhost/api/goals/suggestions", {
      method: "GET",
    });
    const getResponse = await GET(getReq);
    expect(getResponse.status).toBe(200);

    const suggestions = await getResponse.json();
    const firstSuggestion = suggestions[0];

    // --- Step 2: calcola i valori attesi per il suggerimento selezionato ---
    const bmr = calculateBMR(loseWeightProfile);
    const tdee = calculateTDEE(bmr, loseWeightProfile.activityLevel);
    const expectedCalories = Math.round(tdee - 420);

    expect(firstSuggestion.targetCalories).toBe(expectedCalories);
    expect(typeof firstSuggestion.description).toBe("string");
    expect(firstSuggestion.description.length).toBeGreaterThan(0);

    // --- Step 3: chiama PATCH /api/profile con i dati del suggerimento selezionato ---
    vi.clearAllMocks();
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      loseWeightDbUser
    );

    const updatedProfile = {
      ...loseWeightProfile,
      targetCalories: firstSuggestion.targetCalories,
      goalDescription: firstSuggestion.description,
    };
    (prisma.profile.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      updatedProfile
    );

    const patchReq = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetCalories: firstSuggestion.targetCalories,
        goalDescription: firstSuggestion.description,
      }),
    });
    const patchResponse = await PATCH(patchReq);

    expect(patchResponse.status).toBe(200);
    const savedProfile = await patchResponse.json();

    // Il profilo aggiornato deve contenere i valori del suggerimento
    expect(savedProfile.targetCalories).toBe(firstSuggestion.targetCalories);
    expect(savedProfile.goalDescription).toBe(firstSuggestion.description);
  });
});

// =============================================================
// US-002 / TASK-08 — Flusso obiettivo custom (MAINTAIN)
// =============================================================

describe("US-002 / TASK-08 — Flusso obiettivo custom (MAINTAIN)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chiama PATCH /api/profile con obiettivo personalizzato e verifica salvataggio", async () => {
    mockSupabaseUser({ id: "supabase-user-2" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      maintainDbUser
    );

    const customCalories = 1900;
    const customDescription = "Obiettivo personalizzato - 1900 kcal";

    const updatedProfile = {
      ...maintainProfile,
      targetCalories: customCalories,
      goalDescription: customDescription,
    };
    (prisma.profile.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      updatedProfile
    );

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetCalories: customCalories,
        goalDescription: customDescription,
      }),
    });
    const response = await PATCH(req);

    expect(response.status).toBe(200);
    const saved = await response.json();

    expect(saved.targetCalories).toBe(customCalories);
    expect(saved.goalDescription).toBe(customDescription);
  });

  it("PATCH con obiettivo custom non modifica gli altri campi del profilo", async () => {
    mockSupabaseUser({ id: "supabase-user-2" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      maintainDbUser
    );

    const customCalories = 1900;
    const customDescription = "Obiettivo personalizzato - 1900 kcal";

    (prisma.profile.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...maintainProfile,
      targetCalories: customCalories,
      goalDescription: customDescription,
    });

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetCalories: customCalories,
        goalDescription: customDescription,
      }),
    });
    await PATCH(req);

    // Verifica che prisma.profile.update sia stato chiamato solo con i campi corretti
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { userId: maintainDbUser.id },
      data: {
        targetCalories: customCalories,
        goalDescription: customDescription,
      },
    });
  });
});

// =============================================================
// US-002 / TASK-08 — Verifica persistenza nel profilo
// =============================================================

describe("US-002 / TASK-08 — Verifica persistenza nel profilo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH chiama prisma.profile.update con where: { userId } e data: { targetCalories, goalDescription } corretti", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      loseWeightDbUser
    );

    const targetCalories = 1750;
    const goalDescription = "Piano dimagrimento moderato — 12 settimane";

    (prisma.profile.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...loseWeightProfile,
      targetCalories,
      goalDescription,
    });

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCalories, goalDescription }),
    });
    const response = await PATCH(req);

    expect(response.status).toBe(200);

    expect(prisma.profile.update).toHaveBeenCalledTimes(1);
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { userId: loseWeightDbUser.id },
      data: {
        targetCalories,
        goalDescription,
      },
    });
  });

  it("la risposta PATCH include i valori aggiornati targetCalories e goalDescription", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      loseWeightDbUser
    );

    const targetCalories = 1800;
    const goalDescription = "Perdita peso accelerata — 8 settimane";

    (prisma.profile.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...loseWeightProfile,
      targetCalories,
      goalDescription,
    });

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCalories, goalDescription }),
    });
    const response = await PATCH(req);

    const body = await response.json();
    expect(body.targetCalories).toBe(targetCalories);
    expect(body.goalDescription).toBe(goalDescription);
    // Gli altri campi del profilo devono essere preservati
    expect(body.userId).toBe(loseWeightDbUser.id);
    expect(body.height).toBe(loseWeightProfile.height);
    expect(body.weight).toBe(loseWeightProfile.weight);
  });

  it("PATCH fallisce con 401 se l'utente non e' autenticato (nessuna scrittura su DB)", async () => {
    mockSupabaseUser(null);

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetCalories: 1800,
        goalDescription: "Test non autenticato",
      }),
    });
    const response = await PATCH(req);

    expect(response.status).toBe(401);
    // Nessuna scrittura su DB deve essere avvenuta
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it("PATCH fallisce con 404 se il profilo non esiste (nessuna scrittura su DB)", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...loseWeightDbUser,
      profile: null,
    });

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetCalories: 1800,
        goalDescription: "Test profilo assente",
      }),
    });
    const response = await PATCH(req);

    expect(response.status).toBe(404);
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });
});
