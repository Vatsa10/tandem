import { clerkMiddleware } from "@clerk/nextjs/server";

// No auth logic here on purpose — Clerk now recommends resource-based auth
// checks (see lib/auth.ts's getCurrentUserId, which every protected page/
// route already calls) over middleware path-matching, since path matchers
// can drift from actual route structure and leave things unintentionally
// exposed. This file still has to exist for Clerk's session handling to
// work at all.
export default clerkMiddleware();

// `/agent/*` and `/api/agent/*` are excluded deliberately: Recall's browser
// loads the agent page with no cookies and no Clerk session, and those
// routes authenticate with an opaque per-meeting token instead (see
// lib/agent/sessions.ts). Routing them through Clerk gains nothing and
// would break the bot the moment anyone adds auth.protect() here.
export const config = {
  matcher: [
    "/((?!agent|api/agent|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/api(?!/agent)(.*)",
    "/trpc(.*)",
  ],
};
