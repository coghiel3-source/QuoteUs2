import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Home, DollarSign, Calendar, Building2, Calculator } from "lucide-react";
import { useState, useMemo } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AdPlacement from "@/components/AdPlacement";
import { useQuotes } from "@/lib/QuoteContext";
import { useSeo } from "@/hooks/use-seo";

export default function MortgagePage() {
  useSeo({
    title: "Mortgage Insurance Ontario | Protection Quotes — QuoteUs.ca",
    description: "Mortgage protection and creditor insurance quotes for Ontario homeowners. Protect your mortgage payments with life, disability and critical-illness coverage.",
    keywords: "mortgage insurance Ontario, mortgage protection insurance Canada, creditor insurance, mortgage life insurance quote, mortgage disability insurance Ontario",
  });
  const { toast } = useToast();
  const { addQuote } = useQuotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  
  const [calcPrincipal, setCalcPrincipal] = useState(400000);
  const [calcRate, setCalcRate] = useState(5.5);
  const [calcAmortization, setCalcAmortization] = useState(25);
  const [calcPaymentFrequency, setCalcPaymentFrequency] = useState<"monthly" | "biweekly" | "weekly">("monthly");

  const calculatorResults = useMemo(() => {
    const principal = calcPrincipal;
    const annualRate = calcRate / 100;
    const monthlyRate = annualRate / 12;
    const totalMonths = calcAmortization * 12;
    
    if (principal <= 0 || annualRate <= 0 || totalMonths <= 0) {
      return { payment: 0, totalPayment: 0, totalInterest: 0 };
    }
    
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    const totalPayment = monthlyPayment * totalMonths;
    const totalInterest = totalPayment - principal;
    
    let payment = monthlyPayment;
    if (calcPaymentFrequency === "biweekly") {
      payment = (monthlyPayment * 12) / 26;
    } else if (calcPaymentFrequency === "weekly") {
      payment = (monthlyPayment * 12) / 52;
    }
    
    return {
      payment: Math.round(payment * 100) / 100,
      totalPayment: Math.round(totalPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100
    };
  }, [calcPrincipal, calcRate, calcAmortization, calcPaymentFrequency]);
  const { register, handleSubmit, setValue, watch } = useForm<any>({
    defaultValues: {
      mortgageType: "purchase",
      propertyType: "detached",
      employmentStatus: "employed",
    }
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    addQuote({
      type: 'Mortgage',
      clientName: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      postalCode: data.postalCode,
      referenceId: data.referenceId || undefined,
      details: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        mortgageType: data.mortgageType,
        propertyType: data.propertyType,
        purchasePrice: data.purchasePrice,
        downPayment: data.downPayment,
        mortgageAmount: data.mortgageAmount,
        amortizationPeriod: data.amortizationPeriod,
        preferredTerm: data.preferredTerm,
        employmentStatus: data.employmentStatus,
        annualIncome: data.annualIncome,
        currentMortgageBalance: data.currentMortgageBalance,
        currentLender: data.currentLender,
        creditScore: data.creditScore,
        firstTimeBuyer: data.firstTimeBuyer,
        closingDate: data.closingDate,
        notes: data.notes,
      }
    });

    setIsSubmitting(false);
    toast({
      description: "Thank you for your mortgage inquiry. A specialist will contact you shortly.",
    });
  };

  const mortgageType = watch("mortgageType");

  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Mortgage Quote</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl">
            Find the best mortgage rates in Ontario. Whether buying, refinancing, or renewing, we connect you with top lenders.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 -mt-8">
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calculator className="text-accent" /> Mortgage Calculator</CardTitle>
            <CardDescription>Estimate your monthly mortgage payments based on your loan details.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Mortgage Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      value={calcPrincipal} 
                      onChange={(e) => setCalcPrincipal(Number(e.target.value))}
                      className="pl-9"
                      data-testid="calc-principal"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Interest Rate (%)</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={calcRate} 
                    onChange={(e) => setCalcRate(Number(e.target.value))}
                    data-testid="calc-rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amortization Period (Years)</Label>
                  <Select value={String(calcAmortization)} onValueChange={(v) => setCalcAmortization(Number(v))}>
                    <SelectTrigger data-testid="calc-amortization">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 Years</SelectItem>
                      <SelectItem value="20">20 Years</SelectItem>
                      <SelectItem value="25">25 Years</SelectItem>
                      <SelectItem value="30">30 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Frequency</Label>
                  <Select value={calcPaymentFrequency} onValueChange={(v: "monthly" | "biweekly" | "weekly") => setCalcPaymentFrequency(v)}>
                    <SelectTrigger data-testid="calc-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="bg-secondary/50 rounded-lg p-6 flex flex-col justify-center">
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-1">
                    {calcPaymentFrequency === "monthly" ? "Monthly" : calcPaymentFrequency === "biweekly" ? "Bi-Weekly" : "Weekly"} Payment
                  </p>
                  <p className="text-4xl font-bold text-accent" data-testid="calc-payment">
                    ${calculatorResults.payment.toLocaleString()}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Payment</p>
                    <p className="text-lg font-semibold" data-testid="calc-total">
                      ${calculatorResults.totalPayment.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Interest</p>
                    <p className="text-lg font-semibold text-orange-600" data-testid="calc-interest">
                      ${calculatorResults.totalInterest.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  *This is an estimate only. Actual rates and payments may vary.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="text-accent" /> Mortgage Application</CardTitle>
            <CardDescription>Tell us about your mortgage needs and we'll find the best rates for you.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input {...register("firstName")} placeholder="John" required data-testid="input-first-name" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input {...register("lastName")} placeholder="Smith" required data-testid="input-last-name" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" {...register("email")} placeholder="john@example.com" required data-testid="input-email" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input type="tel" {...register("phone")} placeholder="(416) 555-0123" required data-testid="input-phone" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Property Address</Label>
                <AddressAutocomplete
                  value={watch("address") || ""}
                  onChange={(value) => setValue("address", value)}
                  onPostalCodeChange={(postalCode) => setValue("postalCode", postalCode)}
                  placeholder="123 Main St, Toronto, ON"
                  data-testid="input-address"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input {...register("city")} placeholder="Toronto" autoComplete="address-level2" data-testid="input-city" />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input {...register("postalCode")} placeholder="M5V 3A8" required data-testid="input-postal-code" />
                </div>
                <div className="space-y-2">
                  <Label>Mortgage Type</Label>
                  <Select defaultValue="purchase" onValueChange={(v) => setValue("mortgageType", v)}>
                    <SelectTrigger data-testid="select-mortgage-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">New Purchase</SelectItem>
                      <SelectItem value="refinance">Refinance</SelectItem>
                      <SelectItem value="renewal">Renewal</SelectItem>
                      <SelectItem value="switch">Switch Lender</SelectItem>
                      <SelectItem value="equity">Home Equity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Select defaultValue="detached" onValueChange={(v) => setValue("propertyType", v)}>
                    <SelectTrigger data-testid="select-property-type">
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="detached">Detached House</SelectItem>
                      <SelectItem value="semi-detached">Semi-Detached</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="duplex">Duplex/Triplex</SelectItem>
                      <SelectItem value="cottage">Cottage/Vacation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>First Time Home Buyer?</Label>
                  <Select onValueChange={(v) => setValue("firstTimeBuyer", v)}>
                    <SelectTrigger data-testid="select-first-time-buyer">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(mortgageType === "purchase") && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Purchase Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="number" {...register("purchasePrice")} placeholder="500000" className="pl-9" data-testid="input-purchase-price" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Down Payment</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="number" {...register("downPayment")} placeholder="100000" className="pl-9" data-testid="input-down-payment" />
                    </div>
                  </div>
                </div>
              )}

              {(mortgageType === "refinance" || mortgageType === "renewal" || mortgageType === "switch") && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Current Mortgage Balance</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="number" {...register("currentMortgageBalance")} placeholder="350000" className="pl-9" data-testid="input-current-balance" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Lender</Label>
                    <Input {...register("currentLender")} placeholder="TD Bank" data-testid="input-current-lender" />
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mortgage Amount Needed</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="number" {...register("mortgageAmount")} placeholder="400000" className="pl-9" data-testid="input-mortgage-amount" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Estimated Closing Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="date" {...register("closingDate")} className="pl-9" data-testid="input-closing-date" />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amortization Period</Label>
                  <Select onValueChange={(v) => setValue("amortizationPeriod", v)}>
                    <SelectTrigger data-testid="select-amortization">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 Years</SelectItem>
                      <SelectItem value="20">20 Years</SelectItem>
                      <SelectItem value="25">25 Years</SelectItem>
                      <SelectItem value="30">30 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Term</Label>
                  <Select onValueChange={(v) => setValue("preferredTerm", v)}>
                    <SelectTrigger data-testid="select-term">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Year</SelectItem>
                      <SelectItem value="2">2 Years</SelectItem>
                      <SelectItem value="3">3 Years</SelectItem>
                      <SelectItem value="4">4 Years</SelectItem>
                      <SelectItem value="5">5 Years</SelectItem>
                      <SelectItem value="variable">Variable Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="text-accent" /> Financial Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Employment Status</Label>
                    <Select defaultValue="employed" onValueChange={(v) => setValue("employmentStatus", v)}>
                      <SelectTrigger data-testid="select-employment">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employed">Employed Full-Time</SelectItem>
                        <SelectItem value="part-time">Employed Part-Time</SelectItem>
                        <SelectItem value="self-employed">Self-Employed</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Annual Household Income</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="number" {...register("annualIncome")} placeholder="120000" className="pl-9" data-testid="input-annual-income" />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Estimated Credit Score</Label>
                    <Select onValueChange={(v) => setValue("creditScore", v)}>
                      <SelectTrigger data-testid="select-credit-score">
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent (760+)</SelectItem>
                        <SelectItem value="good">Good (700-759)</SelectItem>
                        <SelectItem value="fair">Fair (650-699)</SelectItem>
                        <SelectItem value="poor">Below 650</SelectItem>
                        <SelectItem value="unknown">Not Sure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Additional Notes or Questions</Label>
                <textarea 
                  {...register("notes")} 
                  placeholder="Any additional information about your mortgage needs..."
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm"
                  data-testid="textarea-notes"
                />
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
                  By checking this box, I give QuoteUs.ca and its business / industry partners permission to share details and contact me regarding this product or service.
                </label>
              </div>
              <div className="pt-4">
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white text-lg h-14" disabled={isSubmitting || !consentChecked} data-testid="button-submit">
                  {isSubmitting ? "Submitting..." : "Get My Mortgage Quote"}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  By submitting, you agree to be contacted by a licensed mortgage specialist.
                </p>

              </div>
            </form>
            <AdPlacement page="Mortgage" className="mt-6" />
          </CardContent>
        </Card>

        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Card className="text-center p-6">
            <div className="text-3xl font-bold text-accent mb-2">50+</div>
            <div className="text-sm text-muted-foreground">Lender Partners</div>
          </Card>
          <Card className="text-center p-6">
            <div className="text-3xl font-bold text-accent mb-2">Best</div>
            <div className="text-sm text-muted-foreground">Rate Guarantee</div>
          </Card>
          <Card className="text-center p-6">
            <div className="text-3xl font-bold text-accent mb-2">Free</div>
            <div className="text-sm text-muted-foreground">No-Obligation Quote</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
