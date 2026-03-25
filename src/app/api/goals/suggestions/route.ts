import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateGoalSuggestions } from "@/lib/nutrition/goals";

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

  const suggestions = generateGoalSuggestions(dbUser.profile);

  return NextResponse.json(suggestions);
}
