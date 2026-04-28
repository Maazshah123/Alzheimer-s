import { useEffect, useState } from "react";
import { Menu, X, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Benefits", href: "#benefits" },
  { label: "Technology", href: "#technology" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-500",
        scrolled ? "py-3" : "py-5"
      )}
    >
      <div className="container">
        <nav
          className={cn(
            "flex items-center justify-between rounded-full px-4 md:px-6 py-3 transition-all duration-500",
            scrolled ? "glass shadow-soft" : "bg-transparent"
          )}
        >
          <a href="#home" className="flex items-center gap-2.5 group">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Brain className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
              <span className="absolute inset-0 rounded-xl animate-pulse-glow" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">
              Cogni<span className="text-primary">Predict</span>
            </span>
          </a>

          <div className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-4 py-2 text-sm font-medium text-foreground/75 hover:text-primary transition-colors relative group"
              >
                {l.label}
                <span className="absolute left-4 right-4 -bottom-0.5 h-px scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100 origin-left" />
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-full font-medium">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild variant="hero" size="sm" className="rounded-full">
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg hover:bg-muted"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {open && (
          <div className="md:hidden mt-3 glass rounded-3xl p-5 animate-fade-up shadow-soft">
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 text-sm font-medium rounded-xl hover:bg-muted"
                >
                  {l.label}
                </a>
              ))}
              <div className="flex gap-2 pt-3 mt-2 border-t border-border">
                <Button asChild variant="ghost" className="flex-1 rounded-full"><Link to="/login">Login</Link></Button>
                <Button asChild variant="hero" className="flex-1 rounded-full"><Link to="/signup">Sign Up</Link></Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
