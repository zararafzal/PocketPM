import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

export async function GET() {
  // Clerk v6: auth() is async in route handlers
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = randomBytes(32).toString("hex");

  const cookieStore = cookies();
  cookieStore.set("jira_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: process.env.JIRA_CLIENT_ID!,
    scope: "read:jira-work read:jira-user offline_access",
    redirect_uri: process.env.JIRA_REDIRECT_URI!,
    state,
    response_type: "code",
    prompt: "consent",
  });

  const authUrl = `https://auth.atlassian.com/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
