import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Plane } from "lucide-react";
import { useState } from "react";

import { useQuotes } from "@/lib/QuoteContext";

export default function TravelPage() {
  const { toast } = useToast();
  const { addQuote } = useQuotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPreExisting, setHasPreExisting] = useState<"yes" | "no" | null>(null);
  const { register, handleSubmit, setValue, watch } = useForm();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    addQuote({
      type: 'Travel',
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
        destination: data.destination,
        departureDate: data.departureDate,
        returnDate: data.returnDate,
        travellers: data.travellers,
        primaryTravellerAge: data.age,
        preExistingCondition: hasPreExisting,
        preExistingDetails: data.preExistingDetails
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    toast({
      title: "Redirecting...",
      description: "Account Manager notified (CC: info@quoteus.ca). Redirecting to partner site...",
    });
    // Redirect to Tugo
    window.location.href = "https://shop.tugo.com/store/AFL801/?utm_group=insurancereferral&utm_source=TAP&utm_medium=insurancereferral&utm_campaign=ce&ps_partner_key=Y29yZXljb2doaWVsMTEwMA&ps_xid=2gfw6vKwwAnoHF&gsxid=2gfw6vKwwAnoHF&gspk=Y29yZXljb2doaWVsMTEwMA";
  };

  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
           <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Travel Insurance Quote</h1>
           <p className="text-lg text-primary-foreground/80 max-w-2xl">
             Emergency medical and trip cancellation coverage for peace of mind while you travel.
           </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 -mt-8">
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plane className="text-accent" /> Trip Details</CardTitle>
            <CardDescription>Where are you going and for how long?</CardDescription>
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

              <div className="space-y-2">
                <Label>Destination</Label>
                <Select onValueChange={(val) => setValue("destination", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usa">USA</SelectItem>
                    <SelectItem value="caribbean">Caribbean / Mexico</SelectItem>
                    <SelectItem value="europe">Europe</SelectItem>
                    <SelectItem value="other">Other International</SelectItem>
                    <SelectItem value="canada">Within Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departure Date</Label>
                  <Input {...register("departureDate")} type="date" required />
                </div>
                <div className="space-y-2">
                  <Label>Return Date</Label>
                  <Input {...register("returnDate")} type="date" required />
                </div>
              </div>

              <div className="space-y-2">
                 <Label>Number of Travellers</Label>
                 <Input {...register("travellers")} type="number" min="1" max="10" defaultValue="1" required />
              </div>

              <div className="space-y-2">
                 <Label>Primary Traveller Age</Label>
                 <Input {...register("age")} type="number" placeholder="35" required />
              </div>

              <div className="space-y-3 border-t pt-6">
                <Label>Pre-Existing Medical Conditions</Label>
                <p className="text-sm text-muted-foreground">Do any travellers have pre-existing medical conditions?</p>
                <RadioGroup 
                  onValueChange={(val: "yes" | "no") => setHasPreExisting(val)}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="preexisting-yes" />
                    <Label htmlFor="preexisting-yes" className="font-normal cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="preexisting-no" />
                    <Label htmlFor="preexisting-no" className="font-normal cursor-pointer">No</Label>
                  </div>
                </RadioGroup>

                {hasPreExisting === "yes" && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label className="mb-2 block">Please describe the condition(s)</Label>
                    <Textarea 
                      {...register("preExistingDetails")}
                      placeholder="Please provide details about any pre-existing medical conditions..."
                      className="min-h-[100px]"
                    />
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white text-lg h-12" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Get Travel Quote"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
