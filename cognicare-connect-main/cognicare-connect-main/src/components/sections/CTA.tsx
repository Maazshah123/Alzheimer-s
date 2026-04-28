import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CTA = () => {
  return (
    <section id="about" className="relative py-28 lg:py-36">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-primary p-10 sm:p-16 lg:p-20 shadow-elevated"
        >
          {/* Decorative orbs */}
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 text-primary-foreground">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-medium backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Join the early-access programme
              </div>
              <h2 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.05] tracking-tight">
                Care that thinks<br />
                <span className="italic">ahead of time.</span>
              </h2>
              <p className="mt-6 text-lg text-primary-foreground/85 max-w-xl">
                Be among the first clinics and families to experience
                cognitive care reimagined. Free for the first 90 days.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-3">
              <Button asChild variant="glass" size="xl" className="w-full justify-between text-foreground">
                <Link to="/signup">
                  Sign up as Doctor
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="glass" size="xl" className="w-full justify-between text-foreground">
                <Link to="/signup">
                  Sign up as Patient
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <p className="text-center text-xs text-primary-foreground/70 mt-2">
                Already with us?{" "}
                <Link className="underline underline-offset-4 hover:text-white" to="/login">
                  Login here
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
