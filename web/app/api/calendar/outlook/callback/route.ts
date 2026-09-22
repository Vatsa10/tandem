import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { upsertCalendarConnection } from "@/lib/db/calendar-connections";
import { env } from "@/lib/env";
import { createCalendar } from "@/lib/recall/client";

const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const USERINFO_URL = "https://graph.microsoft.com/oidc/userinfo";

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

function redirectWithError(requestUrl: string, message: string) {
  const target = new URL("/settings/calendar", requestUrl);
  target.searchParams.set("error", message);
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("outlook_oauth_state")?.value;
  cookieStore.delete("outlook_oauth_state");

  if (oauthError) {
    return redirectWithError(
      request.url,
      `Microsoft denied access: ${oauthError}`,
    );
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError(
      request.url,
      "Invalid OAuth state — please try connecting again.",
    );
  }

  const redirectUri = new URL(
    "/api/calendar/outlook/callback",
    request.url,
  ).toString();

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.MICROSOFT_OAUTH_CLIENT_ID,
      client_secret: env.MICROSOFT_OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return redirectWithError(
      request.url,
      `Microsoft token exchange failed: ${await tokenRes.text()}`,
    );
  }

  const tokens = (await tokenRes.json()) as MicrosoftTokenResponse;

  if (!tokens.refresh_token) {
    return redirectWithError(
      request.url,
      "Microsoft didn't return a refresh token — try connecting again.",
    );
  }

  let oauthEmail: string | undefined;
  try {
    const userinfoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (userinfoRes.ok) {
      const userinfo = (await userinfoRes.json()) as { email?: string };
      oauthEmail = userinfo.email;
    }
  } catch {
    // best-effort only — Recall works fine without oauth_email
  }

  const calendar = await createCalendar({
    platform: "microsoft_outlook",
    oauthClientId: env.MICROSOFT_OAUTH_CLIENT_ID,
    oauthClientSecret: env.MICROSOFT_OAUTH_CLIENT_SECRET,
    oauthRefreshToken: tokens.refresh_token,
    oauthEmail,
  });

  const userId = await getCurrentUserId();
  await upsertCalendarConnection(
    userId,
    "microsoft_outlook",
    calendar.id,
    calendar.status,
    oauthEmail,
  );

  return NextResponse.redirect(
    new URL("/settings/calendar?connected=outlook", request.url),
  );
}
