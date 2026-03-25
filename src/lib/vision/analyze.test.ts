import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: mockGenerateText,
  Output: {
    object: vi.fn(({ schema }) => ({ type: "object", schema })),
  },
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn((model: string) => ({ model }))),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { analyzeImage, VisionAnalysisError } from "./analyze";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const validAnalysis = {
  components: [
    {
      name: "Wurstel alla griglia",
      estimatedGrams: 120,
      calories: 320,
      proteins: 18,
      carbs: 2,
      fats: 26,
    },
    {
      name: "Patatine fritte",
      estimatedGrams: 150,
      calories: 450,
      proteins: 5,
      carbs: 60,
      fats: 22,
    },
  ],
};

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// analyzeImage
// ===========================================================================
describe("analyzeImage", () => {
  it("dovrebbe restituire i componenti identificati in caso di successo", async () => {
    mockGenerateText.mockResolvedValue({ output: validAnalysis });

    const result = await analyzeImage("https://example.com/image.jpg");

    expect(result).toEqual(validAnalysis);
    expect(result.components).toHaveLength(2);
    expect(result.components[0].name).toBe("Wurstel alla griglia");
  });

  it("dovrebbe chiamare generateText con l'URL dell'immagine corretto", async () => {
    mockGenerateText.mockResolvedValue({ output: validAnalysis });
    const imageUrl = "https://storage.example.com/meals/user-id/image.jpg";

    await analyzeImage(imageUrl);

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateText.mock.calls[0][0];
    const imageContent = callArgs.messages[0].content.find(
      (c: { type: string }) => c.type === "image"
    );
    expect(imageContent).toBeDefined();
    expect(imageContent.image).toBe(imageUrl);
  });

  it("dovrebbe lanciare VisionAnalysisError quando generateText fallisce", async () => {
    mockGenerateText.mockRejectedValue(new Error("AI provider error"));

    await expect(analyzeImage("https://example.com/image.jpg")).rejects.toThrow(
      VisionAnalysisError
    );
  });

  it("dovrebbe includere un messaggio leggibile nell'errore", async () => {
    mockGenerateText.mockRejectedValue(new Error("Network timeout"));

    await expect(analyzeImage("https://example.com/image.jpg")).rejects.toThrow(
      "Impossibile analizzare l'immagine"
    );
  });

  it("dovrebbe propagare la causa originale nell'errore", async () => {
    const originalError = new Error("Original AI error");
    mockGenerateText.mockRejectedValue(originalError);

    try {
      await analyzeImage("https://example.com/image.jpg");
    } catch (err) {
      expect(err).toBeInstanceOf(VisionAnalysisError);
      expect((err as VisionAnalysisError).cause).toBe(originalError);
    }
  });
});
