import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MealStatus } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const historyQuerySchema = z.object({
  period: z.enum(["today", "week", "month"]).default("month"),
  cursor: z.string().uuid("Cursore non valido").optional(),
  limit: z.coerce
    .number()
    .int("Il limite deve essere un intero")
    .min(1, "Il limite deve essere almeno 1")
    .max(50, "Il limite massimo è 50")
    .default(10),
});

function getPeriodStartDate(period: "today" | "week" | "month"): Date {
  const now = new Date();

  switch (period) {
    case "today": {
      return new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
    }
    case "week": {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() - 7);
      return date;
    }
    case "month": {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() - 30);
      return date;
    }
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const rawParams = {
    period: searchParams.get("period") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };

  const parsed = historyQuerySchema.safeParse(rawParams);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Parametri non validi",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { period, cursor, limit } = parsed.data;
  const periodStart = getPeriodStartDate(period);

  try {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    const meals = await prisma.meal.findMany({
      where: {
        userId: dbUser.id,
        status: MealStatus.ANALYZED,
        createdAt: { gte: periodStart },
      },
      include: { components: true },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    const hasMore = meals.length > limit;
    const results = hasMore ? meals.slice(0, limit) : meals;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    return NextResponse.json({ meals: results, nextCursor });
  } catch (err) {
    console.error("[GET /api/meals/history]", err);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
