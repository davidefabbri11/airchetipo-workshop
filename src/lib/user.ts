import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User, Profile } from "@prisma/client";

async function upsertCurrentUser<T extends boolean>(
  includeProfile: T
): Promise<
  T extends true ? (User & { profile: Profile | null }) | null : User | null
> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  return prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: {
      email: authUser.email!,
      name:
        authUser.user_metadata?.full_name ??
        authUser.user_metadata?.name ??
        null,
      image: authUser.user_metadata?.avatar_url ?? null,
    },
    create: {
      supabaseId: authUser.id,
      email: authUser.email!,
      name:
        authUser.user_metadata?.full_name ??
        authUser.user_metadata?.name ??
        null,
      image: authUser.user_metadata?.avatar_url ?? null,
    },
    ...(includeProfile ? { include: { profile: true } } : {}),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

export async function getCurrentUser(): Promise<User | null> {
  return upsertCurrentUser(false);
}

export async function getCurrentUserWithProfile(): Promise<
  (User & { profile: Profile | null }) | null
> {
  return upsertCurrentUser(true);
}
