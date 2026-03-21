import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VehicleSelector } from "@/components/VehicleSelector";
import { ArrowRightLeft, Shield, Zap, AlertTriangle, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

// ─── Vehicle class inference ──────────────────────────────────────────────────

type VehicleClass = "sedan" | "suv" | "truck" | "sports" | "minivan" | "other";

// Keywords in model names used to infer vehicle class
const CLASS_PATTERNS: { pattern: RegExp; cls: VehicleClass }[] = [
  { pattern: /\b(f-?\d{3}|silverado|sierra|ram|tundra|tacoma|colorado|ridgeline|titan|frontier|canyon|maverick|ranger)\b/i, cls: "truck" },
  { pattern: /\b(minivan|odyssey|sienna|caravan|pacifica|sedona|entourage)\b/i, cls: "minivan" },
  { pattern: /\b(suv|cr-v|rav4|highlander|pilot|pathfinder|explorer|escape|equinox|terrain|rogue|murano|sorento|sportage|santa fe|tucson|cx-5|cx-9|cx-50|4runner|sequoia|suburban|tahoe|yukon|armada|qx60|mdx|rdx|qx80|qx50|gx|lx|rx|nx|ux|traverse|envoy|blazer|trailblazer|wrangler|grand cherokee|cherokee|compass|defender|discovery|range rover|evoque|velar|x3|x5|x7|q5|q7|q8|gle|glb|glc|gls|e-pace|f-pace|i-pace|xt4|xt5|xt6|escalade|navigator|expedition|suburban|ascent|forester|outback|crosstrek|brz|wrx|cx-30|cx-3|hr-v|groove|trax|encore|envision|edge|flex|grand cherokee|durango)\b/i, cls: "suv" },
  { pattern: /\b(mustang|camaro|corvette|challenger|charger|viper|m3|m4|m5|m6|m8|amg|r8|rs3|rs4|rs5|rs6|rs7|gt3|gt4|cayman|boxster|911|supra|gr86|brz|mx-5|miata|rx-7|rx-8|370z|gt-r|s2000|type r|veloster|stinger|giulia|4c|alpine)\b/i, cls: "sports" },
  { pattern: /\b(civic|corolla|camry|accord|sonata|elantra|optima|forte|jetta|golf|passat|arteon|sentra|altima|maxima|versa|lancer|eclipse|galant|impreza|legacy|g35|g37|g70|g80|g90|ct5|ct6|a3|a4|a5|a6|a7|a8|c-class|e-class|s-class|3 series|5 series|7 series|is|es|gs|ls|hs|rc|3 series|7 series|series|ghibli|quattroporte|model 3|model s|model y|prius|yaris|vitz|fit|jazz|spark|beat|micra|kicks)\b/i, cls: "sedan" },
];

function inferVehicleClass(make: string, model: string): VehicleClass {
  const makeModel = `${make} ${model}`;
  for (const { pattern, cls } of CLASS_PATTERNS) {
    if (pattern.test(makeModel)) return cls;
  }
  return "other";
}

// ─── Insurance scoring data ───────────────────────────────────────────────────

// IBC Canada high-theft makes/models
const HIGH_THEFT_MODELS: Record<string, string[]> = {
  Honda: ["CR-V", "Civic", "Odyssey", "Pilot"],
  Toyota: ["Highlander", "Prado", "4Runner", "Sequoia", "Tundra"],
  Lexus: ["RX", "GX", "LX", "NX"],
  Ford: ["F-150", "F-250", "F-350", "Explorer", "Edge"],
  RAM: ["1500", "2500", "3500"],
  Dodge: ["Ram 1500", "Ram 2500", "Charger", "Challenger"],
  Chevrolet: ["Silverado", "Tahoe", "Suburban", "Equinox"],
  GMC: ["Sierra", "Yukon", "Terrain"],
  "Land Rover": ["Range Rover", "Discovery", "Defender"],
  "Range Rover": ["Range Rover", "Sport", "Evoque", "Velar"],
  Jeep: ["Grand Cherokee", "Wrangler"],
  Nissan: ["Rogue", "Armada", "Murano"],
  Hyundai: ["Santa Fe", "Tucson", "Sonata"],
  Kia: ["Sportage", "Sorento", "Stinger"],
};

const LUXURY_MAKES = [
  "BMW", "Mercedes", "Mercedes-Benz", "Audi", "Porsche",
  "Land Rover", "Range Rover", "Cadillac", "Infiniti", "Acura",
  "Genesis", "Volvo", "Jaguar", "Maserati", "Bentley",
  "Lamborghini", "Ferrari", "Rolls-Royce", "McLaren", "Alfa Romeo",
];

const ECONOMY_MAKES = ["Toyota", "Honda", "Mazda", "Subaru", "Mitsubishi", "Suzuki"];

// ─── Label types (per task spec) ─────────────────────────────────────────────
// Insurance Cost: 5 tiers
type InsuranceCostLabel = "Very Low" | "Low" | "Moderate" | "High" | "Very High";
// Theft Risk: 4 tiers
type TheftLabel = "Low" | "Medium" | "High" | "Very High";
// Maintenance Cost: 3 tiers
type MaintenanceLabel = "Low" | "Moderate" | "High";

interface VehicleInput {
  year: number | string;
  make: string;
  model: string;
  trim?: string;
}

interface VehicleScore {
  insuranceCost: InsuranceCostLabel;
  insuranceCostScore: number;
  safetyRating: number;
  safetyScore: number;
  theftRisk: TheftLabel;
  theftScore: number;
  maintenanceCost: MaintenanceLabel;
  maintenanceScore: number;
  totalScore: number;
}

interface CompareResult {
  winner: "car1" | "car2" | "tie";
  car1: VehicleInput & VehicleScore;
  car2: VehicleInput & VehicleScore;
  reasoning: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isHighTheft(make: string, model: string): boolean {
  return (HIGH_THEFT_MODELS[make] ?? []).some(
    m => model.toLowerCase().includes(m.toLowerCase())
  );
}

// ─── Scoring engine ───────────────────────────────────────────────────────────

function scoreVehicle(make: string, model: string, year: number | string): VehicleScore {
  const yr = parseInt(String(year));
  const cls = inferVehicleClass(make, model);
  const highTheft = isHighTheft(make, model);
  const luxury = LUXURY_MAKES.includes(make);
  const economy = ECONOMY_MAKES.includes(make);

  // ── Safety rating — class baseline + make adjustment ──────────────────────
  // Baselines by class (NHTSA/IIHS general patterns)
  let safetyBase: number;
  switch (cls) {
    case "minivan":  safetyBase = 9.1; break;
    case "sedan":    safetyBase = 8.8; break;
    case "suv":      safetyBase = 8.5; break;
    case "truck":    safetyBase = 7.9; break;
    case "sports":   safetyBase = 7.6; break;
    default:         safetyBase = 8.3; break;
  }
  // Make adjustments
  if (make === "Volvo")                        safetyBase += 0.5;
  else if (make === "Subaru")                  safetyBase += 0.3;
  else if (make === "Toyota" || make === "Honda") safetyBase += 0.2;
  else if (make === "Mazda")                   safetyBase += 0.2;
  else if (make === "Kia" || make === "Hyundai") safetyBase -= 0.1;
  // Year adjustment
  if (yr >= 2020)      safetyBase = Math.min(9.9, safetyBase + 0.3);
  else if (yr <= 2015) safetyBase = Math.max(5.5, safetyBase - 0.5);
  const safetyRating = parseFloat(safetyBase.toFixed(1));
  // safetyScore: lower = cheaper to insure (better safety)
  const safetyScore = safetyRating >= 9.0 ? 1 : safetyRating >= 8.5 ? 2 : safetyRating >= 7.5 ? 3 : 4;

  // ── Theft risk — class baseline + IBC model override ─────────────────────
  // Class-based baseline (Low=1, Medium=2, High=3, Very High=4)
  let theftScore: number;
  switch (cls) {
    case "sedan":   theftScore = 1; break; // sedans = Low baseline
    case "minivan": theftScore = 1; break;
    case "suv":     theftScore = 2; break; // SUVs = Medium baseline
    case "truck":   theftScore = 2; break; // trucks = Medium baseline
    case "sports":  theftScore = 2; break;
    default:        theftScore = 1; break;
  }
  // IBC model override — known high-theft vehicles
  if (highTheft) {
    theftScore = luxury ? 4 : 3;
  }
  const theftRisk: TheftLabel =
    theftScore === 1 ? "Low" :
    theftScore === 2 ? "Medium" :
    theftScore === 3 ? "High" : "Very High";

  // ── Maintenance cost — make reputation + class ────────────────────────────
  // Spec: Low / Moderate / High  (3 tiers)
  let maintenanceScore: number; // 1=Low, 2=Moderate, 3=High
  if (luxury && cls === "sports")   maintenanceScore = 3;
  else if (luxury)                  maintenanceScore = 3;
  else if (cls === "sports")        maintenanceScore = 3;
  else if (cls === "truck")         maintenanceScore = 2; // "Domestic trucks → Moderate"
  else if (economy)                 maintenanceScore = 1;
  else                              maintenanceScore = 2;

  const maintenanceCost: MaintenanceLabel =
    maintenanceScore === 1 ? "Low" :
    maintenanceScore === 2 ? "Moderate" : "High";

  // ── Insurance cost tier (5 tiers: Very Low/Low/Moderate/High/Very High) ───
  const combinedRaw = theftScore + safetyScore + maintenanceScore;
  // Range: 3 (safest/cheapest) to 11 (riskiest)
  let insuranceCostScore: number;
  if (combinedRaw <= 3)       insuranceCostScore = 1; // Very Low
  else if (combinedRaw <= 5)  insuranceCostScore = 2; // Low
  else if (combinedRaw <= 7)  insuranceCostScore = 3; // Moderate
  else if (combinedRaw <= 9)  insuranceCostScore = 4; // High
  else                        insuranceCostScore = 5; // Very High

  const insuranceCost: InsuranceCostLabel =
    insuranceCostScore === 1 ? "Very Low" :
    insuranceCostScore === 2 ? "Low" :
    insuranceCostScore === 3 ? "Moderate" :
    insuranceCostScore === 4 ? "High" : "Very High";

  return {
    insuranceCost,
    insuranceCostScore,
    safetyRating,
    safetyScore,
    theftRisk,
    theftScore,
    maintenanceCost,
    maintenanceScore,
    totalScore: theftScore + safetyScore + maintenanceScore,
  };
}

// ─── Dynamic reasoning ────────────────────────────────────────────────────────

function buildReasoning(
  v1: VehicleInput, s1: VehicleScore,
  v2: VehicleInput, s2: VehicleScore,
  winner: "car1" | "car2" | "tie"
): string {
  const n1 = `${v1.year} ${v1.make} ${v1.model}`;
  const n2 = `${v2.year} ${v2.make} ${v2.model}`;

  if (winner === "tie") {
    return `The ${n1} and ${n2} score similarly across theft risk, safety, and repair costs — either would likely cost about the same to insure in Ontario.`;
  }

  const cheaper = winner === "car1" ? n1 : n2;
  const pricier = winner === "car1" ? n2 : n1;
  const cs = winner === "car1" ? s1 : s2;
  const ps = winner === "car1" ? s2 : s1;

  const reasons: string[] = [];
  if (cs.theftScore < ps.theftScore)
    reasons.push(`lower theft risk (${cs.theftRisk} vs ${ps.theftRisk})`);
  if (cs.maintenanceScore < ps.maintenanceScore)
    reasons.push(`lower repair costs (${cs.maintenanceCost} vs ${ps.maintenanceCost} maintenance)`);
  if (cs.safetyScore < ps.safetyScore)
    reasons.push(`better safety ratings (${cs.safetyRating}/10 vs ${ps.safetyRating}/10)`);

  if (reasons.length === 0) {
    return `The ${cheaper} is generally cheaper to insure than the ${pricier} based on its overall risk profile.`;
  }

  return `The ${cheaper} is typically cheaper to insure than the ${pricier} due to its ${reasons.join(" and ")}.`;
}

// ─── Colour map ───────────────────────────────────────────────────────────────

const LABEL_COLORS: Record<string, string> = {
  "Very Low": "text-green-600",
  "Low":      "text-green-500",
  "Moderate": "text-yellow-600",
  "Medium":   "text-yellow-600",
  "High":     "text-orange-500",
  "Very High":"text-red-600",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [result, setResult] = useState<CompareResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const form = useForm({
    defaultValues: {
      vehicles: [
        { year: 2022, make: "Honda", model: "Civic" },
        { year: 2022, make: "BMW", model: "3 Series" }
      ]
    }
  });

  const onCompare = async () => {
    setIsComparing(true);
    await new Promise(r => setTimeout(r, 800));

    const v1 = form.getValues("vehicles.0") as VehicleInput;
    const v2 = form.getValues("vehicles.1") as VehicleInput;

    const s1 = scoreVehicle(v1.make, v1.model, v1.year);
    const s2 = scoreVehicle(v2.make, v2.model, v2.year);

    const winner: "car1" | "car2" | "tie" =
      s1.totalScore === s2.totalScore ? "tie" :
      s1.totalScore < s2.totalScore ? "car1" : "car2";

    setResult({
      winner,
      car1: { ...v1, ...s1 },
      car2: { ...v2, ...s2 },
      reasoning: buildReasoning(v1, s1, v2, s2, winner),
    });

    setIsComparing(false);
  };

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Vehicle Comparison Tool</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            See how different vehicles compare for insurance costs, safety, and risk factors.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 -mt-8">
        <Card className="shadow-xl border-none">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-[1fr,auto,1fr] gap-8 items-center">

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold">A</div>
                  <h3 className="font-bold text-lg">First Vehicle</h3>
                </div>
                <VehicleSelector
                  index={0}
                  register={form.register}
                  setValue={form.setValue}
                  watch={form.watch}
                />
              </div>

              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg z-10">
                  <ArrowRightLeft size={20} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-secondary-foreground text-white flex items-center justify-center font-bold">B</div>
                  <h3 className="font-bold text-lg">Second Vehicle</h3>
                </div>
                <VehicleSelector
                  index={1}
                  register={form.register}
                  setValue={form.setValue}
                  watch={form.watch}
                />
              </div>

            </div>

            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-white text-lg px-12 h-14"
                onClick={onCompare}
                disabled={isComparing}
              >
                {isComparing ? "Analyzing..." : "Compare Insurance Costs"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 space-y-8"
          >
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-serif font-bold text-primary mb-2">Comparison Results</h2>
              <p className="text-lg text-muted-foreground">{result.reasoning}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {(["car1", "car2"] as const).map((key) => {
                const car = result[key];
                const isWinner = result.winner === key;
                const isTie = result.winner === "tie";

                return (
                  <Card
                    key={key}
                    className={`border-t-4 shadow-lg ${
                      isWinner
                        ? "border-t-green-500 ring-2 ring-green-500/20"
                        : isTie
                        ? "border-t-blue-400"
                        : "border-t-primary"
                    }`}
                  >
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-2xl">
                        {car.year} {car.make} {car.model}
                      </CardTitle>
                      {isWinner && (
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide">
                          Lower Rate
                        </span>
                      )}
                      {isTie && (
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide">
                          Similar Rate
                        </span>
                      )}
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-center border-b pb-4">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <TrendingDown size={16} /> Insurance Cost
                        </span>
                        <span className={`font-semibold ${LABEL_COLORS[car.insuranceCost] ?? ""}`}>
                          {car.insuranceCost}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-4">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Shield size={16} /> Safety Rating
                        </span>
                        <span className="font-semibold">{car.safetyRating}/10</span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-4">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <AlertTriangle size={16} /> Theft Risk
                        </span>
                        <span className={`font-semibold ${LABEL_COLORS[car.theftRisk] ?? ""}`}>
                          {car.theftRisk}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Zap size={16} /> Maintenance Cost
                        </span>
                        <span className={`font-semibold ${LABEL_COLORS[car.maintenanceCost] ?? ""}`}>
                          {car.maintenanceCost}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="mt-16 text-sm text-muted-foreground bg-secondary/20 p-6 rounded-lg">
          <h4 className="font-bold mb-2 text-primary">Vehicle Comparison Tool Notes</h4>
          <p>
            Please note: our vehicle comparison tool provides general estimates only and is not an exact science.
            It's designed to give you a rough idea of which vehicles may cost more or less to insure based on
            typical trends including theft risk, safety ratings, and repair costs. Actual insurance rates can vary
            depending on your personal details and driving profile. Always get a formal quote for accurate pricing.
          </p>
        </div>
      </div>
    </div>
  );
}
