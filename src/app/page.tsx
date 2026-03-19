import Link from "next/link";
import { getCurrentUser } from "@/lib/user";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">AIRchetipo Workshop</h1>
      {user ? (
        <div className="flex flex-col items-center gap-4">
          <p>Welcome, {user.name ?? user.email}!</p>
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
            >
              Go to Dashboard
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      ) : (
        <Link
          href="/auth/signin"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
        >
          Sign In
        </Link>
      )}
    </div>
  );
}
