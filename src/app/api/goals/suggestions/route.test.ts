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
import { GET } from "./route";
import { PATCH } from "@/app/api/profile/route";

// Helper per costruire il mock di createClient
function mockSupabaseUser(user: { id: string } | null) {
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  });
}

// Profilo di base riutilizzabile nei test
const baseProfile = {
  id: "profile-1",
  userId: "user-db-1",
  height: 175,
  weight: 75,
  age: 30,
  activityLevel: ActivityLevel.MODERATE,
  goal: Goal.LOSE_WEIGHT,
  targetCalories: null,
  goalDescription: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseDbUser = {
  id: "user-db-1",
  supabaseId: "supabase-user-1",
  email: "test@example.com",
  name: "Test User",
  image: null,
  profile: baseProfile,
};

// =============================================================
// GET /api/goals/suggestions
// =============================================================

describe("GET /api/goals/suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("happy path: utente autenticato con profilo → ritorna array di GoalSuggestion", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      baseDbUser
    );

    const req = new Request("http://localhost/api/goals/suggestions", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body.length).toBeLessThanOrEqual(3);

    // Verifica struttura di ogni GoalSuggestion
    for (const suggestion of body) {
      expect(suggestion).toHaveProperty("id");
      expect(suggestion).toHaveProperty("title");
      expect(suggestion).toHaveProperty("description");
      expect(suggestion).toHaveProperty("targetCalories");
      expect(suggestion).toHaveProperty("timeframeDays");
      expect(typeof suggestion.targetCalories).toBe("number");
      expect(suggestion.targetCalories).toBeGreaterThan(0);
    }
  });

  it("happy path: goal MAINTAIN → ritorna esattamente 1 suggerimento con recommended=true", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseDbUser,
      profile: { ...baseProfile, goal: Goal.MAINTAIN },
    });

    const req = new Request("http://localhost/api/goals/suggestions", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].recommended).toBe(true);
  });

  it("401: utente non autenticato → ritorna { error: 'Non autenticato' }", async () => {
    mockSupabaseUser(null);

    const req = new Request("http://localhost/api/goals/suggestions", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "Non autenticato" });
  });

  it("404: utente autenticato ma senza profilo → ritorna { error: 'Profilo non trovato' }", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseDbUser,
      profile: null,
    });

    const req = new Request("http://localhost/api/goals/suggestions", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Profilo non trovato" });
  });

  it("404: utente non presente nel database → ritorna { error: 'Profilo non trovato' }", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );

    const req = new Request("http://localhost/api/goals/suggestions", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Profilo non trovato" });
  });
});

// =============================================================
// PATCH /api/profile
// =============================================================

describe("PATCH /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("happy path: body valido → ritorna profilo aggiornato con targetCalories e goalDescription", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      baseDbUser
    );

    const updatedProfile = {
      ...baseProfile,
      targetCalories: 1800,
      goalDescription: "Perdere 5kg",
    };
    (prisma.profile.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      updatedProfile
    );

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCalories: 1800, goalDescription: "Perdere 5kg" }),
    });
    const response = await PATCH(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.targetCalories).toBe(1800);
    expect(body.goalDescription).toBe("Perdere 5kg");
  });

  it("happy path: verifica che prisma.profile.update sia chiamato con i dati corretti", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      baseDbUser
    );
    (prisma.profile.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseProfile,
      targetCalories: 2000,
      goalDescription: "Aumentare la massa",
    });

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCalories: 2000, goalDescription: "Aumentare la massa" }),
    });
    await PATCH(req);

    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { userId: baseDbUser.id },
      data: {
        targetCalories: 2000,
        goalDescription: "Aumentare la massa",
      },
    });
  });

  it("401: utente non autenticato → ritorna { error: 'Non autenticato' }", async () => {
    mockSupabaseUser(null);

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCalories: 1800, goalDescription: "Test" }),
    });
    const response = await PATCH(req);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "Non autenticato" });
  });

  it("404: utente autenticato ma senza profilo → ritorna { error: 'Profilo non trovato' }", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseDbUser,
      profile: null,
    });

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCalories: 1800, goalDescription: "Test" }),
    });
    const response = await PATCH(req);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Profilo non trovato" });
  });

  it("404: utente non presente nel database → ritorna { error: 'Profilo non trovato' }", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCalories: 1800, goalDescription: "Test" }),
    });
    const response = await PATCH(req);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Profilo non trovato" });
  });

  it("400: targetCalories sotto il minimo di 800 → ritorna { error: 'Dati non validi' }", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      baseDbUser
    );

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCalories: 100, goalDescription: "Test" }),
    });
    const response = await PATCH(req);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Dati non validi");
    expect(body.details).toBeDefined();
    expect(body.details.targetCalories).toBeDefined();
  });

  it("400: goalDescription mancante → ritorna { error: 'Dati non validi' }", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      baseDbUser
    );

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCalories: 1800 }),
    });
    const response = await PATCH(req);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Dati non validi");
  });

  it("400: body JSON non valido → ritorna { error: 'Body JSON non valido' }", async () => {
    mockSupabaseUser({ id: "supabase-user-1" });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      baseDbUser
    );

    const req = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "non-json-body{{{",
    });
    const response = await PATCH(req);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Body JSON non valido" });
  });
});
