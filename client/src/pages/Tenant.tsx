import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";
import { useState } from "react";

import { useQuotes } from "@/lib/QuoteContext";

export default function TenantPage() {
  const { toast } = useToast();
  const { addQuote } = useQuotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    addQuote({
      type: 'Tenant',
      clientName: 'New Client',
      details: {
        address: data.address,
        contentsValue: data.contentsValue
      }
    });

    setIsSubmitting(false);
    toast({
      title: "Quote Received",
      description: "A broker will contact you shortly with your tenant insurance estimate.",
    });
  };

  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
           <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Tenant Insurance Quote</h1>
           <p className="text-lg text-primary-foreground/80 max-w-2xl">
             Affordable protection for your personal belongings and liability coverage for renters.
           </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 -mt-8">
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="text-accent" /> Rental Details</CardTitle>
            <CardDescription>Tell us about the unit you are renting.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input {...register("address")} placeholder="456 Condo Way" required autoComplete="street-address" />
                </div>
                <div className="space-y-2">
                  <Label>Unit #</Label>
                  <Input {...register("unit")} placeholder="Apt 402" autoComplete="address-line2" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contents Value ($)</Label>
                  <Input {...register("contentsValue")} type="number" placeholder="30000" required />
                </div>
                <div className="space-y-2">
                  <Label>Building Type</Label>
                   <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">High-rise Apartment</SelectItem>
                      <SelectItem value="house">House / Basement</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white text-lg h-12" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Get Tenant Quote"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
