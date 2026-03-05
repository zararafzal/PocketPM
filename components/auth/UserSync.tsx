"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Silently upserts the current Clerk user into Convex on every authenticated load.
 * Rendered inside the authenticated layout — no UI output.
 */
export function UserSync() {
  const { user, isLoaded } = useUser();
  const upsertUser = useMutation(api.users.upsertUser);

  useEffect(() => {
    if (!isLoaded || !user) return;

    upsertUser({
      clerkId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      name: user.fullName ?? user.firstName ?? "Unknown",
    }).catch(console.error);
  }, [isLoaded, user, upsertUser]);

  return null;
}
