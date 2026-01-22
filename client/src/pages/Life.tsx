import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

import { useQuotes } from "@/lib/QuoteContext";

export default function LifePage() {
  const { toast } = useToast();
  const { addQuote } = useQuotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, setValue } = useForm();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    addQuote({
      type: 'Life',
      clientName: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      postalCode: data.postalCode,
      details: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        postalCode: data.postalCode,
        dob: data.dob,
        gender: data.gender,
        smoker: data.smoker,
        coverageType: data.coverageType,
        coverageAmount: data.coverageAmount,
        occupation: data.occupation,
        healthConditions: data.healthConditions
      }
    });

    setIsSubmitting(false);
    toast({
      title: "Quote Received",
      description: "A broker will contact you shortly. CC sent to info@quoteus.ca. Account Manager has been notified.",
    });
  };

  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
           <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Life Insurance Quote</h1>
           <p className="text-lg text-primary-foreground/80 max-w-2xl">
             Secure your family's financial future with the right term or permanent coverage.
           </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 -mt-8">
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Heart className="text-accent" /> Personal Details</CardTitle>
            <CardDescription>Help us find the right plan for you.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input {...register("firstName")} placeholder="John" required />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input {...register("lastName")} placeholder="Doe" required />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input {...register("email")} type="email" placeholder="john@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input {...register("phone")} type="tel" placeholder="(555) 123-4567" required />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input {...register("address")} placeholder="123 Maple Dr" required />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input {...register("postalCode")} placeholder="M5V 2T6" required />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input {...register("dob")} type="date" required />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                 <Label>Smoking Status</Label>
                 <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non-smoker">Non-Smoker</SelectItem>
                      <SelectItem value="smoker">Smoker</SelectItem>
                    </SelectContent>
                  </Select>
              </div>

              <div className="space-y-2">
                 <Label>Type of Insurance</Label>
                 <Select onValueChange={(val) => setValue("coverageType", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="term10">Term 10 Years</SelectItem>
                      <SelectItem value="term20">Term 20 Years</SelectItem>
                      <SelectItem value="term30">Term 30 Years</SelectItem>
                      <SelectItem value="term40">Term 40 Years</SelectItem>
                      <SelectItem value="whole">Whole Life (Lifetime with Cash Value)</SelectItem>
                      <SelectItem value="universal">Universal Life (Flexible Premium)</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="recommendation">Make Recommendation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
              </div>

              <div className="space-y-2">
                 <Label>Additional Comments</Label>
                 <Textarea 
                   placeholder="Any specific health conditions or details we should know?" 
                   {...register("comments")}
                   className="resize-none"
                 />
              </div>

              <div className="space-y-2">
                 <Label>Coverage Amount Desired</Label>
                 <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select amount" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100k">$100,000</SelectItem>
                      <SelectItem value="250k">$250,000</SelectItem>
                      <SelectItem value="500k">$500,000</SelectItem>
                      <SelectItem value="1m">$1,000,000</SelectItem>
                      <SelectItem value="2m">$2,000,000</SelectItem>
                      <SelectItem value="3m">$3,000,000</SelectItem>
                      <SelectItem value="4m">$4,000,000</SelectItem>
                      <SelectItem value="5m">$5,000,000</SelectItem>
                    </SelectContent>
                  </Select>
              </div>

              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white text-lg h-12" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Get Life Quote"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
