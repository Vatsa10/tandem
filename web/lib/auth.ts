import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

// The enforcement point: every protected page/route calls this, and
// auth.protect() is what actually redirects/401s unauthenticated requests
// (resource-based checks — see proxy.ts for why this isn't in middleware).
export async function getCurrentUserId(): Promise<string> {
  const { userId: clerkUserId } = await auth.protect();

  const [byClerkId] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId));
  if (byClerkId) return byClerkId.id;

  // First request from this Clerk account. If a pre-auth row already
  // exists with a matching email (e.g. the Phase 1 seeded user), link it
  // instead of creating a duplicate — preserves its existing meetings.
  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;

  if (email) {
    const [byEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (byEmail) {
      await db
        .update(users)
        .set({ clerkUserId })
        .where(eq(users.id, byEmail.id));
      return byEmail.id;
    }
  }

  const [created] = await db
    .insert(users)
    .values({ email: email ?? `${clerkUserId}@unknown.local`, clerkUserId })
    .returning({ id: users.id });
  return created.id;
}
