import dynamic from "next/dynamic";

// Dynamically imported to avoid SSR issues with Three.js / GSAP
const LandingPage = dynamic(() => import("@/components/landing/LandingPage"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1117",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "2px solid #2a2d35",
          borderTopColor: "#9d7fea",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
});

export default function RootPage() {
  return <LandingPage />;
}
