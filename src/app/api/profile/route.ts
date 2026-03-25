import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validations/profile";
import { selectedGoalSchema } from "@/lib/validations/goals";

export async function GET() {
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

  if (!dbUser?.profile) {
    return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
  }

  return NextResponse.json(dbUser.profile);
}

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
    include: { profile: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  if (dbUser.profile) {
    return NextResponse.json(
      { error: "Profilo già esistente" },
      { status: 409 }
    );
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
  const result = profileSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const profile = await prisma.profile.create({
    data: {
      userId: dbUser.id,
      height: result.data.height,
      weight: result.data.weight,
      age: result.data.age,
      activityLevel: result.data.activityLevel,
      goal: result.data.goal,
      cuisines: result.data.cuisines,
    },
  });

  return NextResponse.json(profile, { status: 201 });
}

const patchProfileSchema = profileSchema
  .merge(selectedGoalSchema)
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Almeno un campo è richiesto");

export async function PATCH(request: Request) {
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

  if (!dbUser?.profile) {
    return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
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

  const result = patchProfileSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updatedProfile = await prisma.profile.update({
    where: { userId: dbUser.id },
    data: result.data,
  });

  return NextResponse.json(updatedProfile);
}
