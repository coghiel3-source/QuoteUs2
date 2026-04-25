import { useEffect, useState } from "react";
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
  DollarSign,
  Clock,
  Star,
  ChevronDown,
  Phone,
  Building2,
  AlertTriangle,
  ArrowRight,
  Lock,
} from "lucide-react";

interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  contactType: string;
  propertyUnit?: string;
  propertyStreet: string;
  propertyCity: string;
  propertyProvince: string;
  propertyPostal: string;
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
  visible: { transition: { staggerChildren: 0.12 } },
};

const CheckItem = ({ children, sub }: { children: React.ReactNode; sub?: boolean }) => (
  <li className={`flex items-start gap-2.5 ${sub ? "ml-5" : ""}`}>
    <CheckCircle2 className={`mt-0.5 shrink-0 ${sub ? "h-4 w-4 text-green-400" : "h-5 w-5 text-green-500"}`} />
    <span className={sub ? "text-sm text-muted-foreground" : "text-sm leading-relaxed"}>{children}</span>
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

const FAQ_ITEMS = [
  {
    q: "Who is eligible for Rent Guarantee?",
    a: "Landlords, property owners, and real estate agents managing residential rental properties across Canada (excluding Quebec) are eligible. The program is designed for both new and existing tenancies.",
  },
  {
    q: "How quickly can I get covered?",
    a: "Once your application is submitted and tenant screening is complete, coverage can typically be activated within 1–3 business days. A specialist will contact you to finalize details.",
  },
  {
    q: "What happens if my tenant stops paying rent?",
    a: "You file a claim with supporting documents (lease, payment history, and eviction notice if applicable). Coverage kicks in after a standard waiting period and can cover up to 12 months of lost rent, up to $60,000.",
  },
  {
    q: "Does my tenant need to know about this?",
    a: "No — Rent Guarantee is a landlord-facing protection policy. Your tenant does not need to be aware of or consent to it.",
  },
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Rent Guarantee for Landlords | QuoteUs.ca";
    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute("content") || "";
    if (desc) desc.setAttribute("content", "Protect your rental income with Rent Guarantee. Covers up to 12 months of unpaid rent (max $60,000), eviction costs, and property damage. Available across Canada. Get a free quote today.");
    return () => {
      document.title = prevTitle;
      if (desc) desc.setAttribute("content", prevDesc);
    };
  }, []);

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

    const propertyAddress = buildAddress(data.propertyUnit, data.propertyStreet, data.propertyCity, propertyProvince, data.propertyPostal);
    const finalRentalAddress = sameAddress === "yes" ? propertyAddress : buildAddress(data.rentalUnit, data.rentalStreet!, data.rentalCity!, rentalProvince, data.rentalPostal!);

    addQuote({
      type: "Rent Guarantee",
      clientName: data.fullName,
      email: data.email,
      phone: data.phone,
      postalCode: data.propertyPostal.toUpperCase(),
      referenceId: data.referenceId || undefined,
      details: { fullName: data.fullName, email: data.email, phone: data.phone, contactType, propertyAddress, rentalAddress: finalRentalAddress, monthlyRentalCost: data.monthlyRentalCost },
    });

    const info: SubmittedInfo = { fullName: data.fullName, contactType, propertyAddress, rentalAddress: finalRentalAddress, monthlyRentalCost: data.monthlyRentalCost };
    try { localStorage.setItem("rentGuaranteeSubmission", JSON.stringify(info)); } catch (_) {}

    setSubmitted(info);
    setEditing(false);
    setIsSubmitting(false);
    toast({ title: "Request Received!", description: "Your rent guarantee request has been submitted. A specialist will contact you shortly." });
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

  const showForm = !submitted || editing;

  return (
    <div className="bg-gray-50 min-h-screen pb-20">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/90 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="container mx-auto max-w-5xl relative">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1">
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
                <div className="bg-white/10 p-2 rounded-lg"><Shield className="h-6 w-6 text-accent" /></div>
                <Badge className="bg-accent/90 text-white text-xs px-3 py-1 font-semibold tracking-wide">RENT GUARANTEE</Badge>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-3xl md:text-5xl font-serif font-bold mb-4 leading-tight">
                Protect Your Rental Income.<br />
                <span className="text-accent">Sleep Easy.</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-base md:text-lg text-white/80 max-w-xl mb-8 leading-relaxed">
                Rent Guarantee protects Canadian landlords from lost rental income, legal costs, and property damage — even when tenants can't pay.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                <a href="#landlord-form">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 text-white font-semibold px-8 shadow-lg" data-testid="button-hero-cta">
                    Get a Free Quote <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <a href="tel:+14165550100">
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-white/5">
                    <Phone className="mr-2 h-4 w-4" /> Speak to an Expert
                  </Button>
                </a>
              </motion.div>
            </div>
            {/* Quick stats */}
            <motion.div variants={fadeUp} className="lg:w-72 w-full grid grid-cols-2 gap-3">
              {[
                { icon: <DollarSign className="h-5 w-5" />, value: "$60,000", label: "Max Rent Coverage" },
                { icon: <Clock className="h-5 w-5" />, value: "12 Months", label: "Unpaid Rent Covered" },
                { icon: <Building2 className="h-5 w-5" />, value: "$10,000", label: "Property Damage" },
                { icon: <Lock className="h-5 w-5" />, value: "$1,500", label: "Eviction Cost Cover" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                  <div className="text-accent mb-1 flex justify-center">{stat.icon}</div>
                  <div className="text-xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-white/70 mt-0.5 leading-tight">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Not available in Quebec notice ───────────────── */}
      <div className="container mx-auto max-w-5xl px-4 mt-5">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3" data-testid="availability-notice">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800"><strong>Note:</strong> This product is not available in Quebec.</p>
        </motion.div>
      </div>

      {/* ── Quote Form ───────────────────────────────────── */}
      <div id="landlord-form" className="container mx-auto max-w-3xl px-4 mt-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Request Your Rent Guarantee Quote</h2>
          <p className="text-muted-foreground mt-2 text-sm">Fill in your details below and a specialist will be in touch within 1 business day.</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
              <Card className="shadow-md border-0 overflow-hidden">
                <div className="bg-primary/5 border-b px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-gray-900">Landlord & Property Information</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{editing ? "Update your details and resubmit." : "All fields marked * are required."}</p>
                </div>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">

                    {/* ─ Section 1: Your Contact Info ─ */}
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                        Contact Information
                      </p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Full Name *</Label>
                          <Input id="fullName" placeholder="Jane Smith" data-testid="input-full-name" {...register("fullName", { required: "Full name is required" })} />
                          {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address *</Label>
                            <Input id="email" type="email" placeholder="jane@example.com" data-testid="input-email" {...register("email", { required: "Email is required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" } })} />
                            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Input id="phone" type="tel" placeholder="(416) 555-1234" data-testid="input-phone" {...register("phone", { required: "Phone number is required", pattern: { value: /^[\d\s\-().+]{7,20}$/, message: "Enter a valid phone number" } })} />
                            {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactType">Your Role *</Label>
                          <Select value={contactType} onValueChange={setContactType}>
                            <SelectTrigger data-testid="select-contact-type">
                              <SelectValue placeholder="Select your role (owner, agent, etc.)" />
                            </SelectTrigger>
                            <SelectContent>
                              {CONTACT_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {!contactType && <p className="text-xs text-muted-foreground">Are you the owner, landlord, a real estate agent, or other?</p>}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-dashed" />

                    {/* ─ Section 2: Your Address ─ */}
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                        Your Address
                      </p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="propertyUnit" className="text-xs text-muted-foreground">Unit # <span className="text-gray-400">(opt.)</span></Label>
                            <Input id="propertyUnit" placeholder="4B" data-testid="input-property-unit" {...register("propertyUnit")} />
                          </div>
                          <div className="col-span-3 space-y-1.5">
                            <Label htmlFor="propertyStreet" className="text-xs text-muted-foreground">Street Address *</Label>
                            <Input id="propertyStreet" placeholder="123 Maple Street" data-testid="input-property-street" {...register("propertyStreet", { required: "Street address is required" })} />
                            {errors.propertyStreet && <p className="text-xs text-red-600">{errors.propertyStreet.message}</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="propertyCity" className="text-xs text-muted-foreground">City *</Label>
                            <Input id="propertyCity" placeholder="Toronto" data-testid="input-property-city" {...register("propertyCity", { required: "City is required" })} />
                            {errors.propertyCity && <p className="text-xs text-red-600">{errors.propertyCity.message}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Province *</Label>
                            <Select value={propertyProvince} onValueChange={setPropertyProvince}>
                              <SelectTrigger data-testid="select-property-province"><SelectValue /></SelectTrigger>
                              <SelectContent>{PROVINCES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="propertyPostal" className="text-xs text-muted-foreground">Postal Code *</Label>
                            <Input id="propertyPostal" placeholder="M5A 1A1" maxLength={7} className="uppercase" data-testid="input-property-postal" {...register("propertyPostal", { required: "Postal code is required" })} />
                            {errors.propertyPostal && <p className="text-xs text-red-600">{errors.propertyPostal.message}</p>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-dashed" />

                    {/* ─ Section 3: Rental Property ─ */}
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                        Rental Property
                      </p>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm mb-3 block">Is the rental property address the same as your address above? *</Label>
                          <div className="flex gap-3">
                            {(["yes", "no"] as const).map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setSameAddress(val)}
                                className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${sameAddress === val ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-gray-700 border-gray-200 hover:border-primary/40 hover:bg-primary/5"}`}
                                data-testid={`button-same-address-${val}`}
                              >
                                {val === "yes" ? "Yes, same address" : "No, different address"}
                              </button>
                            ))}
                          </div>
                        </div>

                        <AnimatePresence>
                          {sameAddress === "no" && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                                <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5" /> Rental Property Address
                                </p>
                                <div className="grid grid-cols-4 gap-3">
                                  <div className="space-y-1.5">
                                    <Label htmlFor="rentalUnit" className="text-xs text-muted-foreground">Unit # <span className="text-gray-400">(opt.)</span></Label>
                                    <Input id="rentalUnit" placeholder="2A" data-testid="input-rental-unit" {...register("rentalUnit")} />
                                  </div>
                                  <div className="col-span-3 space-y-1.5">
                                    <Label htmlFor="rentalStreet" className="text-xs text-muted-foreground">Street Address *</Label>
                                    <Input id="rentalStreet" placeholder="456 Oak Ave" data-testid="input-rental-street" {...register("rentalStreet", { validate: (v) => sameAddress === "no" && !v ? "Street address is required" : true })} />
                                    {errors.rentalStreet && <p className="text-xs text-red-600">{errors.rentalStreet.message}</p>}
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-1.5">
                                    <Label htmlFor="rentalCity" className="text-xs text-muted-foreground">City *</Label>
                                    <Input id="rentalCity" placeholder="Toronto" data-testid="input-rental-city" {...register("rentalCity", { validate: (v) => sameAddress === "no" && !v ? "City is required" : true })} />
                                    {errors.rentalCity && <p className="text-xs text-red-600">{errors.rentalCity.message}</p>}
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Province *</Label>
                                    <Select value={rentalProvince} onValueChange={setRentalProvince}>
                                      <SelectTrigger data-testid="select-rental-province"><SelectValue /></SelectTrigger>
                                      <SelectContent>{PROVINCES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label htmlFor="rentalPostal" className="text-xs text-muted-foreground">Postal Code *</Label>
                                    <Input id="rentalPostal" placeholder="M6K 2P3" maxLength={7} className="uppercase" data-testid="input-rental-postal" {...register("rentalPostal", { validate: (v) => sameAddress === "no" && !v ? "Postal code is required" : true })} />
                                    {errors.rentalPostal && <p className="text-xs text-red-600">{errors.rentalPostal.message}</p>}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="space-y-2">
                          <Label htmlFor="monthlyRentalCost">Monthly Rental Amount ($) *</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="monthlyRentalCost" type="number" min={1} placeholder="2500" className="pl-8" data-testid="input-monthly-rental-cost" {...register("monthlyRentalCost", { required: "Monthly rental cost is required", min: { value: 1, message: "Must be greater than $0" }, valueAsNumber: true })} />
                          </div>
                          {errors.monthlyRentalCost && <p className="text-xs text-red-600">{errors.monthlyRentalCost.message}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-dashed" />

                    {/* ─ Reference ID ─ */}
                    <div className="space-y-2">
                      <Label htmlFor="referenceId" className="flex items-center gap-2">
                        Reference ID <Badge variant="outline" className="text-[10px] font-normal">Optional</Badge>
                      </Label>
                      <Input id="referenceId" placeholder="e.g. ABC123 or ON0000001" maxLength={12} className="uppercase" data-testid="input-reference-id" {...register("referenceId")} />
                      <p className="text-xs text-muted-foreground">If you were referred by a broker or partner, enter their code here.</p>
                    </div>

                    {/* ─ Submit ─ */}
                    <div className="flex gap-3 pt-2">
                      <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 text-white text-base h-12 font-semibold shadow-sm" disabled={isSubmitting} data-testid="button-submit">
                        {isSubmitting ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                        ) : (
                          <><Shield className="mr-2 h-4 w-4" /> Submit & Get Protected</>
                        )}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleReset} className="px-4" data-testid="button-reset">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                      <Lock className="h-3 w-3" /> Your information is private and never shared without consent.
                    </p>
                  </form>
                  <AdPlacement page="Rent Guarantee" className="mt-6" />
                </CardContent>
              </Card>
            </motion.div>

          ) : (
            /* ── Submission Confirmation ── */
            <motion.div key="submitted" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
              <Card className="shadow-md border-0 overflow-hidden" data-testid="submitted-info-card">
                <div className="bg-green-500 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg"><CheckCircle2 className="h-6 w-6 text-white" /></div>
                    <div>
                      <h3 className="font-bold text-white text-lg">Request Received!</h3>
                      <p className="text-green-100 text-sm">A specialist will contact you within 1 business day.</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide text-xs mb-2">Submission Summary</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { label: "Full Name", value: submitted?.fullName },
                      { label: "Role", value: submitted?.contactType },
                      { label: "Your Address", value: submitted?.propertyAddress },
                      { label: "Rental Property", value: submitted?.rentalAddress },
                      { label: "Monthly Rent", value: `$${Number(submitted?.monthlyRentalCost).toLocaleString()}/mo`, accent: true },
                    ].map((item) => (
                      <div key={item.label} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{item.label}</p>
                        <p className={`font-semibold text-sm ${item.accent ? "text-green-700" : "text-gray-900"}`} data-testid={`submitted-${item.label.toLowerCase().replace(/\s/g, "-")}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setEditing(true)} data-testid="button-edit-info">
                      <Pencil className="mr-2 h-4 w-4" /> Edit Info
                    </Button>
                    <Button variant="ghost" onClick={handleReset} data-testid="button-reset-form">
                      <RotateCcw className="mr-2 h-4 w-4" /> New Submission
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── How it Works ─────────────────────────────────── */}
      <div className="container mx-auto max-w-5xl px-4 mt-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
          <motion.div variants={fadeUp} className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">How Rent Guarantee Works</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl mx-auto">Simple three-step process — from application to protected income</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", icon: <FileText className="h-6 w-6 text-primary" />, title: "Submit Your Request", desc: "Fill out the short form below with your property and contact information. It takes under 3 minutes." },
              { step: "02", icon: <Users className="h-6 w-6 text-primary" />, title: "Tenant Screening", desc: "A specialist reviews your tenant's qualifications — income, credit, and rental history — on your behalf." },
              { step: "03", icon: <Shield className="h-6 w-6 text-primary" />, title: "Your Property is Protected", desc: "Coverage activates. If rent goes unpaid, you file a claim and get reimbursed — it's that simple." },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-5xl font-black text-gray-100 absolute top-4 right-5 leading-none select-none">{item.step}</div>
                <div className="bg-primary/10 p-2.5 rounded-xl w-fit mb-4">{item.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Coverage + Qualifications (side-by-side) ─────── */}
      <div className="container mx-auto max-w-5xl px-4 mt-10">
        <div className="grid md:grid-cols-2 gap-6">

          {/* What's Covered */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <Card className="h-full border-0 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg"><Shield className="h-5 w-5 text-green-600" /></div>
                  <CardTitle className="text-lg">What's Covered</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3" data-testid="covers-list">
                  <CheckItem>Up to <strong>12 months</strong> of unpaid rent covered</CheckItem>
                  <CheckItem>Maximum <strong>$60,000</strong> in rental income protection</CheckItem>
                  <CheckItem>Up to <strong>$1,500</strong> in legal & eviction cost coverage</CheckItem>
                  <CheckItem>Up to <strong>$10,000</strong> in property damage reimbursement</CheckItem>
                  <CheckItem>1 month of <strong>abandoned tenancy</strong> coverage</CheckItem>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tenant Qualifications */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <Card className="h-full border-0 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
                  <CardTitle className="text-lg">Tenant Qualifications</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3" data-testid="qualifications-list">
                  <CheckItem>Rent-to-income ratio <strong>under 45%</strong></CheckItem>
                  <CheckItem>No bankruptcy, judgements, or evictions in <strong>last 3 years</strong></CheckItem>
                  <CheckItem>At least <strong>one member employed</strong> in the household</CheckItem>
                  <CheckItem>Government-issued <strong>photo ID</strong> required</CheckItem>
                  <CheckItem><strong>Proof of income</strong> / employment letter</CheckItem>
                </ul>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-2">
                  <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5" /> Existing Tenants (1+ Years)
                  </p>
                  <ul className="space-y-2">
                    <CheckItem sub>Proof of on-time payments for those months</CheckItem>
                    <CheckItem sub>No rent arrears greater than 5 days in current tenancy</CheckItem>
                    <CheckItem sub>Executed lease</CheckItem>
                    <CheckItem sub>Property insurance (Owner)</CheckItem>
                    <CheckItem sub><em>Other terms may apply</em></CheckItem>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ── Documents Required ───────────────────────────── */}
      <div className="container mx-auto max-w-5xl px-4 mt-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg"><FileText className="h-5 w-5 text-slate-600" /></div>
                <div>
                  <CardTitle className="text-lg">Documents Required at Claim Time</CardTitle>
                  <CardDescription className="text-xs mt-0.5">These are not needed for approval — only when filing a claim</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5" data-testid="documents-list">
                {[
                  "Executed lease agreement",
                  "Tenant screening / credit report",
                  "Proof of income",
                  "Rent payment history",
                  "Proof of property ownership",
                  "Proof of renters coverage",
                  "Proof of property coverage",
                  "Move-in inspection with photos (damage claims only)",
                ].map((doc) => (
                  <div key={doc} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700">{doc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <div className="container mx-auto max-w-3xl px-4 mt-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
          <motion.div variants={fadeUp} className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p className="text-muted-foreground mt-2 text-sm">Everything landlords need to know about Rent Guarantee coverage</p>
          </motion.div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <motion.div key={i} variants={fadeUp}>
                <button
                  className="w-full text-left bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-start justify-between gap-4 hover:border-primary/30 hover:bg-primary/5 transition-colors group"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  data-testid={`faq-toggle-${i}`}
                >
                  <span className="font-medium text-gray-900 text-sm leading-relaxed">{item.q}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="bg-white border border-t-0 border-gray-100 rounded-b-xl px-5 py-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Bottom CTA ───────────────────────────────────── */}
      <div className="container mx-auto max-w-3xl px-4 mt-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <div className="bg-primary rounded-2xl p-8 text-center text-white">
            <Shield className="h-10 w-10 text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Ready to Protect Your Rental Income?</h3>
            <p className="text-white/80 text-sm mb-6 max-w-md mx-auto">Join landlords across Canada who count on Rent Guarantee to keep their investment income stable.</p>
            <a href="#landlord-form">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-white font-semibold px-10 shadow-lg">
                Get My Free Quote <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
