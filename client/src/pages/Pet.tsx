import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Dog } from "lucide-react";
import { useState } from "react";
import AdPlacement from "@/components/AdPlacement";

import { useQuotes } from "@/lib/QuoteContext";

export default function PetPage() {
  const { toast } = useToast();
  const { addQuote } = useQuotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    addQuote({
      type: 'Pet',
      clientName: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      postalCode: data.postalCode,
      referenceId: data.referenceId || undefined,
      details: {
        ownerFirstName: data.firstName,
        ownerLastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        postalCode: data.postalCode,
        petName: data.petName,
        petType: data.petType,
        breed: data.breed,
        age: data.age,
        spayedNeutered: data.spayedNeutered,
        preExistingConditions: data.preExistingConditions
      }
    });

    setIsSubmitting(false);
    
    // Check for configured redirect BEFORE showing success
    try {
      const redirectRes = await fetch("/api/redirects/Pet");
      const redirectData = await redirectRes.json();
      if (redirectData.redirectUrl) {
        toast({
          title: "Redirecting...",
          description: "Quote submitted! Redirecting to partner site...",
        });
        window.location.href = redirectData.redirectUrl;
        return;
      }
    } catch (error) {
      console.error("Failed to check redirect:", error);
    }
    
    toast({
      title: "Quote Submitted!",
      description: "Thank you for your submission, we will be connecting you with an agent shortly.",
    });
  };

  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
           <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Pet Insurance Quote</h1>
           <p className="text-lg text-primary-foreground/80 max-w-2xl">
             Cover unexpected vet bills for your furry family members.
           </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 -mt-8">
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Dog className="text-accent" /> Pet Details</CardTitle>
            <CardDescription>Tell us about your dog or cat.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner First Name</Label>
                  <Input {...register("firstName")} placeholder="John" required />
                </div>
                <div className="space-y-2">
                  <Label>Owner Last Name</Label>
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
                  <Label>Pet Name</Label>
                  <Input {...register("petName")} placeholder="Buddy" required />
                </div>
                <div className="space-y-2">
                  <Label>Species</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dog">Dog</SelectItem>
                      <SelectItem value="cat">Cat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label>Breed</Label>
                   <Input {...register("breed")} placeholder="Golden Retriever" required />
                </div>
                <div className="space-y-2">
                   <Label>Age (Years)</Label>
                   <Input {...register("age")} type="number" placeholder="2" required />
                </div>
              </div>

              <div className="space-y-2">
                 <Label>Any Pre-existing Conditions?</Label>
                 <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
              </div>

              <div className="space-y-2">
                <Label>Reference ID (optional)</Label>
                <Input {...register("referenceId")} placeholder="e.g. ABC123" maxLength={6} className="uppercase" data-testid="input-reference-id" />
                <p className="text-xs text-muted-foreground">If you were given a reference code, enter it here.</p>
              </div>

              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white text-lg h-12" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Get Pet Quote"}
              </Button>

            </form>
            <AdPlacement page="Pet" className="mt-6" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
