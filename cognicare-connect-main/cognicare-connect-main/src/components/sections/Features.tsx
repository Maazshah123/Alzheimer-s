import { motion } from "framer-motion";
import { Brain, Activity, Calendar, MessagesSquare, FileScan, Shield } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Cognitive Prediction",
    desc: "Custom ML models trained on neuroimaging and behavioral data to flag early signs years in advance.",
    accent: "from-primary to-primary-glow",
  },
  {
    icon: FileScan,
    title: "Smart Medical Records",
    desc: "Unified patient timeline — scans, notes, prescriptions and history searchable in one calm interface.",
    accent: "from-accent to-primary-glow",
  },
  {
    icon: Calendar,
    title: "Effortless Appointments",
    desc: "Patients pick a doctor and a time on a beautiful calendar. Doctors triage requests in one click.",
    accent: "from-primary-glow to-primary",
  },
  {
    icon: MessagesSquare,
    title: "Always-on Chat Assistant",
    desc: "An empathetic AI companion answers patient questions, schedules reminders and escalates when needed.",
    accent: "from-primary to-accent",
  },
  {
    icon: Activity,
    title: "Medication Reminders",
    desc: "Caregivers and patients receive gentle, personalised nudges so no dose is ever missed.",
    accent: "from-accent to-primary",
  },
  {
    icon: Shield,
    title: "End-to-End Encryption",
    desc: "Your data is protected, your privacy is our priority, and your information remains confidential.",
    accent: "from-primary-deep to-primary",
  },
];

const Features = () => {
  return (
    <section id="features" className="relative py-28 lg:py-36 bg-background">
      <div className="container">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Key features
            </span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.05] tracking-tight">
              Built for clinicians.<br />
              <span className="text-gradient italic">Designed for calm.</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              Every screen, every interaction, every animation is tuned to lower
              cognitive load — for the people who care, and the people they care for.
            </p>
          </motion.div>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="group relative rounded-3xl bg-card-soft p-7 shadow-soft hover:shadow-elevated hover:-translate-y-1 transition-all duration-500 border border-white/60"
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.accent} shadow-glow`}>
                <f.icon className="h-6 w-6 text-primary-foreground" strokeWidth={2.2} />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              <div className="absolute inset-0 rounded-3xl ring-1 ring-primary/0 group-hover:ring-primary/20 transition-all pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
