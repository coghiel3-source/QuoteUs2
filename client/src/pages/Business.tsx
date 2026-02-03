import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, UploadCloud } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AdPlacement from "@/components/AdPlacement";

import { useQuotes } from "@/lib/QuoteContext";

export default function BusinessPage() {
  const { toast } = useToast();
  const { addQuote } = useQuotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch } = useForm();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    addQuote({
      type: 'Business',
      clientName: data.contactName,
      email: data.email,
      phone: data.phone,
      postalCode: data.postalCode,
      details: {
        businessName: data.businessName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        postalCode: data.postalCode,
        industry: data.industry,
        revenue: data.revenue,
        employees: data.employees,
        yearsInBusiness: data.yearsInBusiness,
        currentInsurer: data.currentInsurer,
        additionalInfo: data.additionalInfo,
        hasAttachment: !!fileName
      }
    });

    setIsSubmitting(false);
    
    // Check for configured redirect
    try {
      const redirectRes = await fetch("/api/redirects/Business");
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
      description: "Thank you for your submission, we will be connecting you with an agent shortly.",
    });
  };

  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
           <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Business Insurance Quote</h1>
           <p className="text-lg text-primary-foreground/80 max-w-2xl">
             Protect your Ontario business with liability, property, and commercial auto coverage.
           </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 -mt-8">
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Briefcase className="text-accent" /> Business Details</CardTitle>
            <CardDescription>Tell us about your operations.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input {...register("businessName")} placeholder="Acme Corp" required />
              </div>

              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input {...register("contactName")} placeholder="John Doe" required />
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
                  <Label>Business Address</Label>
                  <AddressAutocomplete
                    value={watch("address") || ""}
                    onChange={(val) => setValue("address", val)}
                    onPostalCodeChange={(val) => setValue("postalCode", val)}
                    placeholder="Start typing your address..."
                  />
                  <p className="text-xs text-muted-foreground">Start typing for suggestions, or enter manually</p>
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input {...register("postalCode")} placeholder="M5V 2T6" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Industry</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="construction">Construction / Trades</SelectItem>
                    <SelectItem value="professional">Professional Services</SelectItem>
                    <SelectItem value="hospitality">Hospitality / Restaurant</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label>Annual Revenue ($)</Label>
                   <Input {...register("revenue")} type="number" placeholder="150000" />
                </div>
                <div className="space-y-2">
                   <Label>Number of Employees</Label>
                   <Input {...register("employees")} type="number" placeholder="5" />
                </div>
              </div>

              <div className="space-y-2">
                 <Label>Coverage Needed</Label>
                 <div className="flex flex-col gap-2">
                   {/* Simple mock checkboxes */}
                   <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" /> General Liability</label>
                   <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" /> Commercial Property</label>
                   <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" /> Professional Liability (E&O)</label>
                   <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" /> Cyber Liability</label>
                   <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" /> Other</label>
                 </div>
              </div>

              <div className="space-y-2">
                 <Label>Additional Details / Other Coverage</Label>
                 <Textarea 
                   {...register("otherDetails")} 
                   placeholder="Describe any other coverage needs or specific risks..." 
                   className="resize-none"
                 />
              </div>

              <div className="space-y-2">
                <Label>Current Policy Upload (Optional)</Label>
                <div className="border-2 border-dashed border-input rounded-lg p-6 hover:bg-secondary/5 transition-colors text-center cursor-pointer relative">
                  <Input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UploadCloud size={32} />
                    {fileName ? (
                      <span className="text-primary font-medium">{fileName}</span>
                    ) : (
                      <>
                        <span className="font-medium">Click to upload or drag and drop</span>
                        <span className="text-xs">PDF, JPG or PNG (Max 10MB)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white text-lg h-12" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Get Business Quote"}
              </Button>

              <AdPlacement page="Business" className="mt-6" />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
