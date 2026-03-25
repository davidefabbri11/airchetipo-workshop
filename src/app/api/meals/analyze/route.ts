import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { analyzeImage, VisionAnalysisError } from "@/lib/vision/analyze";
import { searchProduct } from "@/lib/nutrition/openfoodfacts";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  // Parse multipart/form-data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File immagine mancante" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Il file deve essere un'immagine" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Il file supera il limite di 10 MB" }, { status: 400 });
  }

  // Upload to Supabase Storage
  const ext = file.type === "image/png" ? "png" : "jpg";
  const storagePath = `${user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("meals")
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[POST /api/meals/analyze] storage upload error:", uploadError);
    return NextResponse.json({ error: "Errore durante l'upload dell'immagine" }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from("meals").getPublicUrl(storagePath);
  const publicUrl = publicUrlData.publicUrl;

  // AI vision analysis
  let analysis;
  try {
    analysis = await analyzeImage(publicUrl);
  } catch (err) {
    console.error("[POST /api/meals/analyze] vision error:", err);
    const message =
      err instanceof VisionAnalysisError ? err.message : "Errore durante l'analisi AI";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Enrich with Open Food Facts
  const enrichedComponents = await Promise.all(
    analysis.components.map(async (component) => {
      const offProduct = await searchProduct(component.name);
      if (!offProduct) return { ...component, openFoodFactsId: null };

      // Use OFF data to refine per-gram values, scaled to estimated grams
      const scale = component.estimatedGrams / 100;
      return {
        name: component.name,
        estimatedGrams: component.estimatedGrams,
        calories: parseFloat((offProduct.calories * scale).toFixed(1)),
        proteins: parseFloat((offProduct.proteins * scale).toFixed(1)),
        carbs: parseFloat((offProduct.carbs * scale).toFixed(1)),
        fats: parseFloat((offProduct.fats * scale).toFixed(1)),
        openFoodFactsId: offProduct.id,
      };
    })
  );

  // Aggregate totals
  const totals = enrichedComponents.reduce(
    (acc, c) => ({
      calories: parseFloat((acc.calories + c.calories).toFixed(1)),
      proteins: parseFloat((acc.proteins + c.proteins).toFixed(1)),
      carbs: parseFloat((acc.carbs + c.carbs).toFixed(1)),
      fats: parseFloat((acc.fats + c.fats).toFixed(1)),
    }),
    { calories: 0, proteins: 0, carbs: 0, fats: 0 }
  );

  // Persist to DB
  try {
    const meal = await prisma.meal.create({
      data: {
        userId: dbUser.id,
        imageUrl: storagePath,
        status: "ANALYZED",
        analyzedAt: new Date(),
        totalCalories: totals.calories,
        totalProteins: totals.proteins,
        totalCarbs: totals.carbs,
        totalFats: totals.fats,
        components: {
          create: enrichedComponents.map((c) => ({
            name: c.name,
            estimatedGrams: c.estimatedGrams,
            calories: c.calories,
            proteins: c.proteins,
            carbs: c.carbs,
            fats: c.fats,
            openFoodFactsId: c.openFoodFactsId ?? undefined,
          })),
        },
      },
      include: { components: true },
    });

    return NextResponse.json(
      {
        meal: {
          id: meal.id,
          imageUrl: meal.imageUrl,
          analyzedAt: meal.analyzedAt,
          status: meal.status,
        },
        components: meal.components,
        totals,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/meals/analyze] db error:", err);
    // Remove orphaned file from storage to avoid accumulation of unreferenced files
    await supabase.storage.from("meals").remove([storagePath]);
    return NextResponse.json({ error: "Errore durante il salvataggio" }, { status: 500 });
  }
}
