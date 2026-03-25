import { redirect } from "next/navigation";
import { getCurrentUserWithProfile } from "@/lib/user";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserWithProfile();

  if (!user) {
    redirect("/auth/signin");
  }

  if (user.profile) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
