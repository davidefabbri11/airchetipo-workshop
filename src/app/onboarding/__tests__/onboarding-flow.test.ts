import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockGetUser,
  mockUserUpsert,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUserUpsert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      upsert: (...args: unknown[]) => mockUserUpsert(...args),
    },
  },
}));

import { GET } from "../../auth/callback/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SUPABASE_USER = {
  id: "supabase-123",
  email: "test@example.com",
  user_metadata: { full_name: "Test User" },
};

const DB_USER_WITHOUT_PROFILE = {
  id: "db-123",
  supabaseId: "supabase-123",
  email: "test@example.com",
  profile: null,
};

const DB_USER_WITH_PROFILE = {
  ...DB_USER_WITHOUT_PROFILE,
  profile: {
    id: "profile-123",
    userId: "db-123",
    height: 175,
    weight: 70,
    age: 30,
    activityLevel: "MODERATE",
    goal: "GAIN_MUSCLE",
  },
};

function extractRedirectPath(response: Response): string {
  const location = response.headers.get("location") ?? "";
  try {
    return new URL(location).pathname;
  } catch {
    return location;
  }
}

// ---------------------------------------------------------------------------
// Test: flusso redirect onboarding nel callback auth
// ---------------------------------------------------------------------------
describe("Flusso redirect onboarding (callback auth)", () => {
  it("dovrebbe redirectare a /onboarding quando l'utente non ha un profilo (OAuth)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } });
    mockUserUpsert.mockResolvedValue(DB_USER_WITHOUT_PROFILE);

    const request = new Request(
      "http://localhost:3000/auth/callback?code=abc123"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(extractRedirectPath(response)).toBe("/onboarding");
  });

  it("dovrebbe redirectare a /dashboard quando l'utente ha già un profilo (OAuth)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } });
    mockUserUpsert.mockResolvedValue(DB_USER_WITH_PROFILE);

    const request = new Request(
      "http://localhost:3000/auth/callback?code=abc123"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(extractRedirectPath(response)).toBe("/dashboard");
  });

  it("dovrebbe redirectare a /onboarding per nuovi utenti via email verification", async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } });
    mockUserUpsert.mockResolvedValue(DB_USER_WITHOUT_PROFILE);

    const request = new Request(
      "http://localhost:3000/auth/callback?token_hash=xyz&type=signup"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(extractRedirectPath(response)).toBe("/onboarding");
  });

  it("dovrebbe redirectare a /dashboard per utenti con profilo via email verification", async () => {
    mockGetUser.mockResolvedValue({ data: { user: SUPABASE_USER } });
    mockUserUpsert.mockResolvedValue(DB_USER_WITH_PROFILE);

    const request = new Request(
      "http://localhost:3000/auth/callback?token_hash=xyz&type=email"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(extractRedirectPath(response)).toBe("/dashboard");
  });
});

// ---------------------------------------------------------------------------
// Test: validazione schema Zod (verifica integrazione nel flusso)
// ---------------------------------------------------------------------------
describe("Validazione schema profilo (integrazione)", () => {
  it("dovrebbe accettare tutti i valori di activityLevel validi", async () => {
    const { profileSchema } = await import("@/lib/validations/profile");
    const base = { height: 170, weight: 65, age: 25, goal: "MAINTAIN" as const };

    for (const level of ["SEDENTARY", "LIGHT", "MODERATE", "INTENSE"] as const) {
      const result = profileSchema.safeParse({ ...base, activityLevel: level });
      expect(result.success).toBe(true);
    }
  });

  it("dovrebbe accettare tutti i valori di goal validi", async () => {
    const { profileSchema } = await import("@/lib/validations/profile");
    const base = { height: 170, weight: 65, age: 25, activityLevel: "MODERATE" as const };

    for (const goal of ["LOSE_WEIGHT", "GAIN_MUSCLE", "REDUCE_FAT", "MAINTAIN"] as const) {
      const result = profileSchema.safeParse({ ...base, goal });
      expect(result.success).toBe(true);
    }
  });

  it("dovrebbe rifiutare valori ai limiti estremi", async () => {
    const { profileSchema } = await import("@/lib/validations/profile");

    // Below minimum
    expect(profileSchema.safeParse({ height: 49, weight: 20, age: 10, activityLevel: "LIGHT", goal: "MAINTAIN" }).success).toBe(false);
    // Above maximum
    expect(profileSchema.safeParse({ height: 301, weight: 70, age: 30, activityLevel: "LIGHT", goal: "MAINTAIN" }).success).toBe(false);

    // Edge valid values
    expect(profileSchema.safeParse({ height: 50, weight: 20, age: 10, activityLevel: "LIGHT", goal: "MAINTAIN" }).success).toBe(true);
    expect(profileSchema.safeParse({ height: 300, weight: 500, age: 120, activityLevel: "INTENSE", goal: "LOSE_WEIGHT" }).success).toBe(true);
  });
});
