import { Link, useLocation } from "wouter";
import { Shield, Menu, X, Phone, Facebook, Instagram, Twitter, Linkedin, Youtube, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logoImage from "@assets/FullLogo_Transparent_1769748805647.png";

interface SocialMedia {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [socialMedia, setSocialMedia] = useState<SocialMedia>({
    facebook: "",
    instagram: "",
    twitter: "",
    linkedin: "",
    youtube: "",
    tiktok: "",
  });
  const [customCss, setCustomCss] = useState("");
  
  // Contact Form State
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactCategory, setContactCategory] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings/social-media")
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setSocialMedia(data);
        }
      })
      .catch(console.error);
    
    fetch("/api/settings/custom-css")
      .then(r => r.json())
      .then(data => {
        if (data && data.value) {
          setCustomCss(data.value);
        }
      })
      .catch(console.error);
  }, []);

  const navLinks = [
    { href: "/auto", label: "Auto" },
    { href: "/home-insurance", label: "Home" },
    { href: "/tenant", label: "Tenant" },
    { href: "/travel", label: "Travel" },
    { href: "/life", label: "Life" },
    { href: "/business", label: "Business" },
    { href: "/pet", label: "Pet" },
    { href: "/mortgage", label: "Mortgage" },
    { href: "/compare", label: "Compare" },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background text-foreground">
      {/* Custom CSS Injection */}
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-2 px-4 text-sm hidden md:flex justify-between items-center">
        <div className="container mx-auto max-w-7xl flex justify-between">
          <span className="opacity-90">Serving Ontario Residents Since 2016</span>
          <div className="flex gap-6">
            <a href="tel:1-877-253-2695" className="flex items-center gap-2 hover:text-accent transition-colors">
              <Phone size={14} /> 1-877-253-2695
            </a>
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
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Broker Login</Link></li>
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
                {socialMedia.facebook && (
                  <a href={socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-white hover:text-accent transition-colors" data-testid="social-facebook">
                    <Facebook size={20} />
                  </a>
                )}
                {socialMedia.instagram && (
                  <a href={socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-white hover:text-accent transition-colors" data-testid="social-instagram">
                    <Instagram size={20} />
                  </a>
                )}
                {socialMedia.twitter && (
                  <a href={socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-white hover:text-accent transition-colors" data-testid="social-twitter">
                    <Twitter size={20} />
                  </a>
                )}
                {socialMedia.linkedin && (
                  <a href={socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="text-white hover:text-accent transition-colors" data-testid="social-linkedin">
                    <Linkedin size={20} />
                  </a>
                )}
                {socialMedia.youtube && (
                  <a href={socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="text-white hover:text-accent transition-colors" data-testid="social-youtube">
                    <Youtube size={20} />
                  </a>
                )}
                {socialMedia.tiktok && (
                  <a href={socialMedia.tiktok} target="_blank" rel="noopener noreferrer" className="text-white hover:text-accent transition-colors" data-testid="social-tiktok">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
          
          {/* Contact Form */}
          <div className="border-t border-primary-foreground/10 pt-8 mt-8">
            <h4 className="font-serif font-bold text-lg mb-4 text-white text-center">Contact Us</h4>
            {contactSuccess ? (
              <div className="text-center py-4 text-green-400">
                <p>Thank you for your message! We'll get back to you soon.</p>
              </div>
            ) : (
              <form 
                className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!contactName || !contactEmail || !contactCategory || !contactMessage) return;
                  setContactSubmitting(true);
                  try {
                    const res = await fetch("/api/contact", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: contactName,
                        email: contactEmail,
                        category: contactCategory,
                        message: contactMessage,
                      }),
                    });
                    if (res.ok) {
                      setContactSuccess(true);
                      setContactName("");
                      setContactEmail("");
                      setContactCategory("");
                      setContactMessage("");
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setContactSubmitting(false);
                  }
                }}
              >
                <div>
                  <Input
                    placeholder="Your Name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    className="bg-primary-foreground/10 border-primary-foreground/20 text-white placeholder:text-primary-foreground/50"
                    data-testid="input-contact-name"
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Your Email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                    className="bg-primary-foreground/10 border-primary-foreground/20 text-white placeholder:text-primary-foreground/50"
                    data-testid="input-contact-email"
                  />
                </div>
                <div className="md:col-span-2">
                  <Select value={contactCategory} onValueChange={setContactCategory}>
                    <SelectTrigger className="bg-primary-foreground/10 border-primary-foreground/20 text-white" data-testid="select-contact-category">
                      <SelectValue placeholder="Select a Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto Insurance</SelectItem>
                      <SelectItem value="home">Home Insurance</SelectItem>
                      <SelectItem value="tenant">Tenant Insurance</SelectItem>
                      <SelectItem value="travel">Travel Insurance</SelectItem>
                      <SelectItem value="life">Life Insurance</SelectItem>
                      <SelectItem value="business">Business Insurance</SelectItem>
                      <SelectItem value="mortgage">Mortgage</SelectItem>
                      <SelectItem value="compare">Compare Quotes</SelectItem>
                      <SelectItem value="advertisement">Advertisement Inquiry</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Textarea
                    placeholder="Your Message"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                    rows={3}
                    className="bg-primary-foreground/10 border-primary-foreground/20 text-white placeholder:text-primary-foreground/50"
                    data-testid="input-contact-message"
                  />
                </div>
                <div className="md:col-span-2 flex justify-center">
                  <Button 
                    type="submit" 
                    disabled={contactSubmitting || !contactCategory}
                    className="bg-accent hover:bg-accent/90 text-white"
                    data-testid="button-contact-submit"
                  >
                    {contactSubmitting ? "Sending..." : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
          
          <div className="border-t border-primary-foreground/10 pt-8 mt-8 text-center text-xs text-primary-foreground/50">
            <p>&copy; 2025 QuoteUs.ca. All rights reserved.</p>
            <p className="mt-2 text-primary-foreground/30">Compliant Ontario Canada Privacy Statement Included.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
