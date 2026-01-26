import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { ClaimsHistorySection } from "@/components/ClaimsHistorySection";
import AddressAutocomplete from "@/components/AddressAutocomplete";

import { useQuotes } from "@/lib/QuoteContext";

export default function TenantPage() {
  const { toast } = useToast();
  const { addQuote } = useQuotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, control, setValue, watch } = useForm<any>({
    defaultValues: {
      claims: []
    }
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    addQuote({
      type: 'Tenant',
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
        unit: data.unit,
        postalCode: data.postalCode,
        contentsValue: data.contentsValue,
        yearsAtAddress: data.yearsAtAddress,
        claims: data.claims || [],
        claimsCount: data.claims?.length || 0
      }
    });

    setIsSubmitting(false);
    toast({
      description: "Thank you for your submission, we will be connecting you with an agent shortly.",
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
                  <AddressAutocomplete
                    value={watch("address") || ""}
                    onChange={(val) => setValue("address", val)}
                    onPostalCodeChange={(val) => setValue("postalCode", val)}
                    placeholder="Start typing your address..."
                  />
                  <p className="text-xs text-muted-foreground">Start typing for suggestions, or enter manually</p>
                </div>
                <div className="space-y-2">
                  <Label>Unit #</Label>
                  <Input {...register("unit")} placeholder="Apt 402" autoComplete="address-line2" />
                </div>
              </div>

              <div className="space-y-2">
                 <Label>Postal Code</Label>
                 <Input {...register("postalCode")} placeholder="M5V 2T6" required autoComplete="postal-code" />
              </div>

              <div className="space-y-2">
                 <Label>Time at Current Address</Label>
                 <Select onValueChange={(val) => setValue("yearsAtAddress", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="less_than_1">Less than 1 year</SelectItem>
                      <SelectItem value="1_to_3">1 - 3 years</SelectItem>
                      <SelectItem value="3_to_5">3 - 5 years</SelectItem>
                      <SelectItem value="5_plus">5+ years</SelectItem>
                    </SelectContent>
                 </Select>
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

              <ClaimsHistorySection control={control} register={register} setValue={setValue} />

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
