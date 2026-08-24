import React from "react";
import { Link } from "react-router-dom";
import { Github, ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-[#090a0d] z-10 text-xs text-[#7e8796]">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <img
                src="/crux-logo.png"
                alt="Crux Logo"
                className="w-6 h-6 object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <span className="font-bold text-lg text-[#f0f2f5]">Crux</span>
            </Link>
            <p className="text-xs text-[#8e97a5] leading-relaxed max-w-sm mb-4">
              Unified real-time developer collaboration platform. Collapsing PR reviews, task management,
              and team communication into an intelligent cockpit.
            </p>
            <div className="flex items-center gap-3 text-[#9aa2ae]">
              <a
                href="https://github.com/cruxdev/crux"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-[#12141a] border border-white/[0.06] hover:text-white transition-colors"
                aria-label="Crux on GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <div className="font-semibold text-[#f0f2f5] mb-3 font-sans">Product</div>
            <ul className="space-y-2">
              <li>
                <Link to="/cockpit" className="hover:text-[#f0f2f5] transition-colors">
                  Full Cockpit
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-[#f0f2f5] transition-colors">
                  AI Reviewer Briefs
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#f0f2f5] transition-colors">
                  Instant Sandbox
                </a>
              </li>
              <li>
                <a href="#integrations" className="hover:text-[#f0f2f5] transition-colors">
                  Ecosystem
                </a>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <div className="font-semibold text-[#f0f2f5] mb-3 font-sans">Documentation</div>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-[#f0f2f5] transition-colors">
                  Getting Started
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#f0f2f5] transition-colors">
                  Self-Hosting Guide
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#f0f2f5] transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#f0f2f5] transition-colors">
                  Security Architecture
                </a>
              </li>
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <div className="font-semibold text-[#f0f2f5] mb-3 font-sans">Community</div>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/cruxdev/crux"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#f0f2f5] transition-colors flex items-center gap-1"
                >
                  <span>GitHub Repository</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#f0f2f5] transition-colors">
                  Changelog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#f0f2f5] transition-colors">
                  Roadmap
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#f0f2f5] transition-colors">
                  MIT License
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#656d7b]">
          <div>© {new Date().getFullYear()} Crux Platform. All rights reserved. Open source under MIT.</div>
          <div className="flex items-center gap-4 font-mono">
            <span>v2.4.0-beta</span>
            <span>•</span>
            <span>Status: All systems operational</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
