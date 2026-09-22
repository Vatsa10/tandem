import { eq, sql } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { categories, meetings } from "@/lib/db/schema";

export async function GET() {
  const userId = await getCurrentUserId();

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      meetingCount: sql<number>`count(${meetings.id})`.mapWith(Number),
    })
    .from(categories)
    .leftJoin(meetings, eq(meetings.categoryId, categories.id))
    .where(eq(categories.userId, userId))
    .groupBy(categories.id)
    .orderBy(categories.name);

  return Response.json({ categories: rows });
}

export async function POST(request: Request) {
  const { name } = await request.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const userId = await getCurrentUserId();

  const [category] = await db
    .insert(categories)
    .values({ userId, name: name.trim() })
    .returning();

  return Response.json({ category }, { status: 201 });
}
