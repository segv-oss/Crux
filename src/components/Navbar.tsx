import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Github, Terminal, Menu, X } from "lucide-react";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Cockpit", href: "/cockpit" },
    { label: "Capabilities", href: "#features" },
    { label: "Workflow", href: "#how-it-works" },
    { label: "Ecosystem", href: "#integrations" },
    { label: "Comparison", href: "#comparison" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#0f1116]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_12px_30px_rgba(0,0,0,0.5)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
        {/* Brand Logo & Wordmark */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/crux-logo.png"
            alt="Crux Logo"
            className="w-7 h-7 object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="font-bold text-xl tracking-tight text-[#f0f2f5] font-sans">
            Crux
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 bg-[#14171d]/80 border border-white/[0.07] px-4 py-1.5 rounded-full shadow-inner">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs font-medium text-[#9aa2ae] hover:text-[#f0f2f5] px-3 py-1.5 rounded-full transition-colors duration-200 hover:bg-white/[0.04]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://github.com/cruxdev/crux"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs font-medium text-[#9aa2ae] hover:text-[#f0f2f5] bg-[#14171d] hover:bg-[#1c2028] border border-white/[0.08] px-3.5 py-2 rounded-lg transition-all duration-200"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>

          <Link
            to="/cockpit"
            className="flex items-center gap-2 text-xs font-medium text-[#0c0d10] bg-[#e6eaf0] hover:bg-white px-4 py-2 rounded-lg transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] active:scale-[0.98]"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Launch Cockpit</span>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-[#14171d] border border-white/[0.08] text-[#9aa2ae]"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#111318]/95 border-b border-white/[0.08] px-6 py-5 backdrop-blur-2xl">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-[#9aa2ae] hover:text-[#f0f2f5] py-2"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2.5">
              <Link
                to="/cockpit"
                className="w-full text-center text-xs font-medium text-[#0c0d10] bg-[#e6eaf0] py-2.5 rounded-lg"
              >
                Launch Cockpit
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

