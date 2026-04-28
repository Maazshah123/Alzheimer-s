import { motion } from "framer-motion";
import { Cpu, Cloud, Lock, Network, Database, Layers } from "lucide-react";

const stack = [
  { icon: Cpu, title: "AI & Machine Learning", desc: "Federated deep-learning models for cognitive pattern detection.", tag: "Core" },
  { icon: Cloud, title: "Elastic Cloud Infrastructure", desc: "Global edge regions ensure sub-50ms response anywhere on Earth.", tag: "Scale" },
  { icon: Lock, title: "Zero-trust Encryption", desc: "AES-256 at rest, TLS 1.3 in transit. Patient keys never leave the device.", tag: "Security" },
  { icon: Network, title: "AR / VR Visualisation", desc: "WebXR-ready 3D brain mapping for immersive consultations.", tag: "Immersive" },
  { icon: Database, title: "FHIR-compliant Data", desc: "Interoperable with hospital EHR systems out of the box.", tag: "Standards" },
  { icon: Layers, title: "Privacy by Design", desc: "Differential privacy and on-device inference where it counts.", tag: "Ethical" },
];

const Technology = () => {
  return (
    <section id="technology" className="relative py-28 lg:py-36 bg-deep text-primary-foreground overflow-hidden">
      {/* Animated grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary-glow)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-glow)) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary-glow/20 blur-3xl" />

      <div className="container relative">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-glow">
              Technology stack
            </span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.05] tracking-tight">
              Engineered for <span className="text-primary-glow italic">trust.</span><br />
              Crafted for <span className="italic">care.</span>
            </h2>
            <p className="mt-6 text-lg text-primary-foreground/70 max-w-2xl">
              A modern, secure architecture built around three principles:
              clinical accuracy, patient privacy and human-first design.
            </p>
          </motion.div>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stack.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.06 }}
              className="group relative rounded-3xl glass-dark p-7 hover:bg-white/5 transition-all duration-500 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-6">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                  <s.icon className="h-6 w-6 text-primary-foreground" strokeWidth={2.2} />
                </span>
                <span className="text-[10px] uppercase tracking-wider text-primary-glow/80 px-2 py-1 rounded-full border border-primary-glow/30">
                  {s.tag}
                </span>
              </div>
              <h3 className="font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-primary-foreground/65">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Technology;
