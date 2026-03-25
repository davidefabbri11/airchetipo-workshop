// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoisted mock for fetch
// ---------------------------------------------------------------------------
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock recharts — the real library requires a full browser/SVG environment.
// We replace charting components with simple DOM elements that forward
// children and relevant props so we can assert on rendered structure.
// ---------------------------------------------------------------------------
vi.mock("recharts", () => ({
  LineChart: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="line-chart" data-data={JSON.stringify(props.data)}>
      {children}
    </div>
  ),
  Line: (props: Record<string, unknown>) => (
    <div data-testid={`line-${String(props.dataKey)}`} />
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  ResponsiveContainer: ({ children }: React.PropsWithChildren) => (
    <div>{children}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Mock the shadcn chart wrapper — ChartContainer, ChartTooltip, etc.
// ---------------------------------------------------------------------------
vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: React.PropsWithChildren) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: () => <div data-testid="chart-tooltip" />,
  ChartTooltipContent: () => <div />,
}));

// ---------------------------------------------------------------------------
// Import the component under test AFTER mocks are declared
// ---------------------------------------------------------------------------
import { CalorieChart } from "../calorie-chart";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockApiResponse(
  data: { date: string; calories: number; target?: number | null }[],
  targetCalories: number | null = 2000
) {
  const enriched = data.map((d) => ({
    ...d,
    target: d.target !== undefined ? d.target : targetCalories,
  }));
  return {
    ok: true,
    json: async () => ({ data: enriched, targetCalories }),
  };
}

const WEEK_DATA = [
  { date: "2026-03-19", calories: 0 },
  { date: "2026-03-20", calories: 500 },
  { date: "2026-03-21", calories: 1200 },
  { date: "2026-03-22", calories: 800 },
  { date: "2026-03-23", calories: 0 },
  { date: "2026-03-24", calories: 1500 },
  { date: "2026-03-25", calories: 900 },
];

const EMPTY_DATA: { date: string; calories: number }[] = [];

const ALL_ZERO_DATA = [
  { date: "2026-03-19", calories: 0 },
  { date: "2026-03-20", calories: 0 },
  { date: "2026-03-21", calories: 0 },
];

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
});

// ===========================================================================
// CalorieChart
// ===========================================================================
describe("CalorieChart", () => {
  // -------------------------------------------------------------------------
  // 1. Renders chart with mock data
  // -------------------------------------------------------------------------
  it("renders the chart with calorie data", async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse(WEEK_DATA));

    render(<CalorieChart />);

    // Initially shows loading state
    expect(screen.getByText("Caricamento...")).toBeInTheDocument();

    // After fetch resolves, the chart container should appear
    await waitFor(() => {
      expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    });

    // The calorie line should be rendered
    expect(screen.getByTestId("line-calories")).toBeInTheDocument();

    // The title should always be visible
    expect(screen.getByText("Andamento calorico")).toBeInTheDocument();

    // Fetch was called with the default period (week)
    expect(mockFetch).toHaveBeenCalledWith("/api/meals/stats?period=week");
  });

  // -------------------------------------------------------------------------
  // 2. Switch between periods — verifies fetch is called with correct period
  // -------------------------------------------------------------------------
  it("fetches with the correct period when switching tabs", async () => {
    const user = userEvent.setup();

    // First call: default period=week
    mockFetch.mockResolvedValueOnce(mockApiResponse(WEEK_DATA));

    render(<CalorieChart />);

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/meals/stats?period=week");

    // Click "Giorno" button
    mockFetch.mockResolvedValueOnce(mockApiResponse(WEEK_DATA));
    await user.click(screen.getByRole("button", { name: "Giorno" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/meals/stats?period=day");
    });

    // Click "Mese" button
    mockFetch.mockResolvedValueOnce(mockApiResponse(WEEK_DATA));
    await user.click(screen.getByRole("button", { name: "Mese" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/meals/stats?period=month");
    });

    // Click "Settimana" button (back to default)
    mockFetch.mockResolvedValueOnce(mockApiResponse(WEEK_DATA));
    await user.click(screen.getByRole("button", { name: "Settimana" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        "/api/meals/stats?period=week"
      );
    });
  });

  // -------------------------------------------------------------------------
  // 3. Empty state — shows "Nessun dato disponibile"
  // -------------------------------------------------------------------------
  it('shows "Nessun dato disponibile" when API returns empty data', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse(EMPTY_DATA));

    render(<CalorieChart />);

    await waitFor(() => {
      expect(screen.getByText("Nessun dato disponibile")).toBeInTheDocument();
    });

    // Chart container should NOT be rendered
    expect(screen.queryByTestId("chart-container")).not.toBeInTheDocument();
  });

  it('shows "Nessun dato disponibile" when all calories are 0', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse(ALL_ZERO_DATA));

    render(<CalorieChart />);

    await waitFor(() => {
      expect(screen.getByText("Nessun dato disponibile")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("chart-container")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 4. targetCalories null — only calorie line, no target line
  // -------------------------------------------------------------------------
  it("renders only the calorie line when targetCalories is null", async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse(WEEK_DATA, null));

    render(<CalorieChart />);

    await waitFor(() => {
      expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    });

    // Calorie line is present
    expect(screen.getByTestId("line-calories")).toBeInTheDocument();

    // Target line should NOT be rendered
    expect(screen.queryByTestId("line-target")).not.toBeInTheDocument();
  });

  it("renders both calorie and target lines when targetCalories is set", async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse(WEEK_DATA, 2000));

    render(<CalorieChart />);

    await waitFor(() => {
      expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    });

    // Both lines should be rendered
    expect(screen.getByTestId("line-calories")).toBeInTheDocument();
    expect(screen.getByTestId("line-target")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 5. Loading state
  // -------------------------------------------------------------------------
  it('shows "Caricamento..." while data is being fetched', async () => {
    // Use a promise that we control to keep the component in loading state
    let resolvePromise!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValueOnce(pendingPromise);

    render(<CalorieChart />);

    expect(screen.getByText("Caricamento...")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-container")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Nessun dato disponibile")
    ).not.toBeInTheDocument();

    // Resolve the promise so the component finishes rendering (cleanup)
    resolvePromise(mockApiResponse(WEEK_DATA));

    await waitFor(() => {
      expect(screen.queryByText("Caricamento...")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 6. Fetch error — falls back to empty state
  // -------------------------------------------------------------------------
  it("shows empty state when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    render(<CalorieChart />);

    await waitFor(() => {
      expect(screen.getByText("Nessun dato disponibile")).toBeInTheDocument();
    });
  });
});
