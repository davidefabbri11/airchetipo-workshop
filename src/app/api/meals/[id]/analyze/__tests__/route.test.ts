import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks (vi.hoisted ensures these are available before vi.mock)
// ---------------------------------------------------------------------------
const {
  mockGetUser,
  mockUserFindUnique,
  mockMealFindUnique,
  mockMealComponentCreateMany,
  mockMealUpdate,
  mockMealComponentFindMany,
  mockTransaction,
  mockAnalyzeImage,
  mockComputeRemainingBudget,
  mockComputeAdequacy,
  mockSuggestFrequency,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockMealFindUnique: vi.fn(),
  mockMealComponentCreateMany: vi.fn(),
  mockMealUpdate: vi.fn(),
  mockMealComponentFindMany: vi.fn(),
  mockTransaction: vi.fn(),
  mockAnalyzeImage: vi.fn(),
  mockComputeRemainingBudget: vi.fn(),
  mockComputeAdequacy: vi.fn(),
  mockSuggestFrequency: vi.fn(),
}));

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
      findUnique: (...args: unknown[]) => mockMealFindUnique(...args),
      update: (...args: unknown[]) => mockMealUpdate(...args),
    },
    mealComponent: {
      createMany: (...args: unknown[]) => mockMealComponentCreateMany(...args),
      findMany: (...args: unknown[]) => mockMealComponentFindMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/lib/vision/analyze", () => {
  class VisionAnalysisError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
      super(message);
      this.name = "VisionAnalysisError";
    }
  }
  return { analyzeImage: mockAnalyzeImage, VisionAnalysisError };
});

vi.mock("@/lib/nutrition/adequacy", () => ({
  computeRemainingBudget: mockComputeRemainingBudget,
  computeAdequacy: mockComputeAdequacy,
  suggestFrequency: mockSuggestFrequency,
}));

// ---------------------------------------------------------------------------
// Import route handler (after mocks are declared)
// ---------------------------------------------------------------------------
import { POST } from "../route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const SUPABASE_USER_ID = "supabase-uuid-123";
const DB_USER_ID = "db-uuid-456";
const MEAL_ID = "meal-uuid-789";

const dbUserWithProfile = {
  id: DB_USER_ID,
  supabaseId: SUPABASE_USER_ID,
  email: "test@example.com",
  profile: { targetCalories: 2000, goal: "MAINTAIN" },
};

const dbUserNoProfile = {
  id: DB_USER_ID,
  supabaseId: SUPABASE_USER_ID,
  email: "test@example.com",
  profile: null,
};

const pendingMeal = {
  id: MEAL_ID,
  userId: DB_USER_ID,
  imageUrl: "path/img.jpg",
  status: "PENDING",
  components: [],
};

const analyzedMeal = {
  id: MEAL_ID,
  userId: DB_USER_ID,
  imageUrl: "path/img.jpg",
  status: "ANALYZED",
  totalCalories: 650,
  totalProteins: 35,
  totalCarbs: 70,
  totalFats: 20,
  adequacy: "ADEQUATE",
  consumptionFrequency: "3-4 volte a settimana",
  remainingBudgetAtAnalysis: 1150,
  components: [],
  analyzedAt: new Date(),
};

const analysisResult = {
  components: [
    {
      name: "Pasta",
      estimatedGrams: 200,
      calories: 650,
      proteins: 35,
      carbs: 70,
      fats: 20,
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(): Request {
  return new Request("http://localhost:3000/api/meals/meal-uuid/analyze", {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  // Default transaction mock: resolve with array of two results
  mockTransaction.mockResolvedValue([{}, {}]);
});

// ===========================================================================
// POST /api/meals/[id]/analyze
// ===========================================================================
describe("POST /api/meals/[id]/analyze", () => {
  // -------------------------------------------------------------------------
  // 1. Analisi con profilo completo
  // -------------------------------------------------------------------------
  it("dovrebbe analizzare il pasto e restituire adequacy e consumptionFrequency quando il profilo è completo", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithProfile);
    mockMealFindUnique.mockResolvedValue(pendingMeal);
    mockAnalyzeImage.mockResolvedValue(analysisResult);
    mockComputeRemainingBudget.mockResolvedValue(1150);
    mockComputeAdequacy.mockReturnValue("ADEQUATE");
    mockSuggestFrequency.mockReturnValue("3-4 volte a settimana");

    const response = await POST(makeRequest(), { params: { id: MEAL_ID } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.adequacy).toBe("ADEQUATE");
    expect(body.consumptionFrequency).toBe("3-4 volte a settimana");
    expect(mockAnalyzeImage).toHaveBeenCalledWith(pendingMeal.imageUrl);
    expect(mockComputeRemainingBudget).toHaveBeenCalledWith(
      DB_USER_ID,
      MEAL_ID,
      2000
    );
  });

  // -------------------------------------------------------------------------
  // 2. Analisi senza profilo / targetCalories null
  // -------------------------------------------------------------------------
  it("dovrebbe restituire adequacy null e consumptionFrequency null quando il profilo è assente", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserNoProfile);
    mockMealFindUnique.mockResolvedValue(pendingMeal);
    mockAnalyzeImage.mockResolvedValue(analysisResult);

    const response = await POST(makeRequest(), { params: { id: MEAL_ID } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.adequacy).toBeNull();
    expect(body.consumptionFrequency).toBeNull();
    expect(mockComputeRemainingBudget).not.toHaveBeenCalled();
    expect(mockComputeAdequacy).not.toHaveBeenCalled();
    expect(mockSuggestFrequency).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3. Idempotenza: pasto già ANALYZED
  // -------------------------------------------------------------------------
  it("dovrebbe restituire i dati esistenti senza ricalcolare se il pasto è già ANALYZED", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithProfile);
    mockMealFindUnique.mockResolvedValue(analyzedMeal);

    const response = await POST(makeRequest(), { params: { id: MEAL_ID } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(MEAL_ID);
    expect(body.status).toBe("ANALYZED");
    expect(mockAnalyzeImage).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. Utente non autenticato → 401
  // -------------------------------------------------------------------------
  it("dovrebbe restituire 401 quando l'utente non è autenticato", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(makeRequest(), { params: { id: MEAL_ID } });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Non autenticato");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockMealFindUnique).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 5. Utente non trovato nel DB → 404
  // -------------------------------------------------------------------------
  it("dovrebbe restituire 404 quando l'utente non è trovato nel database", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest(), { params: { id: MEAL_ID } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Utente non trovato");
    expect(mockMealFindUnique).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 6. Pasto non trovato → 404
  // -------------------------------------------------------------------------
  it("dovrebbe restituire 404 quando il pasto non è trovato", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithProfile);
    mockMealFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest(), { params: { id: MEAL_ID } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Pasto non trovato");
    expect(mockAnalyzeImage).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 7. Accesso negato (pasto appartiene ad altro utente) → 403
  // -------------------------------------------------------------------------
  it("dovrebbe restituire 403 quando il pasto appartiene a un altro utente", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithProfile);
    mockMealFindUnique.mockResolvedValue({
      ...pendingMeal,
      userId: "another-user-id",
    });

    const response = await POST(makeRequest(), { params: { id: MEAL_ID } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Accesso negato");
    expect(mockAnalyzeImage).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 8. Errore AI (VisionAnalysisError) → 422
  // -------------------------------------------------------------------------
  it("dovrebbe restituire 422 quando analyzeImage lancia VisionAnalysisError", async () => {
    const { VisionAnalysisError } = await import("@/lib/vision/analyze");

    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithProfile);
    mockMealFindUnique.mockResolvedValue(pendingMeal);
    mockAnalyzeImage.mockRejectedValue(
      new VisionAnalysisError("Impossibile analizzare l'immagine")
    );

    const response = await POST(makeRequest(), { params: { id: MEAL_ID } });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("Impossibile analizzare l'immagine");
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
