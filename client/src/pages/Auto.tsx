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
import { Loader2, Plus, Trash2, Shield, Info, Car, User, AlertTriangle, FileWarning, Ban, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuotes } from "@/lib/QuoteContext";
import AddressAutocomplete from "@/components/AddressAutocomplete";

const autoSchema = z.object({
  primaryDriver: z.object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().min(1, "Email address is required").email("Invalid email format"),
    phone: z.string().min(10, "Valid phone number required"),
    dob: z.string().min(1, "Date of birth required"),
    postalCode: z.string().regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, "Invalid Ontario postal code"),
    address: z.string().min(5, "Valid mailing address required"),
    licenseType: z.enum(["G1", "G2", "G"]),
    licenseDate: z.string().min(1, "License date required"),
    licenseDateG2: z.string().optional(),
    licenseDateG1: z.string().optional(),
    priorInsurance: z.enum(["yes", "no"], { required_error: "Please select if you have prior insurance" }),
    priorInsuranceYears: z.string().optional(),
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
    vin: z.string().optional(),
    usage: z.enum(["commute", "pleasure", "business", "rideshare"]),
    annualKm: z.number().min(0, "Kilometres required"),
    coverageType: z.enum(["liability", "full"]).default("liability"),
    collisionDeductible: z.string().optional(),
    comprehensiveDeductible: z.string().optional(),
  })).min(1, "At least one vehicle is required").superRefine((val, ctx) => {
    val.forEach((vehicle, index) => {
      if (vehicle.coverageType === "full") {
        if (!vehicle.collisionDeductible) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Collision deductible is required",
            path: [index, "collisionDeductible"],
          });
        }
        if (!vehicle.comprehensiveDeductible) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Comprehensive deductible is required",
            path: [index, "comprehensiveDeductible"],
          });
        }
      }
    });
  }),
  drivers: z.array(z.object({
    firstName: z.string().min(2, "First name required"),
    lastName: z.string().min(2, "Last name required"),
    dob: z.string().min(1, "Date of birth required"),
    relationship: z.string().min(1, "Relationship required"),
    licenseType: z.enum(["G1", "G2", "G"]),
    licenseDate: z.string().optional(),
    licenseDateG2: z.string().optional(),
    licenseDateG1: z.string().optional(),
    priorInsurance: z.enum(["yes", "no"]).optional(),
    priorInsuranceYears: z.string().optional(),
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
  const { addQuote } = useQuotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [wantHomeQuote, setWantHomeQuote] = useState(false);
  const [wantTenantQuote, setWantTenantQuote] = useState(false);

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
    
    addQuote({
      type: 'Auto',
      clientName: `${data.primaryDriver.firstName} ${data.primaryDriver.lastName}`,
      email: data.primaryDriver.email,
      phone: data.primaryDriver.phone,
      postalCode: data.primaryDriver.postalCode,
      details: {
        primaryDriver: {
          firstName: data.primaryDriver.firstName,
          lastName: data.primaryDriver.lastName,
          email: data.primaryDriver.email,
          phone: data.primaryDriver.phone,
          dob: data.primaryDriver.dob,
          address: data.primaryDriver.address,
          postalCode: data.primaryDriver.postalCode,
          licenseType: data.primaryDriver.licenseType,
          licenseDate: data.primaryDriver.licenseDate,
          licenseDateG2: data.primaryDriver.licenseDateG2,
          licenseDateG1: data.primaryDriver.licenseDateG1,
          priorInsurance: data.primaryDriver.priorInsurance,
          priorInsuranceYears: data.primaryDriver.priorInsuranceYears,
          accidents: data.primaryDriver.accidents,
          tickets: data.primaryDriver.tickets,
          cancellations: data.primaryDriver.cancellations,
        },
        vehicles: data.vehicles.map(v => ({
          year: v.year,
          make: v.make,
          model: v.model,
          vin: v.vin,
          usage: v.usage,
          annualKm: v.annualKm,
          coverageType: v.coverageType,
          collisionDeductible: v.collisionDeductible,
          comprehensiveDeductible: v.comprehensiveDeductible,
        })),
        additionalDrivers: data.drivers?.map(d => ({
          firstName: d.firstName,
          lastName: d.lastName,
          dob: d.dob,
          relationship: d.relationship,
          licenseType: d.licenseType,
          licenseDate: d.licenseDate,
          licenseDateG2: d.licenseDateG2,
          licenseDateG1: d.licenseDateG1,
          priorInsurance: d.priorInsurance,
          priorInsuranceYears: d.priorInsuranceYears,
          accidents: d.accidents,
          tickets: d.tickets,
          cancellations: d.cancellations,
        })) || [],
        vehicleSummary: data.vehicles.map(v => `${v.year} ${v.make} ${v.model}`).join(', '),
        driverCount: 1 + (data.drivers?.length || 0),
        comments: data.comments,
        crossSellInterest: {
          wantHomeQuote: wantHomeQuote,
          wantTenantQuote: wantTenantQuote,
        }
      }
    });

    setIsSubmitted(true);
    setIsSubmitting(false);
    toast({
      description: "Thank you for your submission, we will be connecting you with an agent shortly.",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (isSubmitted) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Card className="border-t-4 border-t-accent shadow-2xl bg-white overflow-hidden">
          <CardHeader className="bg-secondary/20 pb-8 text-center">
             <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-sm">
               <CheckCircle size={40} />
             </div>
            <CardTitle className="text-3xl font-serif font-bold text-primary">Quote Request Received!</CardTitle>
            <CardDescription className="text-lg mt-2">
              Thank you for providing your details, {form.getValues().primaryDriver.firstName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto text-center">
              
              <div className="space-y-4">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We have successfully received your information.
                </p>
                
                <div className="bg-primary/5 p-6 rounded-lg border border-primary/10 my-6">
                  <h3 className="font-bold text-primary mb-2">What happens next?</h3>
                  <p className="text-sm text-muted-foreground">
                    One of our licensed Ontario insurance brokers is now reviewing your profile to find you the best possible rates from our network of over 30 insurance carriers. They will contact you shortly via phone or email to present your personalized quote options.
                  </p>
                </div>
              </div>

              <Button size="lg" className="w-full max-w-md text-lg h-14 bg-accent hover:bg-accent/90 text-white shadow-lg transition-all hover:-translate-y-1" onClick={() => window.location.reload()}>
                Start Another Quote
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
                  <AddressAutocomplete
                    id="address"
                    value={form.watch("primaryDriver.address") || ""}
                    onChange={(val) => form.setValue("primaryDriver.address", val)}
                    onPostalCodeChange={(val) => form.setValue("primaryDriver.postalCode", val)}
                    placeholder="Start typing your address..."
                    data-testid="input-address"
                  />
                  <p className="text-xs text-muted-foreground">Start typing to see suggestions, or enter your address manually</p>
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
                    <p className="text-sm text-muted-foreground mb-2">Have you had prior insurance in Canada or the United States?</p>
                    <RadioGroup 
                      onValueChange={(val: "yes" | "no") => form.setValue("primaryDriver.priorInsurance", val)} 
                      defaultValue="yes"
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="prior-yes" />
                        <Label htmlFor="prior-yes" className="font-normal cursor-pointer">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="prior-no" />
                        <Label htmlFor="prior-no" className="font-normal cursor-pointer">No</Label>
                      </div>
                    </RadioGroup>

                    {form.watch("primaryDriver.priorInsurance") === "yes" && (
                      <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label className="mb-2 block">How many years of continuous insurance?</Label>
                        <Select onValueChange={(val) => form.setValue("primaryDriver.priorInsuranceYears", val)}>
                          <SelectTrigger className="w-full md:w-[300px]">
                            <SelectValue placeholder="Select number of years" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Less than 1 year</SelectItem>
                            {[...Array(10)].map((_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1} year{i !== 0 ? 's' : ''}</SelectItem>
                            ))}
                            <SelectItem value="10+">10+ years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

              </CardContent>
            </Card>

            {/* Additional Drivers Section */}
             <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-serif text-primary flex items-center gap-2">
                  <User size={20} /> Additional Drivers
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={() => appendDriver({ firstName: "", lastName: "", dob: "", relationship: "Spouse", licenseType: "G", licenseDate: "", licenseDateG2: "", licenseDateG1: "", accidents: [], tickets: [], cancellations: [] })} className="gap-2">
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
                                    <SelectItem value="G">G (Full License)</SelectItem>
                                    <SelectItem value="G2">G2</SelectItem>
                                    <SelectItem value="G1">G1 (Learner)</SelectItem>
                                  </SelectContent>
                               </Select>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-3 gap-4 mb-4">
                            <div className="space-y-2">
                              <Label>G Date Obtained</Label>
                              <Input type="date" {...form.register(`drivers.${index}.licenseDate`)} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-muted-foreground">G2 Date (Optional)</Label>
                              <Input type="date" {...form.register(`drivers.${index}.licenseDateG2`)} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-muted-foreground">G1 Date (Optional)</Label>
                              <Input type="date" {...form.register(`drivers.${index}.licenseDateG1`)} />
                            </div>
                          </div>

                          <div className="border-t pt-4">
                             <div className="mb-6 space-y-3">
                               <Label>Prior Insurance History</Label>
                               <p className="text-sm text-muted-foreground mb-2">Have you had prior insurance in Canada or the United States?</p>
                               <RadioGroup 
                                 onValueChange={(val: "yes" | "no") => form.setValue(`drivers.${index}.priorInsurance`, val)} 
                                 defaultValue="no"
                                 className="flex gap-6"
                               >
                                 <div className="flex items-center space-x-2">
                                   <RadioGroupItem value="yes" id={`driver-${index}-prior-yes`} />
                                   <Label htmlFor={`driver-${index}-prior-yes`} className="font-normal cursor-pointer">Yes</Label>
                                 </div>
                                 <div className="flex items-center space-x-2">
                                   <RadioGroupItem value="no" id={`driver-${index}-prior-no`} />
                                   <Label htmlFor={`driver-${index}-prior-no`} className="font-normal cursor-pointer">No</Label>
                                 </div>
                               </RadioGroup>

                               {form.watch(`drivers.${index}.priorInsurance`) === "yes" && (
                                 <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                   <Label className="mb-2 block">How many years of continuous insurance?</Label>
                                   <Select onValueChange={(val) => form.setValue(`drivers.${index}.priorInsuranceYears`, val)}>
                                     <SelectTrigger className="w-full md:w-[300px]">
                                       <SelectValue placeholder="Select number of years" />
                                     </SelectTrigger>
                                     <SelectContent>
                                       <SelectItem value="0">Less than 1 year</SelectItem>
                                       {[...Array(10)].map((_, i) => (
                                         <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1} year{i !== 0 ? 's' : ''}</SelectItem>
                                       ))}
                                       <SelectItem value="10+">10+ years</SelectItem>
                                     </SelectContent>
                                   </Select>
                                 </div>
                               )}
                             </div>

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

            {/* Vehicles Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-serif text-primary flex items-center gap-2">
                  <Car size={20} /> Vehicles
                </h3>
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
                              showVin={true}
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
                                    <SelectItem value="rideshare">Rideshare (Uber/Lyft)</SelectItem>
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

                           <div className="pt-4 border-t mt-4">
                             <Label className="text-base font-semibold mb-3 block">Coverage Options</Label>
                             <RadioGroup
                               onValueChange={(val: any) => form.setValue(`vehicles.${index}.coverageType`, val)}
                               defaultValue="liability"
                               className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"
                             >
                               <div className="flex items-center space-x-2 border p-4 rounded-lg hover:bg-accent/5 cursor-pointer has-[:checked]:bg-accent/10 has-[:checked]:border-accent transition-colors">
                                 <RadioGroupItem value="liability" id={`cov-liability-${index}`} />
                                 <Label htmlFor={`cov-liability-${index}`} className="cursor-pointer flex-1">
                                   <span className="font-semibold block">Liability Only</span>
                                   <span className="text-xs text-muted-foreground">Basic coverage required by law. Does not cover damage to your vehicle.</span>
                                 </Label>
                               </div>
                               <div className="flex items-center space-x-2 border p-4 rounded-lg hover:bg-accent/5 cursor-pointer has-[:checked]:bg-accent/10 has-[:checked]:border-accent transition-colors">
                                 <RadioGroupItem value="full" id={`cov-full-${index}`} />
                                 <Label htmlFor={`cov-full-${index}`} className="cursor-pointer flex-1">
                                   <span className="font-semibold block">Full Coverage</span>
                                   <span className="text-xs text-muted-foreground">Includes Collision & Comprehensive. Covers damage to your vehicle.</span>
                                 </Label>
                               </div>
                             </RadioGroup>

                             {form.watch(`vehicles.${index}.coverageType`) === "full" && (
                               <div className="grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300 bg-secondary/10 p-4 rounded-lg">
                                 <div className="space-y-2">
                                   <Label>Collision Deductible</Label>
                                   <Select onValueChange={(val) => form.setValue(`vehicles.${index}.collisionDeductible`, val)}>
                                     <SelectTrigger>
                                       <SelectValue placeholder="Select Deductible" />
                                     </SelectTrigger>
                                     <SelectContent>
                                       {["0", "100", "250", "500", "750", "1000", "2500"].map((amt) => (
                                         <SelectItem key={amt} value={amt}>${amt}</SelectItem>
                                       ))}
                                     </SelectContent>
                                   </Select>
                                   {form.formState.errors.vehicles?.[index]?.collisionDeductible && (
                                     <p className="text-destructive text-xs">{form.formState.errors.vehicles[index]?.collisionDeductible?.message}</p>
                                   )}
                                 </div>
                                 <div className="space-y-2">
                                   <Label>Comprehensive Deductible</Label>
                                   <Select onValueChange={(val) => form.setValue(`vehicles.${index}.comprehensiveDeductible`, val)}>
                                     <SelectTrigger>
                                       <SelectValue placeholder="Select Deductible" />
                                     </SelectTrigger>
                                     <SelectContent>
                                        {["0", "100", "250", "500", "750", "1000", "2500"].map((amt) => (
                                         <SelectItem key={amt} value={amt}>${amt}</SelectItem>
                                       ))}
                                     </SelectContent>
                                   </Select>
                                   {form.formState.errors.vehicles?.[index]?.comprehensiveDeductible && (
                                     <p className="text-destructive text-xs">{form.formState.errors.vehicles[index]?.comprehensiveDeductible?.message}</p>
                                   )}
                                 </div>
                               </div>
                             )}
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <Button type="button" variant="outline" size="sm" onClick={() => appendVehicle({ year: 2020, make: "", model: "", usage: "commute", annualKm: 10000, coverageType: "liability" })} className="gap-2 w-full border-dashed py-6">
                <Plus size={16} /> Add Another Vehicle
              </Button>
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

            {/* Cross-Selling Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif text-primary flex items-center gap-2">
                  <Shield size={20} /> Additional Insurance Options
                </h3>
              </div>
              <Card className="shadow-md border-none bg-green-50/50">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Would you also like quotes for other types of insurance? Check the options below to bundle your request.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="wantHomeQuote" 
                        checked={wantHomeQuote}
                        onCheckedChange={(checked) => setWantHomeQuote(checked as boolean)}
                        data-testid="checkbox-want-home"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="wantHomeQuote" className="font-medium cursor-pointer">
                          I'd also like a Home Insurance quote
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Protect your home with comprehensive coverage. Bundle and save!
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="wantTenantQuote" 
                        checked={wantTenantQuote}
                        onCheckedChange={(checked) => setWantTenantQuote(checked as boolean)}
                        data-testid="checkbox-want-tenant"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="wantTenantQuote" className="font-medium cursor-pointer">
                          I'd also like a Tenant Insurance quote
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Affordable protection for your belongings as a renter.
                        </p>
                      </div>
                    </div>
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
