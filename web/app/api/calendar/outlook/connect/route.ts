import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

const MICROSOFT_AUTH_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";

// Required by Recall Calendar V2 for Outlook:
// https://docs.recall.ai/docs/calendar-v2-microsoft-outlook
const SCOPES = [
  "offline_access",
  "openid",
  "email",
  "https://graph.microsoft.com/Calendars.Read",
].join(" ");

export async function GET(request: Request) {
  const redirectUri = new URL(
    "/api/calendar/outlook/callback",
    request.url,
  ).toString();
  const state = randomBytes(16).toString("hex");

  const authUrl = new URL(MICROSOFT_AUTH_URL);
  authUrl.searchParams.set("client_id", env.MICROSOFT_OAUTH_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("response_mode", "query");
  // Force the account picker so connecting a second account doesn't just
  // silently re-auth whichever account is already signed in.
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("outlook_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
