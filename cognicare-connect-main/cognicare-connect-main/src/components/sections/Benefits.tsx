import { motion } from "framer-motion";
import { Heart, Smile, Users, Sparkles } from "lucide-react";

const benefits = [
  {
    icon: Smile,
    stat: "+47%",
    label: "Daily wellbeing",
    title: "Calmer days for patients",
    desc: "A soothing palette, gentle motion and predictable layouts reduce anxiety and confusion — so patients can focus on what matters.",
  },
  {
    icon: Heart,
    stat: "−62%",
    label: "Caregiver stress",
    title: "Lighter load for caregivers",
    desc: "Real-time vitals, automated reminders and shared notes mean caregivers stop juggling — and start being present.",
  },
  {
    icon: Users,
    stat: "3.2x",
    label: "Earlier intervention",
    title: "Better outcomes for families",
    desc: "Early prediction means earlier care plans, more time with loved ones, and the dignity of preparation.",
  },
];

const Benefits = () => {
  return (
    <section id="benefits" className="relative py-28 lg:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/40 to-background" />
      <div className="absolute top-1/4 -left-40 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 -right-40 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />

      <div className="container relative">
        <div className="grid lg:grid-cols-12 gap-12 items-end mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Benefits
            </span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.05] tracking-tight">
              Improved quality of life,<br />
              <span className="text-gradient italic">measured in moments.</span>
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-5 text-lg text-muted-foreground"
          >
            Cognitive care isn't only about data. It's about hours of peace, fewer
            late-night worries, and more good mornings.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <motion.article
              key={b.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-[2rem] bg-card p-8 shadow-soft hover:shadow-elevated transition-all duration-500 border border-border/50 overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/5 group-hover:bg-primary/10 transition" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <b.icon className="h-6 w-6" strokeWidth={2.2} />
                  </span>
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
                <div className="mt-8">
                  <div className="font-display text-5xl font-semibold text-gradient leading-none">
                    {b.stat}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {b.label}
                  </div>
                </div>
                <h3 className="mt-6 font-display text-2xl font-medium">{b.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
