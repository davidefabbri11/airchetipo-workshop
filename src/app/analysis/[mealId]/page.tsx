import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AnalysisView } from "./analysis-view";

interface PageProps {
  params: Promise<{ mealId: string }>;
}

export default async function AnalysisPage({ params }: PageProps) {
  const { mealId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signin");

  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    include: { components: true },
  });

  if (!meal) redirect("/dashboard");

  // Only the owner can view the meal
  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser || meal.userId !== dbUser.id) redirect("/dashboard");

  const { data: imageData } = supabase.storage.from("meals").getPublicUrl(meal.imageUrl);
  const imagePublicUrl = imageData.publicUrl;

  return <AnalysisView meal={meal} imagePublicUrl={imagePublicUrl} />;
}
