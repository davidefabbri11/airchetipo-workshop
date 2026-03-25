import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks (vi.hoisted garantisce la disponibilità prima di vi.mock)
// ---------------------------------------------------------------------------
const { mockImageCompression } = vi.hoisted(() => ({
  mockImageCompression: vi.fn(),
}));

vi.mock("browser-image-compression", () => ({
  default: mockImageCompression,
}));

// ---------------------------------------------------------------------------
// Import del modulo da testare (dopo i mock)
// ---------------------------------------------------------------------------
import { compressImage } from "../image-compression";

// ---------------------------------------------------------------------------
// Reset mock prima di ogni test
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// compressImage
// ===========================================================================
describe("compressImage", () => {
  const fakeFile = new File(["content"], "test.jpg", { type: "image/jpeg" });

  const EXPECTED_OPTIONS = {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    fileType: "image/jpeg",
    useWebWorker: true,
  };

  it("dovrebbe chiamare imageCompression con il file e le opzioni corrette", async () => {
    const compressedFile = new File(["compressed"], "test-compressed.jpg", {
      type: "image/jpeg",
    });
    mockImageCompression.mockResolvedValue(compressedFile);

    await compressImage(fakeFile);

    expect(mockImageCompression).toHaveBeenCalledWith(fakeFile, EXPECTED_OPTIONS);
  });

  it("dovrebbe restituire il file compresso prodotto da imageCompression", async () => {
    const compressedFile = new File(["compressed"], "test-compressed.jpg", {
      type: "image/jpeg",
    });
    mockImageCompression.mockResolvedValue(compressedFile);

    const result = await compressImage(fakeFile);

    expect(result).toBe(compressedFile);
  });

  it("dovrebbe chiamare imageCompression esattamente una volta", async () => {
    const compressedFile = new File(["compressed"], "test-compressed.jpg", {
      type: "image/jpeg",
    });
    mockImageCompression.mockResolvedValue(compressedFile);

    await compressImage(fakeFile);

    expect(mockImageCompression).toHaveBeenCalledTimes(1);
  });

  it("dovrebbe propagare l'eccezione se imageCompression lancia un errore", async () => {
    const compressionError = new Error("Compressione fallita: file non valido");
    mockImageCompression.mockRejectedValue(compressionError);

    await expect(compressImage(fakeFile)).rejects.toThrow(
      "Compressione fallita: file non valido"
    );
  });

  it("dovrebbe propagare l'eccezione senza ingoiarla", async () => {
    const compressionError = new Error("Errore generico di compressione");
    mockImageCompression.mockRejectedValue(compressionError);

    await expect(compressImage(fakeFile)).rejects.toBe(compressionError);
  });
});
