import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { encrypt } from "@/lib/encryption";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  // Clerk v6: auth() is async in route handlers
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("Jira OAuth error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=jira_denied", request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard?error=jira_invalid", request.url)
    );
  }

  const cookieStore = cookies();
  const savedState = cookieStore.get("jira_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      new URL("/dashboard?error=jira_csrf", request.url)
    );
  }

  cookieStore.delete("jira_oauth_state");

  try {
    const tokenRes = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        code,
        redirect_uri: process.env.JIRA_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Token exchange failed:", err);
      return NextResponse.redirect(
        new URL("/dashboard?error=jira_token_failed", request.url)
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;

    const resourcesRes = await fetch(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!resourcesRes.ok) {
      throw new Error("Failed to fetch Jira accessible resources");
    }

    const resources = await resourcesRes.json();
    if (!resources.length) {
      return NextResponse.redirect(
        new URL("/dashboard?error=jira_no_sites", request.url)
      );
    }

    const site = resources[0];
    const cloudId: string = site.id;
    const siteUrl: string = site.url;

    const encryptedToken = encrypt(accessToken);

    const convexToken = await getToken({ template: "convex" });
    if (!convexToken) throw new Error("Could not get Convex auth token");
    convex.setAuth(convexToken);

    await convex.mutation(api.workspaces.updateJiraConnection, {
      clerkId: userId,
      cloudId,
      siteUrl,
      encryptedToken,
    });

    convex.action(api.jira.syncJiraProjects, { clerkId: userId }).catch(
      (e) => console.error("Initial sync failed:", e)
    );

    return NextResponse.redirect(new URL("/dashboard?connected=1", request.url));
  } catch (err) {
    console.error("Jira OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/dashboard?error=jira_error", request.url)
    );
  }
}
