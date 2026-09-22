import { db } from "./client";
import { users } from "./schema";

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? "kadamabhi1881@gmail.com";

  const [user] = await db
    .insert(users)
    .values({ email })
    .onConflictDoNothing({ target: users.email })
    .returning();

  console.log(user ?? `User with email ${email} already exists.`);
}

main();
