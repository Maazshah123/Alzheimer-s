import { lazy, Suspense, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import useLenis from "@/hooks/useLenis";

const BelowFold = lazy(() => import("@/components/sections/BelowFold"));

const Index = () => {
  useLenis();

  useEffect(() => {
    document.title = "CogniPredict — AI-Powered Cognitive Health & Predictive Care";
    const desc =
      "CogniPredict fuses immersive 3D AR/VR visualisation with clinical-grade AI to detect cognitive decline early and bring calm, confident care to patients and doctors.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <Suspense
        fallback={
          <div className="min-h-[50vh] bg-background" aria-busy>
            <div className="container py-24 space-y-6">
              <div className="h-10 w-1/3 max-w-xs rounded-lg bg-muted/50 animate-pulse" />
              <div className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
              <div className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
            </div>
          </div>
        }
      >
        <BelowFold />
      </Suspense>
    </main>
  );
};

export default Index;
