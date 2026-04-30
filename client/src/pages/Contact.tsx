import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Send, CheckCircle, UserPlus, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

import { useQuotes } from "@/lib/QuoteContext";

export default function ContactPage() {
  const { toast } = useToast();
  const { addQuote } = useQuotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    // Add to CRM via Context
    addQuote({
      type: 'General',
      clientName: data.name,
      email: data.email,
      phone: data.phone,
      postalCode: data.address,
      details: {
        fullName: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        subject: data.subject,
        message: data.message,
        inquiryType: 'General Contact'
      }
    });

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setIsSuccess(true);
    toast({
      description: "Thank you for your submission, we will be connecting you with an agent shortly.",
    });
    reset();
  };

  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      <div className="bg-primary text-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
           <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">Contact Us</h1>
           <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
             Have questions? We're here to help. Reach out to our team for support or inquiries.
           </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 -mt-12">
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Contact Info Cards */}
          <div className="md:col-span-1 space-y-6">
            <Card className="shadow-lg border-none hover:-translate-y-1 transition-transform">
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Phone</h3>
                  <p className="text-muted-foreground mt-1">1-877-253-2695</p>
                  <p className="text-xs text-muted-foreground mt-2">Mon-Fri, 9am - 5pm EST</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-none hover:-translate-y-1 transition-transform">
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Email</h3>
                  <p className="text-muted-foreground mt-1">info@QuoteUs.ca</p>
                  <p className="text-xs text-muted-foreground mt-2">We reply within 24 hours</p>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card className="shadow-xl border-none h-full">
              {isSuccess ? (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                    <CheckCircle size={40} />
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-primary mb-2">Message Received!</h2>
                  <p className="text-muted-foreground text-lg mb-8 max-w-md">
                    Thank you for contacting us. One of our insurance specialists will be in touch with you shortly.
                  </p>
                  
                  <div className="bg-secondary/20 p-6 rounded-xl w-full max-w-md">
                    <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
                      <UserPlus size={20} className="text-accent" /> Create a Profile?
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Save time on future quotes and track your inquiries by creating a free account.
                    </p>
                    <Link href="/profile">
                      <Button className="w-full bg-accent hover:bg-accent/90 text-white gap-2">
                        Create Profile <ArrowRight size={16} />
                      </Button>
                    </Link>
                  </div>
                  
                  <Button variant="ghost" className="mt-4" onClick={() => setIsSuccess(false)}>
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle className="text-2xl font-serif">Send us a Message</CardTitle>
                    <CardDescription>Fill out the form below and we'll direct your inquiry to the right department.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input id="name" {...register("name")} placeholder="John Doe" required autoComplete="name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input id="email" type="email" {...register("email")} placeholder="john@example.com" required autoComplete="email" />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input id="phone" type="tel" {...register("phone")} placeholder="(555) 555-5555" autoComplete="tel" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Input id="address" {...register("address")} placeholder="123 Main St, Toronto" autoComplete="street-address" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" {...register("subject")} placeholder="Quote Inquiry" required />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" {...register("message")} placeholder="How can we help you?" className="min-h-[150px]" required />
                      </div>

                      <div className="flex items-start gap-2.5 pt-2">
                        <input
                          type="checkbox"
                          id="consent"
                          checked={consentChecked}
                          onChange={e => setConsentChecked(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-accent cursor-pointer shrink-0"
                          data-testid="checkbox-consent"
                        />
                        <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                          By checking this box, I give QuoteUs.ca and its business / industry partners permission to share details and contact me regarding this product or service.
                        </label>
                      </div>
                      <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white text-lg h-12 gap-2" disabled={isSubmitting || !consentChecked}>
                        {isSubmitting ? "Sending..." : <><Send size={18} /> Send Message</>}
                      </Button>
                    </form>
                  </CardContent>
                </>
              )}
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
