import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.stubGlobal("fetch", mockFetch);

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { searchProduct } from "./openfoodfacts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const offResponseWithProduct = {
  products: [
    {
      id: "0737628064502",
      product_name: "Wurstel di pollo",
      nutriments: {
        "energy-kcal_100g": 180,
        proteins_100g: 14,
        carbohydrates_100g: 3,
        fat_100g: 13,
      },
    },
  ],
};

const offResponseEmpty = { products: [] };

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// searchProduct
// ===========================================================================
describe("searchProduct", () => {
  it("dovrebbe restituire un prodotto normalizzato quando trovato", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(offResponseWithProduct),
    });

    const result = await searchProduct("wurstel");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("0737628064502");
    expect(result?.name).toBe("Wurstel di pollo");
    expect(result?.calories).toBe(180);
    expect(result?.proteins).toBe(14);
    expect(result?.carbs).toBe(3);
    expect(result?.fats).toBe(13);
  });

  it("dovrebbe restituire null quando nessun prodotto è trovato", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(offResponseEmpty),
    });

    const result = await searchProduct("prodotto inesistente xyz123");

    expect(result).toBeNull();
  });

  it("dovrebbe restituire null quando la risposta HTTP non è ok", async () => {
    mockFetch.mockResolvedValue({ ok: false });

    const result = await searchProduct("wurstel");

    expect(result).toBeNull();
  });

  it("dovrebbe restituire null quando si verifica un timeout (AbortError)", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValue(abortError);

    const result = await searchProduct("wurstel");

    expect(result).toBeNull();
  });

  it("dovrebbe restituire null su errori di rete generici", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await searchProduct("wurstel");

    expect(result).toBeNull();
  });

  it("dovrebbe normalizzare correttamente i campi nutriments alternativi", async () => {
    const responseWithAltFields = {
      products: [
        {
          id: "test-id",
          product_name: "Test",
          nutriments: {
            "energy-kcal": 200,
            proteins: 10,
            carbohydrates: 25,
            fat: 8,
          },
        },
      ],
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(responseWithAltFields),
    });

    const result = await searchProduct("test");

    expect(result?.calories).toBe(200);
    expect(result?.proteins).toBe(10);
    expect(result?.carbs).toBe(25);
    expect(result?.fats).toBe(8);
  });

  it("dovrebbe includere il nome del termine di ricerca se product_name è assente", async () => {
    const responseWithoutName = {
      products: [
        {
          id: "test-id",
          nutriments: { "energy-kcal_100g": 100, proteins_100g: 5, carbohydrates_100g: 15, fat_100g: 3 },
        },
      ],
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(responseWithoutName),
    });

    const result = await searchProduct("riso");

    expect(result?.name).toBe("riso");
  });
});
