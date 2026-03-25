import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockGetUser,
  mockUserFindUnique,
  mockMealCreate,
  mockStorageUpload,
  mockStorageGetPublicUrl,
  mockAnalyzeImage,
  mockSearchProduct,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockMealCreate: vi.fn(),
  mockStorageUpload: vi.fn(),
  mockStorageGetPublicUrl: vi.fn(),
  mockAnalyzeImage: vi.fn(),
  mockSearchProduct: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    storage: {
      from: vi.fn(() => ({
        upload: mockStorageUpload,
        getPublicUrl: mockStorageGetPublicUrl,
      })),
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

vi.mock("@/lib/vision/analyze", () => ({
  analyzeImage: mockAnalyzeImage,
  VisionAnalysisError: class VisionAnalysisError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "VisionAnalysisError";
    }
  },
}));

vi.mock("@/lib/nutrition/openfoodfacts", () => ({
  searchProduct: mockSearchProduct,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { POST } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SUPABASE_USER_ID = "supabase-uuid-123";
const DB_USER_ID = "db-uuid-456";
const MEAL_ID = "meal-uuid-789";

const dbUser = {
  id: DB_USER_ID,
  supabaseId: SUPABASE_USER_ID,
  email: "test@example.com",
};

const validAnalysis = {
  components: [
    { name: "Wurstel", estimatedGrams: 120, calories: 320, proteins: 18, carbs: 2, fats: 26 },
    { name: "Patatine", estimatedGrams: 150, calories: 450, proteins: 5, carbs: 60, fats: 22 },
  ],
};

const createdMeal = {
  id: MEAL_ID,
  userId: DB_USER_ID,
  imageUrl: `${SUPABASE_USER_ID}/1711360000000.jpg`,
  status: "ANALYZED",
  analyzedAt: new Date().toISOString(),
  totalCalories: 770,
  totalProteins: 23,
  totalCarbs: 62,
  totalFats: 48,
  components: [
    { id: "comp-1", mealId: MEAL_ID, name: "Wurstel", estimatedGrams: 120, calories: 320, proteins: 18, carbs: 2, fats: 26, openFoodFactsId: null },
    { id: "comp-2", mealId: MEAL_ID, name: "Patatine", estimatedGrams: 150, calories: 450, proteins: 5, carbs: 60, fats: 22, openFoodFactsId: null },
  ],
};

function makeFormDataRequest(file?: File): Request {
  const formData = new FormData();
  if (file) formData.append("image", file);
  return new Request("http://localhost:3000/api/meals/analyze", {
    method: "POST",
    body: formData,
  });
}

function makeJpegFile(name = "piatto.jpg"): File {
  return new File(["fake-image-content"], name, { type: "image/jpeg" });
}

async function jsonResponse(response: NextResponse) {
  return response.json();
}

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockStorageUpload.mockResolvedValue({ error: null });
  mockStorageGetPublicUrl.mockReturnValue({
    data: { publicUrl: `https://storage.example.com/meals/${SUPABASE_USER_ID}/image.jpg` },
  });
  mockSearchProduct.mockResolvedValue(null); // OFF finds nothing by default
  mockMealCreate.mockResolvedValue(createdMeal);
});

// ===========================================================================
// POST /api/meals/analyze
// ===========================================================================
describe("POST /api/meals/analyze", () => {
  it("dovrebbe restituire 201 con meal, components e totali in caso di successo", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockAnalyzeImage.mockResolvedValue(validAnalysis);

    const response = await POST(makeFormDataRequest(makeJpegFile()));
    const body = await jsonResponse(response);

    expect(response.status).toBe(201);
    expect(body.meal).toBeDefined();
    expect(body.meal.id).toBe(MEAL_ID);
    expect(body.components).toBeDefined();
    expect(body.totals).toBeDefined();
    expect(body.totals.calories).toBeTypeOf("number");
  });

  it("dovrebbe chiamare prisma.meal.create con userId e componenti", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockAnalyzeImage.mockResolvedValue(validAnalysis);

    await POST(makeFormDataRequest(makeJpegFile()));

    expect(mockMealCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: DB_USER_ID,
          status: "ANALYZED",
          components: expect.objectContaining({ create: expect.any(Array) }),
        }),
      })
    );
  });

  it("dovrebbe restituire 401 quando l'utente non è autenticato", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(makeFormDataRequest(makeJpegFile()));
    const body = await jsonResponse(response);

    expect(response.status).toBe(401);
    expect(body.error).toBe("Non autenticato");
    expect(mockMealCreate).not.toHaveBeenCalled();
  });

  it("dovrebbe restituire 400 quando il file immagine è mancante", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);

    const response = await POST(makeFormDataRequest()); // no file
    const body = await jsonResponse(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("File immagine mancante");
    expect(mockMealCreate).not.toHaveBeenCalled();
  });

  it("dovrebbe restituire 400 quando il file non è un'immagine", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);

    const pdfFile = new File(["pdf-content"], "document.pdf", { type: "application/pdf" });
    const response = await POST(makeFormDataRequest(pdfFile));
    const body = await jsonResponse(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Il file deve essere un'immagine");
    expect(mockMealCreate).not.toHaveBeenCalled();
  });

  it("dovrebbe restituire 500 quando il vision service fallisce", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockAnalyzeImage.mockRejectedValue(new Error("Vision service unavailable"));

    const response = await POST(makeFormDataRequest(makeJpegFile()));
    const body = await jsonResponse(response);

    expect(response.status).toBe(500);
    expect(body.error).toBeTypeOf("string");
    expect(mockMealCreate).not.toHaveBeenCalled();
  });

  it("dovrebbe restituire 500 quando l'upload su Supabase fallisce", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockStorageUpload.mockResolvedValue({ error: new Error("Storage quota exceeded") });

    const response = await POST(makeFormDataRequest(makeJpegFile()));
    const body = await jsonResponse(response);

    expect(response.status).toBe(500);
    expect(body.error).toContain("upload");
    expect(mockAnalyzeImage).not.toHaveBeenCalled();
  });
});
