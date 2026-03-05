import { SignIn } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 p-6"
      style={{ background: "var(--color-background)" }}
    >
      {/* Brand */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--color-primary)" }}
        >
          <Sparkles size={22} color="#fff" />
        </div>
        <div className="text-center">
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            PM Copilot
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            AI-native project management
          </p>
        </div>
      </div>

      {/* Clerk sign-in component */}
      <SignIn
        appearance={{
          variables: {
            colorBackground: "#1C1F26",
            colorInputBackground: "#0F1117",
            colorInputText: "#F0F0F0",
            colorText: "#F0F0F0",
            colorTextSecondary: "#8B8F9A",
            colorPrimary: "#6E56CF",
            colorDanger: "#F2453D",
            borderRadius: "10px",
            fontFamily: "DM Sans, sans-serif",
            fontSize: "14px",
          },
          elements: {
            card: {
              background: "#1C1F26",
              border: "1px solid #2A2D35",
              boxShadow: "none",
            },
            headerTitle: { color: "#F0F0F0" },
            headerSubtitle: { color: "#8B8F9A" },
            formButtonPrimary: {
              background: "#6E56CF",
              "&:hover": { background: "#7D67D6" },
            },
            footerActionLink: { color: "#9D7FEA" },
            identityPreviewText: { color: "#F0F0F0" },
            formFieldLabel: { color: "#8B8F9A" },
          },
        }}
      />
    </div>
  );
}
