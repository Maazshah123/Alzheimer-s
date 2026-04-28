import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const NeuralBrainScene = lazy(() => import("@/components/NeuralBrainScene"));

const Hero = () => {
  const sceneMountRef = useRef<HTMLDivElement>(null);
  const [mount3d, setMount3d] = useState(false);

  useEffect(() => {
    const el = sceneMountRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMount3d(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="home" className="relative min-h-screen w-full overflow-hidden bg-hero">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-primary/20 blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-accent/20 blur-3xl animate-float [animation-delay:2s]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-primary-glow/20 blur-3xl animate-float [animation-delay:4s]" />
      </div>

      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />

      <div className="container relative z-10 pt-32 pb-16 lg:pt-40">
        <div className="grid lg:grid-cols-2 gap-10 items-center min-h-[calc(100vh-12rem)]">
          {/* Left: Copy */}
          <div className="order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-medium text-primary-deep mb-6 shadow-soft"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-Powered Cognitive Health
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-medium leading-[0.95] tracking-tight text-foreground"
            >
              See the mind.<br />
              <span className="text-gradient italic">Predict the future.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3 }}
              className="mt-7 text-lg lg:text-xl text-muted-foreground max-w-xl leading-relaxed"
            >
              CogniPredict fuses clinical-grade AI to
              help doctors detect cognitive decline earlier — and helps patients live
              with calm, clarity and confidence.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.5 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Button variant="hero" size="xl" className="group">
                Get Started Free
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="mt-12 flex items-center gap-8 text-sm text-muted-foreground"
            >
              <div>
                <div className="text-2xl font-display font-semibold text-foreground">98.6%</div>
                <div>Prediction accuracy</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <div className="text-2xl font-display font-semibold text-foreground">12k+</div>
                <div>Patients monitored</div>
              </div>
              <div className="h-10 w-px bg-border hidden sm:block" />
              <div className="hidden sm:block">
                <div className="text-2xl font-display font-semibold text-foreground">Protection</div>
                <div>End-to-end encrypted</div>
              </div>
            </motion.div>
          </div>

          {/* Right: 3D scene */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            ref={sceneMountRef}
            className="order-1 lg:order-2 relative h-[420px] sm:h-[520px] lg:h-[640px]"
          >
            <Suspense
              fallback={
                <div className="h-full w-full rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 animate-pulse" />
              }
            >
              {mount3d ? (
                <NeuralBrainScene className="absolute inset-0" />
              ) : (
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 animate-pulse" />
              )}
            </Suspense>
            {/* HUD overlays */}
            <div className="absolute top-6 left-6 glass rounded-2xl px-4 py-3 shadow-soft">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Neural activity</div>
              <div className="font-display text-lg text-primary-deep">Stable · 72hz</div>
            </div>
            <div className="absolute bottom-6 right-6 glass rounded-2xl px-4 py-3 shadow-soft">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">AI Confidence</div>
              <div className="font-display text-lg text-primary">98.6%</div>
            </div>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.a
          href="#features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="absolute left-1/2 -translate-x-1/2 bottom-6 flex flex-col items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Scroll to explore
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </motion.a>
      </div>
    </section>
  );
};

export default Hero;
