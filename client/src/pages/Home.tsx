import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Home, Briefcase, Plane, Heart, Dog, Building2, ChevronRight, CheckCircle2, ShieldCheck, DollarSign, Landmark, KeyRound } from "lucide-react";
import heroImage from "@assets/Lucid_Origin_PromptThree_young_adults_ages_2138_standing_backt_1765553789903.jpg";

export default function HomePage() {
  const products = [
    { icon: Car, label: "Auto", href: "/auto", desc: "Compare rates for G1, G2 & G drivers" },
    { icon: Home, label: "Home", href: "/home-insurance", desc: "Protect your biggest investment" },
    { icon: Building2, label: "Tenant", href: "/tenant", desc: "Affordable renters coverage" },
    { icon: Plane, label: "Travel", href: "/travel", desc: "Medical & trip cancellation" },
    { icon: Heart, label: "Life", href: "/life", desc: "Secure your family's future" },
    { icon: Briefcase, label: "Business", href: "/business", desc: "Liability & property coverage" },
    { icon: Dog, label: "Pet", href: "/pet", desc: "Health plans for cats & dogs" },
    { icon: Landmark, label: "Mortgage", href: "/mortgage", desc: "Find the best mortgage rates" },
    { icon: KeyRound, label: "Rent Guarantee", href: "/rent-guarantee", desc: "Landlord protection on rent" },
  ];

  return (
    <div className="flex flex-col gap-16 pb-20">
      {/* Hero Section */}
      <section className="relative bg-primary text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
           <img src={heroImage} alt="Happy customers looking at phone" className="w-full h-full object-cover" />
        </div>
        
        <div className="container mx-auto max-w-7xl px-4 py-24 md:py-32 relative z-10">
          <div className="max-w-2xl space-y-6 animate-in slide-in-from-left-5 duration-700 fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 backdrop-blur-sm text-accent-foreground text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              Ontario's Top Rated Insurance Platform
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold leading-tight">
              Insurance made simple for <span className="text-accent">Canadians</span>.
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-xl leading-relaxed">
              Compare quotes from Canada's top providers. Save money on Auto, Home, and Business insurance with one simple form.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/auto">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-white text-lg px-8 h-14 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                  Start My Quote <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/compare">
                <Button variant="outline" size="lg" className="text-white border-white/30 hover:bg-white/10 text-lg px-8 h-14 backdrop-blur-sm">
                  Compare Vehicles
                </Button>
              </Link>
            </div>
            
            <div className="pt-8 flex items-center gap-6 text-sm text-primary-foreground/70">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-accent" /> Secure & Private
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" /> No hidden fees
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Grid */}
      <section className="container mx-auto max-w-7xl px-4 -mt-12 relative z-30">
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
          {products.map((p) => (
            <Link key={p.label} href={p.href} className="group">
                <Card className="h-full border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full gap-3">
                    <div className="p-3 rounded-full bg-secondary text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                      <p.icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{p.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1 hidden md:block">{p.desc}</p>
                    </div>
                  </CardContent>
                </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Financial Services Section */}
      <section className="container mx-auto max-w-7xl px-4 py-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-primary mb-4">Financial Services</h2>
          <p className="text-muted-foreground text-lg">Beyond insurance, we help Ontarians with mortgages, credit solutions, and financial planning.</p>
        </div>

        <div className="flex justify-center">
          <Link href="/mortgage" className="group max-w-md w-full">
            <Card className="h-full border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Landmark size={32} />
                </div>
                <h3 className="font-bold text-lg text-primary mb-2">Mortgages</h3>
                <p className="text-sm text-muted-foreground">Compare rates from 50+ lenders. Purchase, refinance, or renew.</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="container mx-auto max-w-7xl px-4 py-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-primary mb-4">Why choose QuoteUs?</h2>
          <p className="text-muted-foreground text-lg">We're built specifically for the Ontario market, understanding the unique needs of drivers, homeowners, and businesses across the province.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-4 p-6 rounded-2xl bg-secondary/30 border border-border/50">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
              <DollarSign size={28} />
            </div>
            <h3 className="text-xl font-bold text-primary">Save Money</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our smart comparison tool analyzes risk factors to find you the most competitive rates available in your postal code.
            </p>
          </div>
          
          <div className="space-y-4 p-6 rounded-2xl bg-secondary/30 border border-border/50">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-xl font-bold text-primary">Ontario Focused</h3>
            <p className="text-muted-foreground leading-relaxed">
              We understand G licensing, winter tire discounts, and local coverage requirements better than national aggregators.
            </p>
          </div>
          
          <div className="space-y-4 p-6 rounded-2xl bg-secondary/30 border border-border/50">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-xl font-bold text-primary">Real Brokers</h3>
            <p className="text-muted-foreground leading-relaxed">
              Get the speed of an online quote with the expertise of licensed Ontario brokers who verify your coverage.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="container mx-auto max-w-7xl px-4">
        <div className="bg-primary rounded-3xl p-8 md:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">Ready to see your savings?</h2>
            <p className="text-primary-foreground/80 text-lg">
              Join thousands of Ontarians who have switched and saved. It takes less than 3 minutes to get started.
            </p>
            <Link href="/auto">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-white text-lg px-10 h-14 shadow-xl">
                Get Your Free Quote
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
