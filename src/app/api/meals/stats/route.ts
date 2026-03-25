import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const VALID_PERIODS = ["day", "week", "month"] as const;
type Period = (typeof VALID_PERIODS)[number];

interface Bucket {
  label: string;
  start: Date;
  end: Date;
  days: number;
}

function generateBuckets(period: Period): Bucket[] {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const buckets: Bucket[] = [];

  switch (period) {
    case "day": {
      for (let i = 6; i >= 0; i--) {
        const start = new Date(Date.UTC(y, m, d - i));
        const end = new Date(Date.UTC(y, m, d - i, 23, 59, 59, 999));
        buckets.push({
          label: start.toISOString().slice(0, 10),
          start,
          end,
          days: 1,
        });
      }
      break;
    }
    case "week": {
      for (let i = 3; i >= 0; i--) {
        const endDate = new Date(Date.UTC(y, m, d - i * 7));
        const end = new Date(
          Date.UTC(
            endDate.getUTCFullYear(),
            endDate.getUTCMonth(),
            endDate.getUTCDate(),
            23, 59, 59, 999
          )
        );
        const start = new Date(
          Date.UTC(
            endDate.getUTCFullYear(),
            endDate.getUTCMonth(),
            endDate.getUTCDate() - 6
          )
        );
        buckets.push({
          label: start.toISOString().slice(0, 10),
          start,
          end,
          days: 7,
        });
      }
      break;
    }
    case "month": {
      for (let i = 5; i >= 0; i--) {
        const start = new Date(Date.UTC(y, m - i, 1));
        const end = new Date(Date.UTC(y, m - i + 1, 0, 23, 59, 59, 999));
        buckets.push({
          label: start.toISOString().slice(0, 7),
          start,
          end,
          days: end.getUTCDate(),
        });
      }
      break;
    }
  }

  return buckets;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { profile: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  const periodParam = request.nextUrl.searchParams.get("period") ?? "week";
  const period: Period = VALID_PERIODS.includes(periodParam as Period)
    ? (periodParam as Period)
    : "week";

  const buckets = generateBuckets(period);
  const rangeStart = buckets[0].start;

  try {
    const meals = await prisma.meal.findMany({
      where: {
        userId: dbUser.id,
        status: "ANALYZED",
        createdAt: { gte: rangeStart },
      },
      select: {
        totalCalories: true,
        createdAt: true,
      },
    });

    const dailyTarget = dbUser.profile?.targetCalories ?? null;

    const data = buckets.map((bucket) => {
      const calories = meals
        .filter((meal) => meal.createdAt >= bucket.start && meal.createdAt <= bucket.end)
        .reduce((sum, meal) => sum + (meal.totalCalories ?? 0), 0);

      return {
        date: bucket.label,
        calories: Math.round(calories),
        target:
          dailyTarget !== null
            ? Math.round(dailyTarget * bucket.days)
            : null,
      };
    });

    return NextResponse.json({ data, targetCalories: dailyTarget });
  } catch (err) {
    console.error("[GET /api/meals/stats]", err);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
