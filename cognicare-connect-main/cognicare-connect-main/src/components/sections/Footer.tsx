import { Brain, Mail, MapPin, Phone, Twitter, Linkedin, Github } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="relative bg-deep text-primary-foreground overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-glow/40 to-transparent" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-[800px] rounded-full bg-primary-glow/10 blur-3xl" />

      <div className="container relative pt-20 pb-10">
        <div className="grid lg:grid-cols-12 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-4">
            <a href="#home" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <Brain className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
              </span>
              <span className="font-display text-2xl font-semibold tracking-tight">
                Cogni<span className="text-primary-glow">Predict</span>
              </span>
            </a>
            <p className="mt-5 text-sm leading-relaxed text-primary-foreground/65 max-w-sm">
              Predictive cognitive care for the people we love most.
              Built with empathy, secured by design, scaled by the cloud.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full glass-dark hover:bg-primary-glow/20 hover:border-primary-glow/50 transition-all"
                  aria-label="Social"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* About us */}
          <div className="lg:col-span-2">
            <h4 className="font-display text-sm font-semibold mb-5 text-primary-glow">About Us</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li><a href="#" className="hover:text-primary-glow transition-colors">Our mission</a></li>
              <li><a href="#" className="hover:text-primary-glow transition-colors">Research</a></li>
              <li><a href="#" className="hover:text-primary-glow transition-colors">Press</a></li>
              <li><a href="#" className="hover:text-primary-glow transition-colors">Careers</a></li>
            </ul>
          </div>

          {/* Schedule */}
          <div className="lg:col-span-2">
            <h4 className="font-display text-sm font-semibold mb-5 text-primary-glow">Schedule</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li><a href="#" className="hover:text-primary-glow transition-colors">Book a demo</a></li>
              <li><a href="#" className="hover:text-primary-glow transition-colors">Clinical trial</a></li>
              <li><a href="#" className="hover:text-primary-glow transition-colors">Partnership</a></li>
              <li><a href="#" className="hover:text-primary-glow transition-colors">Webinars</a></li>
            </ul>
          </div>

          {/* Quick links */}
          <div className="lg:col-span-2">
            <h4 className="font-display text-sm font-semibold mb-5 text-primary-glow">Quick Links</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li><a href="#features" className="hover:text-primary-glow transition-colors">Features</a></li>
              <li><a href="#benefits" className="hover:text-primary-glow transition-colors">Benefits</a></li>
              <li><a href="#technology" className="hover:text-primary-glow transition-colors">Technology</a></li>
              <li><a href="#" className="hover:text-primary-glow transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-2">
            <h4 className="font-display text-sm font-semibold mb-5 text-primary-glow">Get in Touch</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-primary-glow" />
                <span>hello@cognipredict.ai</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-primary-glow" />
                <span>+1 (415) 555 0142</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-primary-glow" />
                <span>San Francisco · London · Singapore</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-primary-foreground/50">
          <p>© {year} CogniPredict Health, Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-primary-glow transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary-glow transition-colors">Terms</a>
            <a href="#" className="hover:text-primary-glow transition-colors">HIPAA</a>
            <a href="#" className="hover:text-primary-glow transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
