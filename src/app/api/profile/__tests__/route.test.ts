import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks (vi.hoisted ensures these are available before vi.mock)
// ---------------------------------------------------------------------------
const { mockGetUser, mockUserFindUnique, mockProfileCreate } = vi.hoisted(
  () => ({
    mockGetUser: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockProfileCreate: vi.fn(),
  })
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    profile: {
      create: (...args: unknown[]) => mockProfileCreate(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Import route handlers (after mocks are declared)
// ---------------------------------------------------------------------------
import { GET, POST } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SUPABASE_USER_ID = "supabase-uuid-123";
const DB_USER_ID = "db-uuid-456";

const validProfileData = {
  height: 175,
  weight: 70,
  age: 30,
  activityLevel: "MODERATE" as const,
  goal: "GAIN_MUSCLE" as const,
};

const dbUserWithoutProfile = {
  id: DB_USER_ID,
  supabaseId: SUPABASE_USER_ID,
  email: "test@example.com",
  name: "Test User",
  profile: null,
};

const existingProfile = {
  id: "profile-uuid-789",
  userId: DB_USER_ID,
  ...validProfileData,
};

const dbUserWithProfile = {
  ...dbUserWithoutProfile,
  profile: existingProfile,
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function jsonResponse(response: NextResponse) {
  return response.json();
}

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// POST /api/profile
// ===========================================================================
describe("POST /api/profile", () => {
  it("dovrebbe creare un profilo con dati validi e restituire 201", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithoutProfile);
    mockProfileCreate.mockResolvedValue(existingProfile);

    const response = await POST(makeRequest(validProfileData));
    const body = await jsonResponse(response);

    expect(response.status).toBe(201);
    expect(body).toEqual(existingProfile);
    expect(mockProfileCreate).toHaveBeenCalledWith({
      data: {
        userId: DB_USER_ID,
        height: validProfileData.height,
        weight: validProfileData.weight,
        age: validProfileData.age,
        activityLevel: validProfileData.activityLevel,
        goal: validProfileData.goal,
      },
    });
  });

  it("dovrebbe restituire 400 quando l'altezza è fuori range", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithoutProfile);

    const invalidData = { ...validProfileData, height: 10 }; // min 50
    const response = await POST(makeRequest(invalidData));
    const body = await jsonResponse(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Dati non validi");
    expect(body.details).toBeDefined();
    expect(body.details.height).toBeDefined();
    expect(mockProfileCreate).not.toHaveBeenCalled();
  });

  it("dovrebbe restituire 400 quando mancano campi obbligatori", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithoutProfile);

    const incompleteData = { height: 175 }; // missing weight, age, activityLevel, goal
    const response = await POST(makeRequest(incompleteData));
    const body = await jsonResponse(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Dati non validi");
    expect(body.details).toBeDefined();
    expect(mockProfileCreate).not.toHaveBeenCalled();
  });

  it("dovrebbe restituire 409 quando il profilo esiste già", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithProfile);

    const response = await POST(makeRequest(validProfileData));
    const body = await jsonResponse(response);

    expect(response.status).toBe(409);
    expect(body.error).toBe("Profilo già esistente");
    expect(mockProfileCreate).not.toHaveBeenCalled();
  });

  it("dovrebbe restituire 401 quando l'utente non è autenticato", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(makeRequest(validProfileData));
    const body = await jsonResponse(response);

    expect(response.status).toBe(401);
    expect(body.error).toBe("Non autenticato");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockProfileCreate).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// GET /api/profile
// ===========================================================================
describe("GET /api/profile", () => {
  it("dovrebbe restituire 200 e i dati del profilo quando esiste", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithProfile);

    const response = await GET();
    const body = await jsonResponse(response);

    expect(response.status).toBe(200);
    expect(body).toEqual(existingProfile);
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { supabaseId: SUPABASE_USER_ID },
      include: { profile: true },
    });
  });

  it("dovrebbe restituire 404 quando il profilo non esiste", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithoutProfile);

    const response = await GET();
    const body = await jsonResponse(response);

    expect(response.status).toBe(404);
    expect(body.error).toBe("Profilo non trovato");
  });

  it("dovrebbe restituire 401 quando l'utente non è autenticato", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await GET();
    const body = await jsonResponse(response);

    expect(response.status).toBe(401);
    expect(body.error).toBe("Non autenticato");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });
});
