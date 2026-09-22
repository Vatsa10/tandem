import { and, eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";

export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/categories/[id]">,
) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const [deleted] = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();

  if (!deleted) {
    return Response.json({ error: "Category not found" }, { status: 404 });
  }

  return Response.json({ deleted: true });
}
