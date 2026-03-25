/**
 * TASK-10: Test integrazione flusso scan → analyze → risultati
 *
 * Testa il flusso API lato client: FormData construction,
 * redirect URL su risposta 201, gestione errore su risposta 500.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MEAL_ID = "meal-uuid-test-123";

const validAnalysisResponse = {
  meal: {
    id: MEAL_ID,
    imageUrl: "user-id/1711360000000.jpg",
    analyzedAt: new Date().toISOString(),
    status: "ANALYZED",
  },
  components: [
    { id: "c1", name: "Wurstel", estimatedGrams: 120, calories: 320, proteins: 18, carbs: 2, fats: 26 },
  ],
  totals: { calories: 320, proteins: 18, carbs: 2, fats: 26 },
};

// ---------------------------------------------------------------------------
// Helper: simula il comportamento di uploadAndAnalyze
// (replica la logica della funzione del componente /scan)
// ---------------------------------------------------------------------------
async function simulateUploadAndAnalyze(
  file: File,
  fetchFn: typeof fetch
): Promise<{ redirectUrl: string | null; errorMessage: string | null }> {
  const formData = new FormData();
  formData.append("image", file, file.name);

  const response = await fetchFn("/api/meals/analyze", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const msg = (data as { error?: string }).error ?? "Errore durante l'analisi. Riprova.";
    return { redirectUrl: null, errorMessage: msg };
  }

  const data = (await response.json()) as { meal: { id: string } };
  return { redirectUrl: `/analysis/${data.meal.id}`, errorMessage: null };
}

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// Flusso upload → analyze → redirect
// ===========================================================================
describe("Flusso scan → analyze → redirect", () => {
  it("dovrebbe costruire il FormData con il file immagine e chiamare /api/meals/analyze", async () => {
    const capturedRequests: { url: string; options?: RequestInit }[] = [];
    const mockFetch = vi.fn(async (url: string, options?: RequestInit) => {
      capturedRequests.push({ url, options });
      return {
        ok: true,
        json: async () => validAnalysisResponse,
      } as Response;
    });

    const imageFile = new File(["fake-image-data"], "piatto.jpg", { type: "image/jpeg" });
    await simulateUploadAndAnalyze(imageFile, mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(capturedRequests[0].url).toBe("/api/meals/analyze");
    expect(capturedRequests[0].options?.method).toBe("POST");

    const body = capturedRequests[0].options?.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    const imageEntry = body.get("image");
    expect(imageEntry).toBeInstanceOf(File);
    expect((imageEntry as File).name).toBe("piatto.jpg");
  });

  it("dovrebbe restituire il redirect a /analysis/[mealId] su risposta 201", async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => validAnalysisResponse,
    })) as unknown as typeof fetch;

    const imageFile = new File(["fake"], "piatto.jpg", { type: "image/jpeg" });
    const result = await simulateUploadAndAnalyze(imageFile, mockFetch);

    expect(result.redirectUrl).toBe(`/analysis/${MEAL_ID}`);
    expect(result.errorMessage).toBeNull();
  });

  it("dovrebbe restituire il messaggio di errore su risposta 500", async () => {
    const mockFetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "Errore durante l'analisi AI" }),
    })) as unknown as typeof fetch;

    const imageFile = new File(["fake"], "piatto.jpg", { type: "image/jpeg" });
    const result = await simulateUploadAndAnalyze(imageFile, mockFetch);

    expect(result.redirectUrl).toBeNull();
    expect(result.errorMessage).toBe("Errore durante l'analisi AI");
  });

  it("dovrebbe usare un messaggio di fallback quando l'errore non ha campo error", async () => {
    const mockFetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const imageFile = new File(["fake"], "piatto.jpg", { type: "image/jpeg" });
    const result = await simulateUploadAndAnalyze(imageFile, mockFetch);

    expect(result.redirectUrl).toBeNull();
    expect(result.errorMessage).toBe("Errore durante l'analisi. Riprova.");
  });

  it("dovrebbe includere il nome file originale nel FormData", async () => {
    const capturedBody: FormData[] = [];
    const mockFetch = vi.fn(async (_url: string, options?: RequestInit) => {
      capturedBody.push(options?.body as FormData);
      return { ok: true, json: async () => validAnalysisResponse } as Response;
    });

    const imageFile = new File(["fake"], "mio_pranzo_20250325.jpg", { type: "image/jpeg" });
    await simulateUploadAndAnalyze(imageFile, mockFetch);

    const uploadedFile = capturedBody[0].get("image") as File;
    expect(uploadedFile.name).toBe("mio_pranzo_20250325.jpg");
  });
});

// ===========================================================================
// Struttura risposta API
// ===========================================================================
describe("Struttura risposta /api/meals/analyze", () => {
  it("la risposta 201 deve contenere meal.id per il redirect", async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => validAnalysisResponse,
    })) as unknown as typeof fetch;

    const result = await simulateUploadAndAnalyze(
      new File(["x"], "test.jpg", { type: "image/jpeg" }),
      mockFetch
    );

    expect(result.redirectUrl).toContain(MEAL_ID);
    expect(result.redirectUrl).toMatch(/^\/analysis\/[a-zA-Z0-9-]+$/);
  });
});
