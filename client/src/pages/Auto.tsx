import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { VehicleSelector } from "@/components/VehicleSelector";
import { DriverHistorySection } from "@/components/DriverHistorySection";
import { Loader2, Plus, Trash2, Shield, Info, Car, User, AlertTriangle, FileWarning, Ban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Textarea } from "@/components/ui/textarea";

const autoSchema = z.object({
  primaryDriver: z.object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(10, "Valid phone number required"),
    dob: z.string().min(1, "Date of birth required"),
    postalCode: z.string().regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, "Invalid Ontario postal code"),
    address: z.string().min(5, "Valid mailing address required"),
    licenseType: z.enum(["G1", "G2", "G"]),
    licenseDate: z.string().min(1, "License date required"),
    licenseDateG2: z.string().optional(),
    licenseDateG1: z.string().optional(),
    priorInsurance: z.enum(["yes", "no"], { required_error: "Please select if you have prior insurance" }),
    accidents: z.array(z.object({
      date: z.string(),
      type: z.string(),
    })),
    tickets: z.array(z.object({
      date: z.string(),
      type: z.string(),
    })),
    cancellations: z.array(z.object({
      date: z.string(),
      reason: z.string(),
    })),
  }),
  comments: z.string().optional(),
  vehicles: z.array(z.object({
    year: z.number().min(1990),
    make: z.string().min(1, "Make is required"),
    model: z.string().min(1, "Model is required"),
    usage: z.enum(["commute", "pleasure", "business"]),
    annualKm: z.number().min(0, "Kilometres required"),
  })).min(1, "At least one vehicle is required"),
  drivers: z.array(z.object({
    firstName: z.string().min(2, "First name required"),
    lastName: z.string().min(2, "Last name required"),
    dob: z.string().min(1, "Date of birth required"),
    relationship: z.string().min(1, "Relationship required"),
    licenseType: z.enum(["G1", "G2", "G"]),
    accidents: z.array(z.object({
      date: z.string(),
      type: z.string(),
    })),
    tickets: z.array(z.object({
      date: z.string(),
      type: z.string(),
    })),
    cancellations: z.array(z.object({
      date: z.string(),
      reason: z.string(),
    })),
  })).optional(),
});

type AutoFormValues = z.infer<typeof autoSchema>;

export default function AutoPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteResult, setQuoteResult] = useState<number | null>(null);

  const form = useForm<AutoFormValues>({
    resolver: zodResolver(autoSchema),
    defaultValues: {
      primaryDriver: {
        licenseType: "G",
        priorInsurance: "yes",
        accidents: [],
        tickets: [],
        cancellations: []
      },
      vehicles: [{ year: 2020, usage: "commute" }],
      drivers: [],
    },
  });

  const { fields: vehicleFields, append: appendVehicle, remove: removeVehicle } = useFieldArray({
    control: form.control,
    name: "vehicles",
  });

  const { fields: driverFields, append: appendDriver, remove: removeDriver } = useFieldArray({
    control: form.control,
    name: "drivers",
  });

  async function onSubmit(data: AutoFormValues) {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Mock quote calculation logic
    let baseRate = 150; // Base monthly
    baseRate += data.vehicles.length * 80;
    if (data.primaryDriver.licenseType !== "G") baseRate += 50;
    
    // Risk factors
    if (data.primaryDriver.accidents.length > 0) {
      data.primaryDriver.accidents.forEach(acc => {
        if (acc.type === 'at_fault') baseRate += 100;
        else baseRate += 20; // Minor increase for not-at-fault claims freq
      });
    }
    
    if (data.primaryDriver.tickets.length > 0) baseRate += (data.primaryDriver.tickets.length * 50);
    if (data.primaryDriver.cancellations.length > 0) baseRate += 200;

    if (data.drivers && data.drivers.length > 0) {
      baseRate += data.drivers.length * 40;
      data.drivers.forEach(driver => {
         if (driver.accidents.length > 0) {
           driver.accidents.forEach(acc => {
              if (acc.type === 'at_fault') baseRate += 80;
           });
         }
      });
    }
    
    setQuoteResult(baseRate);
    setIsSubmitting(false);
    toast({
      title: "Quote Calculated!",
      description: "We've found a preliminary rate for you.",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (quoteResult) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Card className="border-t-4 border-t-accent shadow-2xl bg-white overflow-hidden">
          <CardHeader className="bg-secondary/20 pb-8 text-center">
             <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
               <Shield size={32} />
             </div>
            <CardTitle className="text-3xl font-serif font-bold text-primary">Your Estimated Quote</CardTitle>
            <CardDescription className="text-lg">Based on the information provided for {form.getValues().primaryDriver.postalCode}</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="text-center">
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Estimated Monthly Premium</span>
                <div className="text-6xl font-bold text-primary mt-2">
                  ${quoteResult}<span className="text-2xl text-muted-foreground font-normal">/mo</span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 w-full max-w-2xl mt-8">
                 <div className="p-4 rounded-lg bg-secondary/30 border text-center">
                    <div className="font-bold text-lg mb-1">Standard</div>
                    <div className="text-2xl font-bold text-primary">${quoteResult + 20}</div>
                    <div className="text-xs text-muted-foreground mt-2">Includes collision</div>
                 </div>
                 <div className="p-4 rounded-lg bg-primary/5 border-primary/20 text-center ring-2 ring-primary relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Best Value</div>
                    <div className="font-bold text-lg mb-1">Plus</div>
                    <div className="text-2xl font-bold text-primary">${quoteResult}</div>
                    <div className="text-xs text-muted-foreground mt-2">Comprehensive + Rental</div>
                 </div>
                 <div className="p-4 rounded-lg bg-secondary/30 border text-center">
                    <div className="font-bold text-lg mb-1">Basic</div>
                    <div className="text-2xl font-bold text-primary">${quoteResult - 15}</div>
                    <div className="text-xs text-muted-foreground mt-2">Liability Only</div>
                 </div>
              </div>

              <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex gap-3 text-sm max-w-2xl">
                <Info className="shrink-0 mt-0.5" size={16} />
                <p>This is an estimate based on provided data. Final premiums are subject to verification of driving record and insurance history by a licensed broker.</p>
              </div>

              <Button size="lg" className="w-full max-w-md text-lg h-14 bg-accent hover:bg-accent/90 text-white" onClick={() => window.location.reload()}>
                Start a New Quote
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      {/* Page Header */}
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
           <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Auto Insurance Quote</h1>
           <p className="text-lg text-primary-foreground/80 max-w-2xl">
             Save on auto insurance across Ontario. Compare multiple carriers to find the policy that fits your driving profile.
           </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 -mt-8">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-8">
            
            {/* Primary Driver Section */}
            <Card className="shadow-lg border-none animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="border-b bg-white/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary"><User size={24} /></div>
                  <div>
                    <CardTitle>Primary Driver</CardTitle>
                    <CardDescription>Tell us about yourself</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" {...form.register("primaryDriver.firstName")} data-testid="input-first-name" />
                  {form.formState.errors.primaryDriver?.firstName && <p className="text-destructive text-xs">{form.formState.errors.primaryDriver.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" {...form.register("primaryDriver.lastName")} data-testid="input-last-name" />
                   {form.formState.errors.primaryDriver?.lastName && <p className="text-destructive text-xs">{form.formState.errors.primaryDriver.lastName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" {...form.register("primaryDriver.dob")} data-testid="input-dob" />
                  {form.formState.errors.primaryDriver?.dob && <p className="text-destructive text-xs">{form.formState.errors.primaryDriver.dob.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="(555) 555-5555" {...form.register("primaryDriver.phone")} data-testid="input-phone" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="john@example.com" {...form.register("primaryDriver.email")} data-testid="input-email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code (Ontario)</Label>
                  <Input id="postalCode" placeholder="M5V 2H1" className="uppercase" {...form.register("primaryDriver.postalCode")} data-testid="input-postal" autoComplete="postal-code" />
                   {form.formState.errors.primaryDriver?.postalCode && <p className="text-destructive text-xs">{form.formState.errors.primaryDriver.postalCode.message}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Mailing Address</Label>
                  <Input id="address" placeholder="123 Maple Street, Apt 4B, Toronto, ON" {...form.register("primaryDriver.address")} data-testid="input-address" autoComplete="street-address" />
                </div>
                
                <div className="md:col-span-2 grid md:grid-cols-2 gap-6 pt-4 border-t mt-2">
                   <div className="space-y-2">
                    <Label>License Type</Label>
                    <Select onValueChange={(val: any) => form.setValue("primaryDriver.licenseType", val)} defaultValue="G">
                      <SelectTrigger data-testid="select-license-type">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="G">G (Full License)</SelectItem>
                        <SelectItem value="G2">G2</SelectItem>
                        <SelectItem value="G1">G1 (Learner)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="licenseDate">Date Obtained (Current Class)</Label>
                    <Input id="licenseDate" type="date" {...form.register("primaryDriver.licenseDate")} data-testid="input-license-date" />
                     {form.formState.errors.primaryDriver?.licenseDate && <p className="text-destructive text-xs">{form.formState.errors.primaryDriver.licenseDate.message}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseDateG2" className="text-muted-foreground">G2 Date Obtained (Optional)</Label>
                    <Input id="licenseDateG2" type="date" {...form.register("primaryDriver.licenseDateG2")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseDateG1" className="text-muted-foreground">G1 Date Obtained (Optional)</Label>
                    <Input id="licenseDateG1" type="date" {...form.register("primaryDriver.licenseDateG1")} />
                  </div>
                </div>

                  <div className="md:col-span-2">
                    <DriverHistorySection 
                      control={form.control} 
                      register={form.register} 
                      setValue={form.setValue} 
                      basePath="primaryDriver" 
                    />
                  </div>
                  
                  <div className="md:col-span-2 pt-4 border-t space-y-3">
                    <Label>Prior Insurance History</Label>
                    <p className="text-sm text-muted-foreground mb-2">Have you had continuous auto insurance coverage for the last 3 years?</p>
                    <RadioGroup 
                      onValueChange={(val: "yes" | "no") => form.setValue("primaryDriver.priorInsurance", val)} 
                      defaultValue="yes"
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="prior-yes" />
                        <Label htmlFor="prior-yes" className="font-normal cursor-pointer">Yes, I have prior insurance</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="prior-no" />
                        <Label htmlFor="prior-no" className="font-normal cursor-pointer">No, this is my first policy / gap in coverage</Label>
                      </div>
                    </RadioGroup>
                  </div>

              </CardContent>
            </Card>

            {/* Vehicles Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-serif text-primary flex items-center gap-2">
                  <Car size={20} /> Vehicles
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={() => appendVehicle({ year: 2020, make: "", model: "", usage: "commute", annualKm: 10000 })} className="gap-2">
                  <Plus size={16} /> Add Vehicle
                </Button>
              </div>
              
              <AnimatePresence>
                {vehicleFields.map((field, index) => (
                  <motion.div 
                    key={field.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4"
                  >
                    <Card className="shadow-md border-none relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>
                      <CardContent className="p-6 pt-8">
                         {index > 0 && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                              onClick={() => removeVehicle(index)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                          
                        <div className="grid gap-6">
                           <VehicleSelector 
                              index={index} 
                              register={form.register} 
                              setValue={form.setValue} 
                              watch={form.watch} 
                           />
                           
                           <div className="grid md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Primary Usage</Label>
                                <Select onValueChange={(val: any) => form.setValue(`vehicles.${index}.usage`, val)} defaultValue="commute">
                                  <SelectTrigger data-testid={`select-usage-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="commute">Commuting to Work/School</SelectItem>
                                    <SelectItem value="pleasure">Pleasure Use Only</SelectItem>
                                    <SelectItem value="business">Business Use</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>
                             <div className="space-y-2">
                                <Label>Annual Kilometres</Label>
                                <Input 
                                  type="number" 
                                  placeholder="e.g. 15000" 
                                  {...form.register(`vehicles.${index}.annualKm`, { valueAsNumber: true })} 
                                  data-testid={`input-km-${index}`}
                                />
                             </div>
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Additional Drivers Section */}
             <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-serif text-primary flex items-center gap-2">
                  <User size={20} /> Additional Drivers
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={() => appendDriver({ firstName: "", lastName: "", dob: "", relationship: "Spouse", licenseType: "G", accidents: [], tickets: [], cancellations: [] })} className="gap-2">
                  <Plus size={16} /> Add Driver
                </Button>
              </div>

               <AnimatePresence>
                {driverFields.map((field, index) => (
                  <motion.div 
                    key={field.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4"
                  >
                    <Card className="shadow-md border-none relative overflow-hidden">
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary-foreground/20"></div>
                       <CardContent className="p-6 pt-8 gap-4">
                          <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                              onClick={() => removeDriver(index)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          
                          <div className="grid md:grid-cols-3 gap-4 mb-4">
                            <div className="space-y-2">
                              <Label>First Name</Label>
                              <Input {...form.register(`drivers.${index}.firstName`)} placeholder="First Name" />
                            </div>
                            <div className="space-y-2">
                              <Label>Last Name</Label>
                              <Input {...form.register(`drivers.${index}.lastName`)} placeholder="Last Name" />
                            </div>
                            <div className="space-y-2">
                              <Label>Date of Birth</Label>
                              <Input type="date" {...form.register(`drivers.${index}.dob`)} />
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                               <Label>Relationship</Label>
                               <Select onValueChange={(val) => form.setValue(`drivers.${index}.relationship`, val)} defaultValue="Spouse">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Spouse">Spouse / Partner</SelectItem>
                                    <SelectItem value="Child">Child</SelectItem>
                                    <SelectItem value="Parent">Parent</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                               </Select>
                            </div>
                            <div className="space-y-2">
                               <Label>License Type</Label>
                               <Select onValueChange={(val: any) => form.setValue(`drivers.${index}.licenseType`, val)} defaultValue="G">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="G">G</SelectItem>
                                    <SelectItem value="G2">G2</SelectItem>
                                    <SelectItem value="G1">G1</SelectItem>
                                  </SelectContent>
                               </Select>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                             <DriverHistorySection 
                               control={form.control} 
                               register={form.register} 
                               setValue={form.setValue} 
                               basePath={`drivers.${index}`} 
                             />
                          </div>
                       </CardContent>
                    </Card>
                  </motion.div>
                ))}
               </AnimatePresence>
               {driverFields.length === 0 && (
                 <div className="text-sm text-muted-foreground italic p-4 border border-dashed rounded-lg text-center">
                   No additional drivers added.
                 </div>
               )}
            </div>

            {/* Additional Comments */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif text-primary flex items-center gap-2">
                  <Info size={20} /> Additional Comments
                </h3>
              </div>
              <Card className="shadow-md border-none">
                <CardContent className="p-6">
                   <div className="space-y-2">
                      <Label htmlFor="comments">Additional Information</Label>
                      <Textarea 
                        id="comments" 
                        placeholder="Please include any other details such as: Driver's license number, previous US license history, gaps in coverage explanation, etc." 
                        className="min-h-[100px] resize-y"
                        {...form.register("comments")}
                      />
                   </div>
                </CardContent>
              </Card>
            </div>

            {/* Submit */}
            <div className="pt-6">
              <Button type="submit" size="lg" className="w-full text-lg h-14 bg-accent hover:bg-accent/90 text-white shadow-xl" disabled={isSubmitting} data-testid="button-submit-quote">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Calculating Premium...
                  </>
                ) : (
                  "Get My Quote Now"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-4">
                By clicking "Get My Quote Now", you agree to our Terms of Service and Privacy Policy. 
                Your data is stored securely and only used for quoting purposes.
              </p>
            </div>

            {/* SEO Content */}
            <div className="mt-16 prose prose-slate max-w-none">
              <h2 className="font-serif text-primary">Auto Insurance — QuoteUs.ca (Ontario)</h2>
              <p>
                Save on auto insurance across Ontario without sacrificing coverage. QuoteUs.ca helps Ontario drivers compare multiple carriers and find the policy that fits your driving profile and budget. Our auto quoting tool supports G1, G2 and full G licences, multiple vehicles, and additional drivers — so your quote reflects your real risk and usage. Enter your vehicle year, make and model (we include North American models back to 1990), add drivers and licence dates, and get a fast, Ontario-specific estimate.
              </p>
              <p>
                We focus on transparency: each quote includes a clear breakdown of coverage types (liability, accident benefits, collision, comprehensive) and cost drivers like age, driving history, annual kilometres and garaging postal code. If you opt in, you can provide optional information such as driver licence numbers (stored securely) to speed up the broker review. Our brokers review each lead and can follow up to tailor coverage or identify discounts you may have missed.
              </p>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
