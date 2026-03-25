import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { analyzeImage, VisionAnalysisError } from "@/lib/vision/analyze";
import {
  computeRemainingBudget,
  computeAdequacy,
  suggestFrequency,
} from "@/lib/nutrition/adequacy";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Autenticazione
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // 2. Trova l'utente nel DB con il profilo
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { profile: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  // 3. Trova il pasto verificando la proprietà
  const meal = await prisma.meal.findUnique({
    where: { id },
    include: { components: true },
  });

  if (!meal) {
    return NextResponse.json({ error: "Pasto non trovato" }, { status: 404 });
  }

  if (meal.userId !== dbUser.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  // 4. Idempotenza: se già analizzato restituisce i dati esistenti
  if (meal.status === "ANALYZED") {
    return NextResponse.json(
      {
        id: meal.id,
        status: meal.status,
        totalCalories: meal.totalCalories,
        totalProteins: meal.totalProteins,
        totalCarbs: meal.totalCarbs,
        totalFats: meal.totalFats,
        adequacy: meal.adequacy,
        consumptionFrequency: meal.consumptionFrequency,
        remainingBudgetAtAnalysis: meal.remainingBudgetAtAnalysis,
        components: meal.components,
        analyzedAt: meal.analyzedAt,
      },
      { status: 200 }
    );
  }

  // 5. Analisi AI dell'immagine
  let analysisResult;
  try {
    analysisResult = await analyzeImage(meal.imageUrl);
  } catch (err) {
    if (err instanceof VisionAnalysisError) {
      return NextResponse.json(
        { error: err.message },
        { status: 422 }
      );
    }
    console.error("[POST /api/meals/[id]/analyze] analyzeImage error", err);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }

  const { components } = analysisResult;

  // 6. Calcola i totali
  const totalCalories = components.reduce((sum, c) => sum + c.calories, 0);
  const totalProteins = components.reduce((sum, c) => sum + c.proteins, 0);
  const totalCarbs = components.reduce((sum, c) => sum + c.carbs, 0);
  const totalFats = components.reduce((sum, c) => sum + c.fats, 0);

  // 7. Calcola adequacy PRIMA della transazione (read-only, non compromette l'atomicità)
  const profile = dbUser.profile;
  let adequacy: import("@prisma/client").AdequacyLevel | null = null;
  let consumptionFrequency: string | null = null;
  let remainingBudgetAtAnalysis: number | null = null;

  if (profile?.targetCalories != null) {
    try {
      const remainingBudget = await computeRemainingBudget(
        dbUser.id,
        id,
        profile.targetCalories
      );
      adequacy = computeAdequacy(totalCalories, remainingBudget);
      consumptionFrequency = suggestFrequency(totalCalories, profile.goal);
      remainingBudgetAtAnalysis = remainingBudget;
    } catch (err) {
      console.error("[POST /api/meals/[id]/analyze] adequacy calc error", err);
      // adequacy rimane null — non blocca la transazione
    }
  }

  // 8. Salva tutto in un'unica transazione atomica
  const analyzedAt = new Date();
  try {
    await prisma.$transaction([
      prisma.mealComponent.createMany({
        data: components.map((c) => ({
          mealId: id,
          name: c.name,
          estimatedGrams: c.estimatedGrams,
          calories: c.calories,
          proteins: c.proteins,
          carbs: c.carbs,
          fats: c.fats,
        })),
      }),
      prisma.meal.update({
        where: { id },
        data: {
          status: "ANALYZED",
          analyzedAt,
          totalCalories,
          totalProteins,
          totalCarbs,
          totalFats,
          adequacy,
          consumptionFrequency,
          remainingBudgetAtAnalysis,
        },
      }),
    ]);
  } catch (err) {
    console.error("[POST /api/meals/[id]/analyze] transaction error", err);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }

  return NextResponse.json(
    {
      id,
      status: "ANALYZED",
      totalCalories,
      totalProteins,
      totalCarbs,
      totalFats,
      adequacy: adequacy ?? null,
      consumptionFrequency: consumptionFrequency ?? null,
      remainingBudgetAtAnalysis: remainingBudgetAtAnalysis ?? null,
      components: components.map((c) => ({ ...c, mealId: id })),
      analyzedAt,
    },
    { status: 200 }
  );
}
