"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { IconNav } from "@/components/layout/IconNav";
import { AIPanel } from "@/components/layout/AIPanel";
import { UserSync } from "@/components/auth/UserSync";
import { ProjectPageClient } from "@/components/projects/ProjectPageClient";

interface ProjectPageProps {
  params: { id: string };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const userData = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );
  const workspaceId = userData?.workspace?._id as Id<"workspaces"> | undefined;

  return (
    <>
      <UserSync />
      <IconNav />
      <main
        className="flex flex-col min-h-screen"
        style={{
          marginLeft: "var(--nav-width)",
          marginRight: "var(--ai-panel-width)",
          background: "var(--color-background)",
        }}
      >
        <ProjectPageClient projectId={params.id} />
      </main>
      <AIPanel context="project" workspaceId={workspaceId} />
    </>
  );
}
