import { useState } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuotes } from "@/lib/QuoteContext";
import AdPlacement from "@/components/AdPlacement";
import {
  Shield,
  CheckCircle2,
  Info,
  RotateCcw,
  Pencil,
  Loader2,
  Home,
  FileText,
  Users,
  MapPin,
} from "lucide-react";

interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  contactType: string;
  // Your address
  propertyUnit?: string;
  propertyStreet: string;
  propertyCity: string;
  propertyProvince: string;
  propertyPostal: string;
  // Rental address (when different)
  rentalUnit?: string;
  rentalStreet?: string;
  rentalCity?: string;
  rentalProvince?: string;
  rentalPostal?: string;
  monthlyRentalCost: number;
  referenceId?: string;
}

interface SubmittedInfo {
  fullName: string;
  contactType: string;
  propertyAddress: string;
  rentalAddress: string;
  monthlyRentalCost: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const CheckItem = ({ children, sub }: { children: React.ReactNode; sub?: boolean }) => (
  <li className={`flex items-start gap-2 ${sub ? "ml-6" : ""}`}>
    <CheckCircle2 className={`mt-0.5 shrink-0 ${sub ? "h-4 w-4 text-green-400" : "h-5 w-5 text-green-500"}`} />
    <span className={sub ? "text-sm text-muted-foreground" : "text-sm"}>{children}</span>
  </li>
);

const CONTACT_TYPES = ["Owner", "Landlord", "Real Estate Agent", "Other"];

const PROVINCES = [
  { value: "ON", label: "ON — Ontario" },
  { value: "AB", label: "AB — Alberta" },
  { value: "BC", label: "BC — British Columbia" },
  { value: "MB", label: "MB — Manitoba" },
  { value: "NB", label: "NB — New Brunswick" },
  { value: "NL", label: "NL — Newfoundland & Labrador" },
  { value: "NS", label: "NS — Nova Scotia" },
  { value: "NT", label: "NT — Northwest Territories" },
  { value: "NU", label: "NU — Nunavut" },
  { value: "PE", label: "PE — Prince Edward Island" },
  { value: "SK", label: "SK — Saskatchewan" },
  { value: "YT", label: "YT — Yukon" },
];

export default function RentGuaranteePage() {
  const { toast } = useToast();
  const { addQuote } = useQuotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedInfo | null>(null);
  const [editing, setEditing] = useState(false);
  const [contactType, setContactType] = useState("");
  const [sameAddress, setSameAddress] = useState<"yes" | "no">("yes");
  const [propertyProvince, setPropertyProvince] = useState("ON");
  const [rentalProvince, setRentalProvince] = useState("ON");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>();

  const buildAddress = (unit: string | undefined, street: string, city: string, province: string, postal: string) => {
    const parts: string[] = [];
    if (unit) parts.push(`Unit ${unit}`);
    parts.push(street);
    parts.push(`${city}, ${province} ${postal.toUpperCase()}`);
    return parts.join(", ");
  };

  const onSubmit = async (data: FormValues) => {
    if (!contactType) {
      toast({ title: "Please select a contact type", variant: "destructive" });
      return;
    }
    if (sameAddress === "no" && (!data.rentalStreet || !data.rentalCity || !data.rentalPostal)) {
      toast({ title: "Please complete the rental property address", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));

    const propertyAddress = buildAddress(
      data.propertyUnit,
      data.propertyStreet,
      data.propertyCity,
      propertyProvince,
      data.propertyPostal
    );

    const finalRentalAddress =
      sameAddress === "yes"
        ? propertyAddress
        : buildAddress(
            data.rentalUnit,
            data.rentalStreet!,
            data.rentalCity!,
            rentalProvince,
            data.rentalPostal!
          );

    addQuote({
      type: "Rent Guarantee",
      clientName: data.fullName,
      email: data.email,
      phone: data.phone,
      postalCode: data.propertyPostal.toUpperCase(),
      referenceId: data.referenceId || undefined,
      details: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        contactType,
        propertyAddress,
        rentalAddress: finalRentalAddress,
        monthlyRentalCost: data.monthlyRentalCost,
      },
    });

    const info: SubmittedInfo = {
      fullName: data.fullName,
      contactType,
      propertyAddress,
      rentalAddress: finalRentalAddress,
      monthlyRentalCost: data.monthlyRentalCost,
    };

    try {
      localStorage.setItem("rentGuaranteeSubmission", JSON.stringify(info));
    } catch (_) {}

    setSubmitted(info);
    setEditing(false);
    setIsSubmitting(false);

    toast({
      title: "Request Received!",
      description: "Your rent guarantee request has been submitted. We will be in touch shortly.",
    });
  };

  const handleReset = () => {
    reset();
    setSubmitted(null);
    setEditing(false);
    setContactType("");
    setSameAddress("yes");
    setPropertyProvince("ON");
    setRentalProvince("ON");
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const showForm = !submitted || editing;

  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      {/* Hero */}
      <div className="bg-primary text-white py-14 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-accent" />
              <Badge className="bg-accent text-white text-xs px-3 py-1">Rent Guarantee</Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-3xl md:text-5xl font-serif font-bold mb-4">
              Rent Guarantee Protection for Landlords
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg text-primary-foreground/80 max-w-2xl mb-6">
              Secure your rental income and protect your investment.
            </motion.p>
            <motion.div variants={fadeUp}>
              <a href="#landlord-form">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-white font-semibold px-8" data-testid="button-hero-cta">
                  Get Protected Now
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Availability Notice */}
      <div className="container mx-auto max-w-3xl px-4 mt-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3"
          data-testid="availability-notice"
        >
          <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 font-medium">
            This product is not available in Quebec.
          </p>
        </motion.div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 mt-6 space-y-6">
        {/* What Rent Guarantee Covers */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <Card className="shadow-md border-none bg-green-50/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                What Rent Guarantee Covers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3" data-testid="covers-list">
                <CheckItem>Up to 12 months of unpaid rent covered (max $60,000)</CheckItem>
                <CheckItem>Up to $1,500 in legal / eviction cost coverage</CheckItem>
                <CheckItem>Up to $10,000 in damage reimbursement</CheckItem>
                <CheckItem>1 month of abandoned tenancy coverage</CheckItem>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tenant Qualifications */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <Card className="shadow-md border-none bg-blue-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Tenant Qualifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3" data-testid="qualifications-list">
                <CheckItem>Household total rent-to-income ratio of under 45%</CheckItem>
                <CheckItem>No bankruptcy, judgements, or previous evictions reported in the last 3 years</CheckItem>
                <CheckItem>At least one member of the household is employed</CheckItem>
                <CheckItem>Government ID required</CheckItem>
                <CheckItem>Proof of income / employment</CheckItem>
              </ul>
              <div className="mt-4 border-l-2 border-blue-200 pl-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">Existing tenants of 1+ years:</p>
                <ul className="space-y-2">
                  <CheckItem sub>Proof of payment for those months</CheckItem>
                  <CheckItem sub>No rent arrears greater than 5 days in current tenancy</CheckItem>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Documents Required */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <Card className="shadow-md border-none bg-slate-50/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-600" />
                Documents Required
              </CardTitle>
              <CardDescription>Required at time of claim (not for approval)</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3" data-testid="documents-list">
                <CheckItem>Executed lease agreement</CheckItem>
                <CheckItem>Tenant screening / credit report</CheckItem>
                <CheckItem>Proof of income</CheckItem>
                <CheckItem>Rent payment history</CheckItem>
                <CheckItem>Move-in inspection with photos (only required for property damage claims)</CheckItem>
                <CheckItem>Proof of property ownership</CheckItem>
                <CheckItem>Proof of renters insurance</CheckItem>
                <CheckItem>Proof of property insurance</CheckItem>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Landlord Form */}
        <motion.div id="landlord-form" initial="hidden" animate="visible" variants={fadeUp}>
          <AnimatePresence mode="wait">
            {showForm ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35 }}
              >
                <Card className="shadow-lg border-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="text-accent h-5 w-5" />
                      Landlord Information
                    </CardTitle>
                    <CardDescription>
                      {editing
                        ? "Update your details and resubmit."
                        : "Fill in your property details to receive your rent guarantee quote."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                      {/* Full Name */}
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          placeholder="Jane Smith"
                          data-testid="input-full-name"
                          {...register("fullName", { required: "Full name is required" })}
                        />
                        {errors.fullName && (
                          <p className="text-xs text-red-600">{errors.fullName.message}</p>
                        )}
                      </div>

                      {/* Email & Phone */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="jane@example.com"
                            data-testid="input-email"
                            {...register("email", {
                              required: "Email is required",
                              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" },
                            })}
                          />
                          {errors.email && (
                            <p className="text-xs text-red-600">{errors.email.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="(416) 555-1234"
                            data-testid="input-phone"
                            {...register("phone", {
                              required: "Phone number is required",
                              pattern: { value: /^[\d\s\-().+]{7,20}$/, message: "Enter a valid phone number" },
                            })}
                          />
                          {errors.phone && (
                            <p className="text-xs text-red-600">{errors.phone.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Contact Type */}
                      <div className="space-y-2">
                        <Label htmlFor="contactType">Contact Type *</Label>
                        <Select value={contactType} onValueChange={setContactType}>
                          <SelectTrigger data-testid="select-contact-type">
                            <SelectValue placeholder="Select your role..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTACT_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!contactType && (
                          <p className="text-xs text-muted-foreground">Are you the property owner, landlord, a real estate agent, or other?</p>
                        )}
                      </div>

                      {/* Property / Contact Address */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          Your Address *
                        </Label>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="propertyUnit" className="text-xs text-muted-foreground">Unit # (optional)</Label>
                            <Input
                              id="propertyUnit"
                              placeholder="4B"
                              data-testid="input-property-unit"
                              {...register("propertyUnit")}
                            />
                          </div>
                          <div className="col-span-3 space-y-1.5">
                            <Label htmlFor="propertyStreet" className="text-xs text-muted-foreground">Street Address *</Label>
                            <Input
                              id="propertyStreet"
                              placeholder="123 Maple Street"
                              data-testid="input-property-street"
                              {...register("propertyStreet", { required: "Street address is required" })}
                            />
                            {errors.propertyStreet && (
                              <p className="text-xs text-red-600">{errors.propertyStreet.message}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="propertyCity" className="text-xs text-muted-foreground">City *</Label>
                            <Input
                              id="propertyCity"
                              placeholder="Toronto"
                              data-testid="input-property-city"
                              {...register("propertyCity", { required: "City is required" })}
                            />
                            {errors.propertyCity && (
                              <p className="text-xs text-red-600">{errors.propertyCity.message}</p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Province *</Label>
                            <Select value={propertyProvince} onValueChange={setPropertyProvince}>
                              <SelectTrigger data-testid="select-property-province">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PROVINCES.map((p) => (
                                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="propertyPostal" className="text-xs text-muted-foreground">Postal Code *</Label>
                            <Input
                              id="propertyPostal"
                              placeholder="M5A 1A1"
                              maxLength={7}
                              className="uppercase"
                              data-testid="input-property-postal"
                              {...register("propertyPostal", { required: "Postal code is required" })}
                            />
                            {errors.propertyPostal && (
                              <p className="text-xs text-red-600">{errors.propertyPostal.message}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Same rental address? */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          Is the rental property address the same as above? *
                        </Label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setSameAddress("yes")}
                            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                              sameAddress === "yes"
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-gray-700 border-gray-300 hover:border-primary/50"
                            }`}
                            data-testid="button-same-address-yes"
                          >
                            Yes, same address
                          </button>
                          <button
                            type="button"
                            onClick={() => setSameAddress("no")}
                            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                              sameAddress === "no"
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-gray-700 border-gray-300 hover:border-primary/50"
                            }`}
                            data-testid="button-same-address-no"
                          >
                            No, different address
                          </button>
                        </div>
                      </div>

                      {/* Rental Address fields (shown when "No") */}
                      <AnimatePresence>
                        {sameAddress === "no" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4">
                              <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> Rental Property Address
                              </p>
                              <div className="grid grid-cols-4 gap-3">
                                <div className="space-y-1.5">
                                  <Label htmlFor="rentalUnit" className="text-xs text-muted-foreground">Unit # (optional)</Label>
                                  <Input
                                    id="rentalUnit"
                                    placeholder="4B"
                                    data-testid="input-rental-unit"
                                    {...register("rentalUnit")}
                                  />
                                </div>
                                <div className="col-span-3 space-y-1.5">
                                  <Label htmlFor="rentalStreet" className="text-xs text-muted-foreground">Street Address *</Label>
                                  <Input
                                    id="rentalStreet"
                                    placeholder="456 Oak Ave"
                                    data-testid="input-rental-street"
                                    {...register("rentalStreet", {
                                      validate: (v) =>
                                        sameAddress === "no" && !v
                                          ? "Street address is required"
                                          : true,
                                    })}
                                  />
                                  {errors.rentalStreet && (
                                    <p className="text-xs text-red-600">{errors.rentalStreet.message}</p>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                  <Label htmlFor="rentalCity" className="text-xs text-muted-foreground">City *</Label>
                                  <Input
                                    id="rentalCity"
                                    placeholder="Toronto"
                                    data-testid="input-rental-city"
                                    {...register("rentalCity", {
                                      validate: (v) =>
                                        sameAddress === "no" && !v ? "City is required" : true,
                                    })}
                                  />
                                  {errors.rentalCity && (
                                    <p className="text-xs text-red-600">{errors.rentalCity.message}</p>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Province *</Label>
                                  <Select value={rentalProvince} onValueChange={setRentalProvince}>
                                    <SelectTrigger data-testid="select-rental-province">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PROVINCES.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor="rentalPostal" className="text-xs text-muted-foreground">Postal Code *</Label>
                                  <Input
                                    id="rentalPostal"
                                    placeholder="M6K 2P3"
                                    maxLength={7}
                                    className="uppercase"
                                    data-testid="input-rental-postal"
                                    {...register("rentalPostal", {
                                      validate: (v) =>
                                        sameAddress === "no" && !v ? "Postal code is required" : true,
                                    })}
                                  />
                                  {errors.rentalPostal && (
                                    <p className="text-xs text-red-600">{errors.rentalPostal.message}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Monthly Rental Cost */}
                      <div className="space-y-2">
                        <Label htmlFor="monthlyRentalCost">Monthly Rental Cost ($) *</Label>
                        <Input
                          id="monthlyRentalCost"
                          type="number"
                          min={1}
                          placeholder="2500"
                          data-testid="input-monthly-rental-cost"
                          {...register("monthlyRentalCost", {
                            required: "Monthly rental cost is required",
                            min: { value: 1, message: "Must be greater than $0" },
                            valueAsNumber: true,
                          })}
                        />
                        {errors.monthlyRentalCost && (
                          <p className="text-xs text-red-600">{errors.monthlyRentalCost.message}</p>
                        )}
                      </div>

                      {/* Reference ID */}
                      <div className="space-y-2">
                        <Label htmlFor="referenceId">Reference ID (optional)</Label>
                        <Input
                          id="referenceId"
                          placeholder="e.g. ABC123 or ON0000001"
                          maxLength={12}
                          className="uppercase"
                          data-testid="input-reference-id"
                          {...register("referenceId")}
                        />
                        <p className="text-xs text-muted-foreground">If you were given a reference code, enter it here.</p>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          type="submit"
                          className="flex-1 bg-accent hover:bg-accent/90 text-white text-base h-11"
                          disabled={isSubmitting}
                          data-testid="button-submit"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Details"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleReset}
                          data-testid="button-reset"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                    <AdPlacement page="Rent Guarantee" className="mt-6" />
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* Submitted Info Card */
              <motion.div
                key="submitted"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35 }}
              >
                <Card className="shadow-lg border-none border-l-4 border-green-500" data-testid="submitted-info-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-6 w-6" />
                      Your rent guarantee request has been received.
                    </CardTitle>
                    <CardDescription>Here is a summary of the information submitted.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-secondary/40 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Full Name</p>
                        <p className="font-semibold" data-testid="submitted-full-name">{submitted?.fullName}</p>
                      </div>
                      <div className="bg-secondary/40 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Contact Type</p>
                        <p className="font-semibold" data-testid="submitted-contact-type">{submitted?.contactType}</p>
                      </div>
                      <div className="bg-secondary/40 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Your Address</p>
                        <p className="font-semibold" data-testid="submitted-property-address">{submitted?.propertyAddress}</p>
                      </div>
                      <div className="bg-secondary/40 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Rental Property Address</p>
                        <p className="font-semibold" data-testid="submitted-rental-address">{submitted?.rentalAddress}</p>
                      </div>
                      <div className="bg-secondary/40 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Monthly Rental Cost</p>
                        <p className="font-semibold text-green-700" data-testid="submitted-monthly-rental">
                          ${Number(submitted?.monthlyRentalCost).toLocaleString()}/mo
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" onClick={handleEdit} data-testid="button-edit-info">
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Info
                      </Button>
                      <Button variant="ghost" onClick={handleReset} data-testid="button-reset-form">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset Form
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
}
