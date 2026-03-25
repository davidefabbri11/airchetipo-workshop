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

const dbUserWithProfile = {
  id: DB_USER_ID,
  supabaseId: SUPABASE_USER_ID,
  email: "test@example.com",
  name: "Test User",
  profile: {
    targetCalories: 2000,
  },
};

const dbUserWithoutTargetCalories = {
  id: DB_USER_ID,
  supabaseId: SUPABASE_USER_ID,
  email: "test@example.com",
  name: "Test User",
  profile: null,
};

function makeRequest(period?: string): NextRequest {
  const url = period
    ? `http://localhost:3000/api/meals/stats?period=${period}`
    : "http://localhost:3000/api/meals/stats";
  return new NextRequest(url, { method: "GET" });
}

async function jsonResponse(response: NextResponse) {
  return response.json();
}

/**
 * Helper: create a meal record for tests.
 * Only totalCalories and createdAt are selected by the route.
 */
function makeMeal(totalCalories: number, createdAt: Date) {
  return { totalCalories, createdAt };
}

/**
 * Compute expected day bucket labels using the SAME UTC logic the route uses.
 */
function expectedDayLabels(): string[] {
  const labels: string[] = [];
  const y = NOW.getUTCFullYear();
  const m = NOW.getUTCMonth();
  const d = NOW.getUTCDate();
  for (let i = 6; i >= 0; i--) {
    const start = new Date(Date.UTC(y, m, d - i));
    labels.push(start.toISOString().slice(0, 10));
  }
  return labels;
}

/**
 * Compute expected month bucket labels using the SAME UTC logic the route uses.
 */
function expectedMonthLabels(): string[] {
  const labels: string[] = [];
  const y = NOW.getUTCFullYear();
  const m = NOW.getUTCMonth();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(Date.UTC(y, m - i, 1));
    labels.push(start.toISOString().slice(0, 7));
  }
  return labels;
}

/**
 * Build a Date that falls within a specific day bucket (UTC midnight + 10h).
 * daysAgo = 0 means "today".
 */
function dateInDayBucket(daysAgo: number): Date {
  const y = NOW.getUTCFullYear();
  const m = NOW.getUTCMonth();
  const d = NOW.getUTCDate();
  return new Date(Date.UTC(y, m, d - daysAgo, 10, 0, 0, 0));
}

/**
 * Build a Date that falls within a specific month bucket (UTC).
 * monthsAgo = 0 means current month, 1 means last month, etc.
 */
function dateInMonthBucket(monthsAgo: number): Date {
  const y = NOW.getUTCFullYear();
  const m = NOW.getUTCMonth();
  return new Date(Date.UTC(y, m - monthsAgo, 15, 10, 0, 0, 0));
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
// GET /api/meals/stats
// ===========================================================================
describe("GET /api/meals/stats", () => {
  // -------------------------------------------------------------------------
  // 1. Returns 401 when user is not authenticated
  // -------------------------------------------------------------------------
  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(makeRequest());
    const body = await jsonResponse(response);

    expect(response.status).toBe(401);
    expect(body.error).toBe("Non autenticato");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockMealFindMany).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 2. Returns 404 when user not found in DB
  // -------------------------------------------------------------------------
  it("returns 404 when user not found in DB", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(null);

    const response = await GET(makeRequest());
    const body = await jsonResponse(response);

    expect(response.status).toBe(404);
    expect(body.error).toBe("Utente non trovato");
    expect(mockMealFindMany).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3. Returns correct aggregation for period=day (last 7 days, YYYY-MM-DD)
  // -------------------------------------------------------------------------
  it("returns correct aggregation for period=day with YYYY-MM-DD labels", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithProfile);

    const dayLabels = expectedDayLabels();

    // Two meals today (daysAgo=0) and one 3 days ago
    const meals = [
      makeMeal(500, dateInDayBucket(0)),
      makeMeal(300, dateInDayBucket(0)),
      makeMeal(700, dateInDayBucket(3)),
    ];
    mockMealFindMany.mockResolvedValue(meals);

    const response = await GET(makeRequest("day"));
    const body = await jsonResponse(response);

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(7);

    // Each label must be YYYY-MM-DD format
    for (const entry of body.data) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    // Verify first and last bucket labels
    expect(body.data[0].date).toBe(dayLabels[0]);
    expect(body.data[6].date).toBe(dayLabels[6]);

    // Check aggregated calories for today (last bucket)
    const todayBucket = body.data.find(
      (d: { date: string }) => d.date === dayLabels[6]
    );
    expect(todayBucket.calories).toBe(800); // 500 + 300
    // day bucket = 1 day => target = 2000 * 1
    expect(todayBucket.target).toBe(2000);

    // Check 3 days ago bucket
    const threeDaysAgoBucket = body.data.find(
      (d: { date: string }) => d.date === dayLabels[3]
    );
    expect(threeDaysAgoBucket.calories).toBe(700);

    expect(body.targetCalories).toBe(2000);
  });

  // -------------------------------------------------------------------------
  // 4. Returns correct aggregation for period=week (last 4 weeks)
  // -------------------------------------------------------------------------
  it("returns correct aggregation for period=week (4 buckets)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithProfile);

    // One meal 1 day ago (falls in the most recent week bucket)
    const meals = [
      makeMeal(1200, dateInDayBucket(1)),
    ];
    mockMealFindMany.mockResolvedValue(meals);

    const response = await GET(makeRequest("week"));
    const body = await jsonResponse(response);

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(4);

    // The most recent bucket (index 3) should contain the 1200 cal meal
    const lastBucket = body.data[3];
    expect(lastBucket.calories).toBe(1200);
    // week bucket = 7 days => target = 2000 * 7
    expect(lastBucket.target).toBe(14000);
  });

  // -------------------------------------------------------------------------
  // 5. Returns correct aggregation for period=month (last 6 months, YYYY-MM)
  // -------------------------------------------------------------------------
  it("returns correct aggregation for period=month with YYYY-MM labels", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithProfile);

    const monthLabels = expectedMonthLabels();

    const meals = [
      makeMeal(2000, dateInMonthBucket(0)),  // current month
      makeMeal(1500, dateInMonthBucket(2)),  // 2 months ago
    ];
    mockMealFindMany.mockResolvedValue(meals);

    const response = await GET(makeRequest("month"));
    const body = await jsonResponse(response);

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(6);

    // Each label must be YYYY-MM format
    for (const entry of body.data) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}$/);
    }

    // Verify first and last month labels
    expect(body.data[0].date).toBe(monthLabels[0]);
    expect(body.data[5].date).toBe(monthLabels[5]);

    // Current month bucket — target = 2000 * daysInMonth
    const currentMonth = body.data.find(
      (d: { date: string }) => d.date === monthLabels[5]
    );
    expect(currentMonth.calories).toBe(2000);
    // March 2026 has 31 days
    expect(currentMonth.target).toBe(2000 * 31);

    // 2 months ago bucket
    const twoMonthsAgo = body.data.find(
      (d: { date: string }) => d.date === monthLabels[3]
    );
    expect(twoMonthsAgo.calories).toBe(1500);
    // January 2026 has 31 days
    expect(twoMonthsAgo.target).toBe(2000 * 31);
  });

  // -------------------------------------------------------------------------
  // 6. Gaps in data: days/weeks/months with no meals should have calories: 0
  // -------------------------------------------------------------------------
  it("fills gaps with calories: 0 for periods with no meals", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithProfile);

    const dayLabels = expectedDayLabels();

    // Only one meal today; all other buckets should be 0
    const meals = [makeMeal(400, dateInDayBucket(0))];
    mockMealFindMany.mockResolvedValue(meals);

    const response = await GET(makeRequest("day"));
    const body = await jsonResponse(response);

    expect(body.data).toHaveLength(7);

    // 6 of the 7 days should have 0 calories
    const zeroDays = body.data.filter(
      (d: { calories: number }) => d.calories === 0
    );
    expect(zeroDays).toHaveLength(6);

    // Today's bucket should have 400
    const todayBucket = body.data.find(
      (d: { date: string }) => d.date === dayLabels[6]
    );
    expect(todayBucket).toBeDefined();
    expect(todayBucket.calories).toBe(400);
  });

  // -------------------------------------------------------------------------
  // 7. targetCalories is null when profile has no targetCalories
  // -------------------------------------------------------------------------
  it("returns targetCalories as null when profile is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithoutTargetCalories);
    mockMealFindMany.mockResolvedValue([]);

    const response = await GET(makeRequest("day"));
    const body = await jsonResponse(response);

    expect(response.status).toBe(200);
    expect(body.targetCalories).toBeNull();
    // Every data point should also have target: null
    for (const entry of body.data) {
      expect(entry.target).toBeNull();
    }
  });

  // -------------------------------------------------------------------------
  // 8. Default period is week when no period param provided
  // -------------------------------------------------------------------------
  it("defaults to period=week when no period param is provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithProfile);
    mockMealFindMany.mockResolvedValue([]);

    const response = await GET(makeRequest());
    const body = await jsonResponse(response);

    expect(response.status).toBe(200);
    // Week period produces 4 buckets
    expect(body.data).toHaveLength(4);
  });

  // -------------------------------------------------------------------------
  // 9. Only ANALYZED meals are included (PENDING meals excluded)
  // -------------------------------------------------------------------------
  it("only queries ANALYZED meals (via findMany where clause)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: SUPABASE_USER_ID } } });
    mockUserFindUnique.mockResolvedValue(dbUserWithProfile);
    mockMealFindMany.mockResolvedValue([]);

    await GET(makeRequest("day"));

    // Verify the findMany call includes status: "ANALYZED" filter
    expect(mockMealFindMany).toHaveBeenCalledTimes(1);
    const callArgs = mockMealFindMany.mock.calls[0][0];
    expect(callArgs.where.status).toBe("ANALYZED");
    expect(callArgs.where.userId).toBe(DB_USER_ID);
    expect(callArgs.where.createdAt).toBeDefined();
    expect(callArgs.where.createdAt.gte).toBeInstanceOf(Date);
  });
});
