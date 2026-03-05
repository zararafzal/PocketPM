import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { SlashCommandProvider } from "@/components/slash/SlashCommandContext";
import { SlashCommandBar } from "@/components/slash/SlashCommandBar";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "PM Copilot — AI-Native Project Management",
  description:
    "The AI copilot that lives inside Jira — surfaces risks, rewrites tickets, and drafts updates before you ask.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body className="bg-background text-text-primary font-sans antialiased">
        <ClerkProvider>
          <ConvexClientProvider>
            {/* SlashCommandProvider wraps the entire app so /projects pages
                can call useSlashCommand() without a missing-context crash */}
            <SlashCommandProvider>
              {children}
              <SlashCommandBar />
            </SlashCommandProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
