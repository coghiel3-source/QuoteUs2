import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, useFieldArray } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Building2, Car, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ClaimsHistorySection } from "@/components/ClaimsHistorySection";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { VehicleSelector } from "@/components/VehicleSelector";
import AdPlacement from "@/components/AdPlacement";

import { useQuotes } from "@/lib/QuoteContext";

export default function TenantPage() {
  const { toast } = useToast();
  const { addQuote } = useQuotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [wantAutoQuote, setWantAutoQuote] = useState(false);
  const [hasInsurance, setHasInsurance] = useState("");
  const { register, handleSubmit, control, setValue, watch } = useForm<any>({
    defaultValues: {
      claims: [],
      vehicles: [{ year: 2020, make: "", model: "", usage: "commute", annualKm: 10000 }]
    }
  });

  const { fields: vehicleFields, append: appendVehicle, remove: removeVehicle } = useFieldArray({
    control,
    name: "vehicles",
  });

  const onSubmit = async (data: any) => {
    if (!hasInsurance) {
      toast({ title: "Missing Field", description: "Please select whether you currently have tenant insurance.", variant: "destructive" });
      return;
    }
    if (hasInsurance === "yes" && !data.insuranceYears) {
      toast({ title: "Missing Field", description: "Please select how many years of insurance you have.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    addQuote({
      type: 'Tenant',
      clientName: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      postalCode: data.postalCode,
      referenceId: data.referenceId || undefined,
      details: {
        firstName: data.firstName,
        lastName: data.lastName,
        dob: data.dob,
        email: data.email,
        phone: data.phone,
        address: data.address,
        unit: data.unit,
        postalCode: data.postalCode,
        contentsValue: data.contentsValue,
        yearsAtAddress: data.yearsAtAddress,
        hasInsurance: hasInsurance,
        insuranceYears: hasInsurance === "yes" ? data.insuranceYears : null,
        claims: data.claims || [],
        claimsCount: data.claims?.length || 0,
        crossSellInterest: {
          wantAutoQuote: wantAutoQuote,
          autoDetails: wantAutoQuote ? {
            vehicles: data.vehicles?.filter((v: any) => v.make && v.model) || [],
            driverDob: data.driverDob,
            licenseType: data.licenseType,
            licenseDate: data.licenseDate,
          } : null
        }
      }
    });

    setIsSubmitting(false);
    
    // Check for configured redirect BEFORE showing success
    try {
      const redirectRes = await fetch("/api/redirects/Tenant");
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
           <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Tenant Insurance Quote</h1>
           <p className="text-lg text-primary-foreground/80 max-w-2xl">
             Affordable protection for your personal belongings and liability coverage for renters across Canada.
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
                  <Label>Date of Birth</Label>
                  <Input {...register("dob")} type="date" required data-testid="input-dob" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input {...register("email")} type="email" placeholder="john@example.com" required />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
                    nationwide={true}
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
                  <Label>Do you have tenant insurance now?</Label>
                  <Select onValueChange={(val) => setHasInsurance(val)}>
                    <SelectTrigger data-testid="select-has-insurance">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {hasInsurance === "yes" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label>How many years of insurance?</Label>
                    <Select onValueChange={(val) => setValue("insuranceYears", val)}>
                      <SelectTrigger data-testid="select-insurance-years">
                        <SelectValue placeholder="Select years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="less_than_1">Less than 1 year</SelectItem>
                        <SelectItem value="1_to_3">1 - 3 years</SelectItem>
                        <SelectItem value="3_to_5">3 - 5 years</SelectItem>
                        <SelectItem value="5_to_10">5 - 10 years</SelectItem>
                        <SelectItem value="10_plus">10+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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

              {/* Cross-Selling: Auto Insurance */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="wantAutoQuote" 
                    checked={wantAutoQuote}
                    onCheckedChange={(checked) => setWantAutoQuote(checked as boolean)}
                    data-testid="checkbox-want-auto"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="wantAutoQuote" className="font-medium cursor-pointer flex items-center gap-2">
                      <Car className="h-4 w-4 text-accent" />
                      I'd also like an Auto Insurance quote
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Bundle your tenant and auto insurance for additional savings!
                    </p>
                  </div>
                </div>

                {wantAutoQuote && (
                  <Card className="shadow-md border-2 border-accent/20 bg-green-50/30">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Car className="text-accent" /> Vehicle Information
                      </CardTitle>
                      <CardDescription>Tell us about the vehicle(s) you'd like to insure.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Driver Information */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm">Driver Information</h4>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Date of Birth</Label>
                            <Input {...register("driverDob")} type="date" data-testid="input-driver-dob" />
                          </div>
                          <div className="space-y-2">
                            <Label>License Type</Label>
                            <Select onValueChange={(val) => setValue("licenseType", val)}>
                              <SelectTrigger data-testid="select-license-type">
                                <SelectValue placeholder="Select license" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="G">G (Full License)</SelectItem>
                                <SelectItem value="G2">G2</SelectItem>
                                <SelectItem value="G1">G1</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>License Date</Label>
                            <Input {...register("licenseDate")} type="date" data-testid="input-license-date" />
                          </div>
                        </div>
                      </div>

                      {/* Vehicles */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm">Vehicle(s)</h4>
                        {vehicleFields.map((field, index) => (
                          <div key={field.id} className="p-4 border rounded-lg bg-white space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-sm">Vehicle {index + 1}</span>
                              {vehicleFields.length > 1 && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeVehicle(index)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                            <VehicleSelector
                              index={index}
                              register={register}
                              setValue={setValue}
                              watch={watch}
                            />
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Vehicle Usage</Label>
                                <Select onValueChange={(val) => setValue(`vehicles.${index}.usage`, val)} defaultValue="commute">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select usage" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="commute">Commute to Work</SelectItem>
                                    <SelectItem value="pleasure">Pleasure Only</SelectItem>
                                    <SelectItem value="business">Business Use</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Annual Kilometres</Label>
                                <Input {...register(`vehicles.${index}.annualKm`)} type="number" placeholder="15000" defaultValue={10000} />
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          className="w-full border-dashed"
                          onClick={() => appendVehicle({ year: 2020, make: "", model: "", usage: "commute", annualKm: 10000 })}
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Another Vehicle
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-2">
                <Label>Reference ID (optional)</Label>
                <Input {...register("referenceId")} placeholder="e.g. ABC123 or ON0000001" maxLength={12} className="uppercase" data-testid="input-reference-id" />
                <p className="text-xs text-muted-foreground">If you were given a reference code, enter it here.</p>
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consentChecked}
                  onChange={e => setConsentChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-accent cursor-pointer shrink-0"
                  data-testid="checkbox-consent"
                />
                <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                  By checking this box, I give QuoteUs.ca and its licensed insurance partners permission to contact me regarding this product or service.
                </label>
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white text-lg h-12" disabled={isSubmitting || !consentChecked}>
                {isSubmitting ? "Processing..." : "Get Tenant Quote"}
              </Button>

            </form>
            <AdPlacement page="Tenant" className="mt-6" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
