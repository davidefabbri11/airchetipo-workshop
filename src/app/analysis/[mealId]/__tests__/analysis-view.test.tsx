// @vitest-environment jsdom
/**
 * TASK-07: Test integrazione AnalysisView
 *
 * Testa il rendering del componente AnalysisView:
 * - Semaforo adeguatezza (ADEQUATE, EXCESSIVE, INSUFFICIENT)
 * - Badge frequenza di consumo
 * - Barra budget calorico giornaliero
 * - Banner profilo incompleto (adequacy null)
 * - Stato PENDING (spinner, assenza semaforo)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalysisView } from "../analysis-view";

// ---------------------------------------------------------------------------
// Mock next/navigation e next/link
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ refresh: vi.fn() }),
}));

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
// Fixtures
// ---------------------------------------------------------------------------

const baseComponents = [
  {
    id: "comp-1",
    mealId: "meal-1",
    name: "Pasta al pomodoro",
    estimatedGrams: 200,
    calories: 400,
    proteins: 12,
    carbs: 75,
    fats: 5,
    openFoodFactsId: null,
    createdAt: new Date(),
  },
];

const baseMeal = {
  id: "meal-1",
  userId: "user-1",
  imageUrl: "path/img.jpg",
  status: "ANALYZED" as const,
  analyzedAt: new Date("2026-03-25T12:00:00"),
  totalCalories: 400,
  totalProteins: 12,
  totalCarbs: 75,
  totalFats: 5,
  adequacy: "ADEQUATE" as const,
  consumptionFrequency: "3-4 volte a settimana",
  remainingBudgetAtAnalysis: 1600,
  components: baseComponents,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const imagePublicUrl = "https://example.com/meal.jpg";

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// AnalysisView
// ===========================================================================

describe("AnalysisView", () => {
  // -------------------------------------------------------------------------
  // 1. Semaforo ADEQUATE
  // -------------------------------------------------------------------------
  it("mostra 'Piatto Adeguato' quando adequacy è ADEQUATE", () => {
    const meal = { ...baseMeal, adequacy: "ADEQUATE" as const };
    render(<AnalysisView meal={meal} imagePublicUrl={imagePublicUrl} />);

    expect(screen.getByText("Piatto Adeguato")).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 2. Semaforo EXCESSIVE
  // -------------------------------------------------------------------------
  it("mostra 'Porzione Eccessiva' quando adequacy è EXCESSIVE", () => {
    const meal = { ...baseMeal, adequacy: "EXCESSIVE" as const };
    render(<AnalysisView meal={meal} imagePublicUrl={imagePublicUrl} />);

    expect(screen.getByText("Porzione Eccessiva")).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 3. Semaforo INSUFFICIENT
  // -------------------------------------------------------------------------
  it("mostra 'Apporto Insufficiente' quando adequacy è INSUFFICIENT", () => {
    const meal = { ...baseMeal, adequacy: "INSUFFICIENT" as const };
    render(<AnalysisView meal={meal} imagePublicUrl={imagePublicUrl} />);

    expect(screen.getByText("Apporto Insufficiente")).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 4. Badge frequenza di consumo
  // -------------------------------------------------------------------------
  it("mostra il badge della frequenza consigliata", () => {
    const meal = { ...baseMeal, consumptionFrequency: "3-4 volte a settimana" };
    render(<AnalysisView meal={meal} imagePublicUrl={imagePublicUrl} />);

    expect(
      screen.getByText("Frequenza consigliata: 3-4 volte a settimana")
    ).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 5. Barra budget calorico
  // -------------------------------------------------------------------------
  it("mostra '400 kcal usate su 2000 kcal totali' con remainingBudget=1600 e totalCalories=400", () => {
    const meal = {
      ...baseMeal,
      totalCalories: 400,
      remainingBudgetAtAnalysis: 1600,
    };
    render(<AnalysisView meal={meal} imagePublicUrl={imagePublicUrl} />);

    expect(
      screen.getByText("400 kcal usate su 2000 kcal totali")
    ).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 6. Banner profilo incompleto quando adequacy è null
  // -------------------------------------------------------------------------
  it("mostra il banner 'Completa il profilo per la valutazione' quando adequacy è null", () => {
    const meal = {
      ...baseMeal,
      adequacy: null,
      consumptionFrequency: null,
      remainingBudgetAtAnalysis: null,
    };
    render(<AnalysisView meal={meal} imagePublicUrl={imagePublicUrl} />);

    expect(
      screen.getByText("Completa il profilo per la valutazione")
    ).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 7. Stato PENDING
  // -------------------------------------------------------------------------
  it("mostra 'Analisi in corso' e non mostra il semaforo quando status è PENDING", () => {
    const meal = {
      ...baseMeal,
      status: "PENDING" as const,
      adequacy: "ADEQUATE" as const,
    };
    render(<AnalysisView meal={meal} imagePublicUrl={imagePublicUrl} />);

    // Verifica che il testo dello stato pending sia presente
    expect(screen.getByText("Analisi in corso…")).toBeDefined();

    // Verifica che il semaforo NON sia presente
    expect(screen.queryByText("Piatto Adeguato")).toBeNull();
  });
});
