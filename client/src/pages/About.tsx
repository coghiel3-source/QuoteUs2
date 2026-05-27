import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Handshake, BookOpen, ShieldCheck, Users } from "lucide-react";
import { useSeo } from "@/hooks/use-seo";

export default function AboutPage() {
  useSeo({
    title: "About QuoteUs.ca | Ontario's Insurance Quoting Platform",
    description: "Learn how QuoteUs.ca connects Ontario customers with trusted licensed brokers for fast, transparent insurance quotes across every major product line.",
    keywords: "about QuoteUs, Ontario insurance quoting platform, licensed insurance brokers Ontario, insurance marketplace Canada",
  });
  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      <div className="bg-primary text-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
           <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">About QuoteUs</h1>
           <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
             Simplifying insurance for Ontarians through transparency, partnership, and trust.
           </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 -mt-12">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          
          <Card className="shadow-xl border-none h-full hover:-translate-y-1 transition-transform duration-300">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-4">
                <Handshake size={28} />
              </div>
              <CardTitle className="text-xl font-bold">Partnership</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                We partner with Service Providers, Agents & Brokers to make our customers' lives easier as we create a one-stop shop for all your Insurance and Financial Services!
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none h-full hover:-translate-y-1 transition-transform duration-300">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-4">
                <BookOpen size={28} />
              </div>
              <CardTitle className="text-xl font-bold">Easy to Understand</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                An easy-to-understand platform without the Insurance & Financial jargon. Our aim is to use terms that make the Insurance and Financial process simple and accessible for everyone.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none h-full hover:-translate-y-1 transition-transform duration-300">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-4">
                <ShieldCheck size={28} />
              </div>
              <CardTitle className="text-xl font-bold">Digital Presence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Your personal and financial data will <strong>not</strong> be sold. It will only be used by our trusted service providers in order to present you with the most comprehensive Products and Services.
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Additional Team/Mission Section to fill out the page */}
        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-border">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
              <h2 className="text-3xl font-serif font-bold text-primary">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                QuoteUs was founded with a single goal: to empower Ontarians to make informed decisions about their financial future. By combining cutting-edge technology with the expertise of local brokers, we bridge the gap between digital convenience and personalized advice.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We believe that insurance shouldn't be complicated. Whether you're insuring your first car, buying a home, or starting a business, we're here to guide you every step of the way.
              </p>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-secondary/50 p-8 rounded-full">
                 <Users size={120} className="text-primary/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
