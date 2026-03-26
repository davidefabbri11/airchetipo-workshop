// @vitest-environment jsdom
/**
 * TASK-05: Test integrazione HistoryPage
 *
 * Testa il rendering e il comportamento della pagina /history:
 * - Rendering lista pasti con badge componenti e calorie
 * - Switching filtri periodo (oggi, settimana, mese)
 * - Stato vuoto con link verso /scan
 * - Contenuto meal card (badge, calorie, data formattata)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import HistoryPage from "../page";

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Mock next/link
// ---------------------------------------------------------------------------

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Mock next/image
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Mock @/lib/supabase/client
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: "https://example.com/image.jpg" },
        }),
      }),
    },
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockMeals = [
  {
    id: "meal-1",
    imageUrl: "user-1/meal-1.jpg",
    status: "ANALYZED",
    createdAt: "2026-03-25T12:00:00.000Z",
    components: [
      {
        id: "c1",
        name: "Pasta",
        calories: 350,
        proteins: 12,
        carbs: 70,
        fats: 3,
        estimatedGrams: 200,
      },
      {
        id: "c2",
        name: "Pomodoro",
        calories: 50,
        proteins: 2,
        carbs: 8,
        fats: 1,
        estimatedGrams: 100,
      },
    ],
  },
  {
    id: "meal-2",
    imageUrl: "user-1/meal-2.jpg",
    status: "ANALYZED",
    createdAt: "2026-03-24T19:00:00.000Z",
    components: [
      {
        id: "c3",
        name: "Pollo",
        calories: 280,
        proteins: 35,
        carbs: 0,
        fats: 14,
        estimatedGrams: 200,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// HistoryPage
// ===========================================================================

describe("HistoryPage", () => {
  // -------------------------------------------------------------------------
  // 1. Rendering lista pasti
  // -------------------------------------------------------------------------
  it("mostra la lista dei pasti con badge componenti e calorie quando l'API ritorna dati", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meals: mockMeals, nextCursor: null }),
    });

    render(<HistoryPage />);

    // Attende il rendering asincrono
    await waitFor(() => {
      expect(screen.getByText("Pasta")).toBeDefined();
    });

    // Badge componenti del primo pasto
    expect(screen.getByText("Pasta")).toBeDefined();
    expect(screen.getByText("Pomodoro")).toBeDefined();

    // Badge componente del secondo pasto
    expect(screen.getByText("Pollo")).toBeDefined();

    // Calorie totali: Pasta(350) + Pomodoro(50) = 400 kcal
    expect(screen.getByText("400 kcal")).toBeDefined();

    // Calorie totali: Pollo(280) = 280 kcal
    expect(screen.getByText("280 kcal")).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 2. Switching filtri periodo
  // -------------------------------------------------------------------------
  it("richiama fetch con i parametri corretti quando si cambiano i filtri periodo", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meals: [], nextCursor: null }),
    });
    global.fetch = mockFetch;

    render(<HistoryPage />);

    // Al mount viene chiamato con il periodo di default "month"
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("period=month")
      );
    });

    // Click su "Oggi"
    const todayBtn = screen.getByText("Oggi");
    fireEvent.click(todayBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("period=today")
      );
    });

    // Click su "Questa settimana"
    const weekBtn = screen.getByText("Questa settimana");
    fireEvent.click(weekBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("period=week")
      );
    });
  });

  // -------------------------------------------------------------------------
  // 3. Stato vuoto
  // -------------------------------------------------------------------------
  it("mostra il messaggio di stato vuoto e un link verso /scan quando non ci sono pasti", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meals: [], nextCursor: null }),
    });

    render(<HistoryPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Nessun pasto registrato per questo periodo.")
      ).toBeDefined();
    });

    // Verifica presenza del link/bottone verso /scan
    const scanLink = screen.getByRole("link", { name: /scatta una foto/i });
    expect(scanLink).toBeDefined();
    expect((scanLink as HTMLAnchorElement).href).toContain("/scan");
  });

  // -------------------------------------------------------------------------
  // 4. Paginazione "Carica altri"
  // -------------------------------------------------------------------------
  it("mostra il bottone 'Carica altri', chiama fetch con cursor e appende i nuovi pasti", async () => {
    const secondMeal = {
      id: "meal-3",
      imageUrl: "user-1/meal-3.jpg",
      status: "ANALYZED",
      createdAt: "2026-03-23T10:00:00.000Z",
      components: [
        { id: "c4", name: "Riso", calories: 300, proteins: 6, carbs: 65, fats: 1, estimatedGrams: 180 },
      ],
    };

    const mockFetch = vi
      .fn()
      // Prima chiamata: ritorna meal-1 e meal-2 con nextCursor
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ meals: mockMeals, nextCursor: "meal-2" }),
      })
      // Seconda chiamata ("Carica altri"): ritorna meal-3 senza nextCursor
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ meals: [secondMeal], nextCursor: null }),
      });
    global.fetch = mockFetch;

    render(<HistoryPage />);

    // Attende rendering iniziale
    await waitFor(() => {
      expect(screen.getByText("Pasta")).toBeDefined();
    });

    // Il bottone "Carica altri" deve essere visibile (nextCursor non null)
    const loadMoreBtn = screen.getByRole("button", { name: /carica altri/i });
    expect(loadMoreBtn).toBeDefined();

    // Click su "Carica altri"
    fireEvent.click(loadMoreBtn);

    // La seconda fetch deve includere il cursor
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("cursor=meal-2")
      );
    });

    // I nuovi pasti vengono appesi alla lista
    await waitFor(() => {
      expect(screen.getByText("Riso")).toBeDefined();
    });

    // I pasti precedenti sono ancora visibili
    expect(screen.getByText("Pasta")).toBeDefined();

    // Il bottone "Carica altri" scompare (nextCursor null)
    expect(screen.queryByRole("button", { name: /carica altri/i })).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 5. Contenuto meal card
  // -------------------------------------------------------------------------
  it("mostra nelle card i badge dei componenti, le calorie con 'kcal' e la data formattata", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meals: [mockMeals[0]], nextCursor: null }),
    });

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Pasta")).toBeDefined();
    });

    // Badge componenti visibili (max 3 nella card)
    expect(screen.getByText("Pasta")).toBeDefined();
    expect(screen.getByText("Pomodoro")).toBeDefined();

    // Calorie con "kcal" — Pasta(350) + Pomodoro(50) = 400
    expect(screen.getByText("400 kcal")).toBeDefined();

    // Data formattata in it-IT (es. "25 mar 2026, 12:00" o simile)
    // Verifica che esista un testo contenente "2026"
    const dateElements = screen.getAllByText(/2026/);
    expect(dateElements.length).toBeGreaterThan(0);
  });
});
