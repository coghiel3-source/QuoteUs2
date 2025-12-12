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

import { useQuotes } from "@/lib/QuoteContext";

export default function BusinessPage() {
  const { toast } = useToast();
  const { addQuote } = useQuotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const { register, handleSubmit } = useForm();

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
      clientName: data.businessName,
      email: '', // Not collected in this form version, maybe add it? Or assume internal
      details: {
        industry: data.industry,
        revenue: data.revenue,
        employees: data.employees
      }
    });

    setIsSubmitting(false);
    toast({
      title: "Quote Received",
      description: "A commercial broker will contact you shortly.",
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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
