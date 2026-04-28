import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const AuthShell = ({ title, subtitle, children, footer }: Props) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative container py-10 lg:py-16">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Brain className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            Cogni<span className="text-primary">Predict</span>
          </span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-10 w-full max-w-xl glass rounded-3xl p-8 sm:p-10 shadow-elevated"
        >
          <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight">
            {title}
          </h1>
          {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-center text-muted-foreground">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
};

export default AuthShell;
