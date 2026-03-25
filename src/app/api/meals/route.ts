import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { mealCreateSchema } from "@/lib/validations/meal";

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body JSON non valido" },
      { status: 400 }
    );
  }

  const result = mealCreateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const meal = await prisma.meal.create({
      data: {
        userId: dbUser.id,
        imageUrl: result.data.imageUrl,
      },
    });
    return NextResponse.json(meal, { status: 201 });
  } catch (err) {
    console.error("[POST /api/meals]", err);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
