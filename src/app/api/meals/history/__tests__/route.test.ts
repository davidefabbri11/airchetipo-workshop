import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks (vi.hoisted ensures these are available before vi.mock)
// ---------------------------------------------------------------------------
const { mockGetUser, mockUserFindUnique, mockMealFindMany } = vi.hoisted(
  () => ({
    mockGetUser: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockMealFindMany: vi.fn(),
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
      findMany: (...args: unknown[]) => mockMealFindMany(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Import route handlers (after mocks are declared)
// ---------------------------------------------------------------------------
import { GET } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SUPABASE_USER_ID = "supabase-uuid-123";
const DB_USER_ID = "db-uuid-456";

const NOW = new Date("2026-03-25T12:00:00.000Z");

const dbUser = {
  id: DB_USER_ID,
  supabaseId: SUPABASE_USER_ID,
  email: "test@example.com",
  name: "Test User",
};

function makeMeal(id: string, createdAt: Date) {
  return {
    id,
    userId: DB_USER_ID,
    status: "ANALYZED",
    createdAt,
    components: [],
  };
}

function makeRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/meals/history");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

async function jsonResponse(response: NextResponse) {
  return response.json();
}

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// GET /api/meals/history
// ===========================================================================
describe("GET /api/meals/history", () => {
  // -------------------------------------------------------------------------
  // 1. Restituisce 401 quando l'utente non è autenticato
  // -------------------------------------------------------------------------
  it("restituisce 401 quando l'utente non è autenticato", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(makeRequest());
    const body = await jsonResponse(response);

    expect(response.status).toBe(401);
    expect(body.error).toBe("Non autenticato");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockMealFindMany).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 2. Restituisce 404 quando l'utente non è trovato nel DB
  // -------------------------------------------------------------------------
  it("restituisce 404 quando l'utente non è trovato nel DB", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(null);

    const response = await GET(makeRequest());
    const body = await jsonResponse(response);

    expect(response.status).toBe(404);
    expect(body.error).toBe("Utente non trovato");
    expect(mockMealFindMany).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3. Restituisce 400 per parametro period non valido
  // -------------------------------------------------------------------------
  it("restituisce 400 per parametro period non valido", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);

    const response = await GET(makeRequest({ period: "invalid" }));
    const body = await jsonResponse(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Parametri non validi");
    expect(body.details).toBeDefined();
    expect(mockMealFindMany).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. Restituisce 200 con pasti ordinati per data decrescente (period=month di default)
  // -------------------------------------------------------------------------
  it("restituisce 200 con pasti ordinati per data decrescente usando il default period=month", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);

    const meal1 = makeMeal("meal-id-001", new Date("2026-03-20T10:00:00.000Z"));
    const meal2 = makeMeal("meal-id-002", new Date("2026-03-22T10:00:00.000Z"));
    // Prisma restituisce già ordinato per createdAt desc; il route restituisce così come arriva
    mockMealFindMany.mockResolvedValue([meal2, meal1]);

    const response = await GET(makeRequest());
    const body = await jsonResponse(response);

    expect(response.status).toBe(200);
    expect(body.meals).toHaveLength(2);
    // Il primo pasto deve essere il più recente
    expect(body.meals[0].id).toBe("meal-id-002");
    expect(body.meals[1].id).toBe("meal-id-001");
    expect(body.nextCursor).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 5. Filtro period=today — il range date inizia a mezzanotte UTC del giorno corrente
  // -------------------------------------------------------------------------
  it("filtra per period=today con range che inizia a mezzanotte UTC", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockMealFindMany.mockResolvedValue([]);

    await GET(makeRequest({ period: "today" }));

    expect(mockMealFindMany).toHaveBeenCalledTimes(1);
    const callArgs = mockMealFindMany.mock.calls[0][0];
    const expectedMidnightUTC = new Date(
      Date.UTC(
        NOW.getUTCFullYear(),
        NOW.getUTCMonth(),
        NOW.getUTCDate()
      )
    );
    expect(callArgs.where.createdAt.gte).toEqual(expectedMidnightUTC);
  });

  // -------------------------------------------------------------------------
  // 6. Filtro period=week — il range date copre gli ultimi 7 giorni
  // -------------------------------------------------------------------------
  it("filtra per period=week con range che copre gli ultimi 7 giorni", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockMealFindMany.mockResolvedValue([]);

    await GET(makeRequest({ period: "week" }));

    expect(mockMealFindMany).toHaveBeenCalledTimes(1);
    const callArgs = mockMealFindMany.mock.calls[0][0];
    const periodStart: Date = callArgs.where.createdAt.gte;

    // La differenza tra NOW e periodStart deve essere circa 7 giorni
    const diffMs = NOW.getTime() - periodStart.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 0);
  });

  // -------------------------------------------------------------------------
  // 7. Filtro period=month — il range date copre gli ultimi 30 giorni
  // -------------------------------------------------------------------------
  it("filtra per period=month con range che copre gli ultimi 30 giorni", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockMealFindMany.mockResolvedValue([]);

    await GET(makeRequest({ period: "month" }));

    expect(mockMealFindMany).toHaveBeenCalledTimes(1);
    const callArgs = mockMealFindMany.mock.calls[0][0];
    const periodStart: Date = callArgs.where.createdAt.gte;

    // La differenza tra NOW e periodStart deve essere circa 30 giorni
    const diffMs = NOW.getTime() - periodStart.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);
  });

  // -------------------------------------------------------------------------
  // 8. Cursor pagination (prima pagina) — nextCursor non null quando ci sono più risultati di limit
  // -------------------------------------------------------------------------
  it("restituisce nextCursor non null quando ci sono più risultati del limite (prima pagina)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);

    // Con limit=2, la route richiede limit+1=3. Se ne arrivano 3, hasMore=true
    const meals = [
      makeMeal("meal-id-001", new Date("2026-03-25T11:00:00.000Z")),
      makeMeal("meal-id-002", new Date("2026-03-25T10:00:00.000Z")),
      makeMeal("meal-id-003", new Date("2026-03-25T09:00:00.000Z")),
    ];
    mockMealFindMany.mockResolvedValue(meals);

    const response = await GET(makeRequest({ limit: "2" }));
    const body = await jsonResponse(response);

    expect(response.status).toBe(200);
    expect(body.meals).toHaveLength(2);
    // nextCursor deve essere l'id dell'ultimo pasto nella pagina
    expect(body.nextCursor).toBe("meal-id-002");
  });

  // -------------------------------------------------------------------------
  // 9. Cursor pagination (ultima pagina) — nextCursor null quando i risultati sono <= limit
  // -------------------------------------------------------------------------
  it("restituisce nextCursor null quando i risultati sono uguali o inferiori al limite (ultima pagina)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);

    // Con limit=10 (default), la route richiede 11. Se ne arrivano 2, hasMore=false
    const meals = [
      makeMeal("meal-id-001", new Date("2026-03-25T11:00:00.000Z")),
      makeMeal("meal-id-002", new Date("2026-03-25T10:00:00.000Z")),
    ];
    mockMealFindMany.mockResolvedValue(meals);

    const response = await GET(makeRequest());
    const body = await jsonResponse(response);

    expect(response.status).toBe(200);
    expect(body.meals).toHaveLength(2);
    expect(body.nextCursor).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 10. Risposta vuota — meals: [], nextCursor: null
  // -------------------------------------------------------------------------
  it("restituisce meals vuoto e nextCursor null quando non ci sono pasti", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockMealFindMany.mockResolvedValue([]);

    const response = await GET(makeRequest());
    const body = await jsonResponse(response);

    expect(response.status).toBe(200);
    expect(body.meals).toEqual([]);
    expect(body.nextCursor).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 11. Esclusione pasti PENDING — la where clause include status: "ANALYZED"
  // -------------------------------------------------------------------------
  it("esclude i pasti PENDING filtrando per status ANALYZED nella query", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockMealFindMany.mockResolvedValue([]);

    await GET(makeRequest({ period: "today" }));

    expect(mockMealFindMany).toHaveBeenCalledTimes(1);
    const callArgs = mockMealFindMany.mock.calls[0][0];
    expect(callArgs.where.status).toBe("ANALYZED");
    expect(callArgs.where.userId).toBe(DB_USER_ID);
    expect(callArgs.where.createdAt).toBeDefined();
    expect(callArgs.where.createdAt.gte).toBeInstanceOf(Date);
  });

  // -------------------------------------------------------------------------
  // 12. Restituisce 500 in caso di errore interno (Prisma lancia un'eccezione)
  // -------------------------------------------------------------------------
  it("restituisce 500 quando Prisma lancia un'eccezione", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockMealFindMany.mockRejectedValue(new Error("Database connection failed"));

    const response = await GET(makeRequest());
    const body = await jsonResponse(response);

    expect(response.status).toBe(500);
    expect(body.error).toBe("Errore interno del server");
  });
});
