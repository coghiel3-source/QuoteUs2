import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Plane } from "lucide-react";
import { useState } from "react";

export default function TravelPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    toast({
      title: "Redirecting...",
      description: "We are taking you to our trusted travel insurance partner to complete your quote.",
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
              <div className="space-y-2">
                <Label>Destination</Label>
                <Select>
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
