import { Link, useLocation } from "wouter";
import { Shield, Menu, X, Phone, User, LogIn, Facebook, Instagram } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logoImage from "@assets/FullLogo_NoBuffer_1765525677801.png";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navLinks = [
    { href: "/auto", label: "Auto" },
    { href: "/home-insurance", label: "Home" },
    { href: "/tenant", label: "Tenant" },
    { href: "/travel", label: "Travel" },
    { href: "/life", label: "Life" },
    { href: "/business", label: "Business" },
    { href: "/pet", label: "Pet" },
    { href: "/compare", label: "Compare" },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background text-foreground">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-2 px-4 text-sm hidden md:flex justify-between items-center">
        <div className="container mx-auto max-w-7xl flex justify-between">
          <span className="opacity-90">Serving Ontario Residents Since 2016</span>
          <div className="flex gap-6">
            <a href="tel:1-877-253-2695" className="flex items-center gap-2 hover:text-accent transition-colors">
              <Phone size={14} /> 1-877-253-2695
            </a>
            <Link href="/dashboard" className="flex items-center gap-2 hover:text-accent transition-colors">
               Broker Login
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-7xl flex h-20 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 group">
              <div className="h-12 w-auto overflow-hidden rounded-lg">
                <img src={logoImage} alt="QuoteUs Logo" className="h-full w-auto object-contain" />
              </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`text-sm font-medium transition-colors hover:text-accent ${
                  location === link.href ? "text-accent font-semibold" : "text-foreground/80"
                }`}>
                  {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="gap-2">
                <User size={16} /> My Account
              </Button>
            </Link>
            <Link href="/auto">
              <Button className="bg-accent hover:bg-accent/90 text-white shadow-md">
                Get a Quote
              </Button>
            </Link>
          </div>

          {/* Mobile Nav */}
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-6 mt-10">
                {navLinks.map((link) => (
                  <Link 
                      key={link.href} 
                      href={link.href}
                      className="text-lg font-medium hover:text-accent transition-colors block py-2 border-b border-border/50"
                      onClick={() => setIsMobileOpen(false)}
                  >
                      {link.label}
                  </Link>
                ))}
                <div className="flex flex-col gap-3 mt-4">
                  <Link href="/profile" onClick={() => setIsMobileOpen(false)}>
                     <Button variant="outline" className="w-full justify-start gap-2">
                       <User size={16} /> My Account
                     </Button>
                  </Link>
                  <Link href="/auto" onClick={() => setIsMobileOpen(false)}>
                    <Button className="w-full bg-accent hover:bg-accent/90 text-white">
                      Get a Quote
                    </Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground pt-16 pb-8">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                 <Shield className="h-6 w-6 text-accent" />
                 <span className="text-xl font-serif font-bold">QuoteUs.ca</span>
              </div>
              <p className="text-primary-foreground/70 text-sm leading-relaxed">
                Helping Ontarians save on insurance since 2016. We connect you with top rated brokers to find the best coverage for your needs.
              </p>
            </div>
            
            <div>
              <h4 className="font-serif font-bold text-lg mb-4 text-white">Insurance</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/70">
                <li><Link href="/auto" className="hover:text-white transition-colors">Auto Insurance</Link></li>
                <li><Link href="/home-insurance" className="hover:text-white transition-colors">Home Insurance</Link></li>
                <li><Link href="/tenant" className="hover:text-white transition-colors">Tenant Insurance</Link></li>
                <li><Link href="/business" className="hover:text-white transition-colors">Business Insurance</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-serif font-bold text-lg mb-4 text-white">Company</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/70">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Broker CRM</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-serif font-bold text-lg mb-4 text-white">Contact</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/70">
                <li className="flex items-center gap-2"><Phone size={14} /> 1-877-253-2695</li>
                <li>Toronto, Ontario</li>
                <li>info@quoteus.ca</li>
              </ul>
              <div className="flex gap-4 mt-6">
                <a href="https://www.facebook.com/people/QuoteUsca/100064074608534/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-accent transition-colors">
                  <Facebook size={20} />
                </a>
                <a href="https://www.instagram.com/quoteus.ca/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-accent transition-colors">
                  <Instagram size={20} />
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-primary-foreground/10 pt-8 text-center text-xs text-primary-foreground/50">
            <p>&copy; 2025 QuoteUs.ca. All rights reserved.</p>
            <p className="mt-2 text-primary-foreground/30">Compliant Ontario Canada Privacy Statement Included.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
