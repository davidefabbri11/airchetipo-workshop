import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { mealCreateSchema } from "@/lib/validations/meal";

// ---------------------------------------------------------------------------
// Hoisted mocks (vi.hoisted ensures these are available before vi.mock)
// ---------------------------------------------------------------------------
const { mockGetUser, mockUserFindUnique, mockMealCreate } = vi.hoisted(
  () => ({
    mockGetUser: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockMealCreate: vi.fn(),
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
    meal: {
      create: (...args: unknown[]) => mockMealCreate(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Import route handlers (after mocks are declared)
// ---------------------------------------------------------------------------
import { POST } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SUPABASE_USER_ID = "supabase-uuid-123";
const DB_USER_ID = "db-uuid-456";
const MEAL_ID = "meal-uuid-789";

const validImagePath = "https://example.supabase.co/storage/v1/object/public/meals/supabase-uuid-123/1711360000000.jpg";

const dbUser = {
  id: DB_USER_ID,
  supabaseId: SUPABASE_USER_ID,
  email: "test@example.com",
  name: "Test User",
};

const createdMeal = {
  id: MEAL_ID,
  userId: DB_USER_ID,
  imageUrl: validImagePath,
  status: "PENDING",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/meals", {
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
// POST /api/meals
// ===========================================================================
describe("POST /api/meals", () => {
  it("dovrebbe creare un pasto con imageUrl valido e restituire 201", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockMealCreate.mockResolvedValue(createdMeal);

    const response = await POST(makeRequest({ imageUrl: validImagePath }));
    const body = await jsonResponse(response);

    expect(response.status).toBe(201);
    expect(body).toEqual(createdMeal);
    expect(mockMealCreate).toHaveBeenCalledWith({
      data: {
        userId: DB_USER_ID,
        imageUrl: validImagePath,
      },
    });
  });

  it("dovrebbe restituire 401 quando l'utente non è autenticato", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(makeRequest({ imageUrl: validImagePath }));
    const body = await jsonResponse(response);

    expect(response.status).toBe(401);
    expect(body.error).toBe("Non autenticato");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockMealCreate).not.toHaveBeenCalled();
  });

  it("dovrebbe restituire 404 quando l'utente non è trovato nel database", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest({ imageUrl: validImagePath }));
    const body = await jsonResponse(response);

    expect(response.status).toBe(404);
    expect(body.error).toBe("Utente non trovato");
    expect(mockMealCreate).not.toHaveBeenCalled();
  });

  it("dovrebbe restituire 400 quando imageUrl è assente", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);

    const response = await POST(makeRequest({}));
    const body = await jsonResponse(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Dati non validi");
    expect(body.details).toBeDefined();
    expect(body.details.imageUrl).toBeDefined();
    expect(mockMealCreate).not.toHaveBeenCalled();
  });

  it("dovrebbe restituire 400 quando imageUrl è una stringa vuota", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);

    const response = await POST(makeRequest({ imageUrl: "" }));
    const body = await jsonResponse(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Dati non validi");
    expect(body.details).toBeDefined();
    expect(body.details.imageUrl).toBeDefined();
    expect(mockMealCreate).not.toHaveBeenCalled();
  });

  it("dovrebbe restituire 500 quando prisma.meal.create lancia un errore", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockMealCreate.mockRejectedValue(new Error("Database connection failed"));

    const response = await POST(makeRequest({ imageUrl: validImagePath }));
    const body = await jsonResponse(response);

    expect(response.status).toBe(500);
    expect(body.error).toBe("Errore interno del server");
  });
});

// ===========================================================================
// mealCreateSchema — validazione schema Zod
// ===========================================================================
describe("mealCreateSchema", () => {
  it("dovrebbe superare la validazione con un URL valido", () => {
    const result = mealCreateSchema.safeParse({
      imageUrl: "https://example.supabase.co/storage/v1/object/public/meals/user-id/image.jpg",
    });

    expect(result.success).toBe(true);
  });

  it("dovrebbe fallire la validazione con un path non-URL", () => {
    const result = mealCreateSchema.safeParse({ imageUrl: "any/path/to/image" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.imageUrl).toBeDefined();
    }
  });

  it("dovrebbe fallire la validazione quando imageUrl è una stringa vuota", () => {
    const result = mealCreateSchema.safeParse({ imageUrl: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.imageUrl).toBeDefined();
    }
  });

  it("dovrebbe fallire la validazione quando imageUrl è assente", () => {
    const result = mealCreateSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.imageUrl).toBeDefined();
    }
  });
});
