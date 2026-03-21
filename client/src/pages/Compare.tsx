import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VehicleSelector } from "@/components/VehicleSelector";
import { ArrowRightLeft, Shield, Zap, AlertTriangle, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

// ─── Insurance scoring data ───────────────────────────────────────────────────

// IBC Canada high-theft makes/models (partial list of known high-risk vehicles)
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

// Luxury brands = higher repair/maintenance
const LUXURY_MAKES = ["BMW", "Mercedes", "Mercedes-Benz", "Audi", "Porsche", "Land Rover", "Range Rover", "Cadillac", "Infiniti", "Acura", "Genesis", "Volvo", "Jaguar", "Maserati", "Bentley", "Lamborghini", "Ferrari", "Rolls-Royce", "McLaren", "Alfa Romeo"];

// Japanese economy = lower repair/maintenance
const ECONOMY_MAKES = ["Toyota", "Honda", "Mazda", "Subaru", "Mitsubishi", "Suzuki"];

// Sports / performance models
const SPORTS_MODELS: Record<string, string[]> = {
  Ford: ["Mustang", "GT"],
  Chevrolet: ["Camaro", "Corvette"],
  Dodge: ["Challenger", "Charger", "Viper"],
  BMW: ["M3", "M4", "M5", "M6", "M8"],
  Mercedes: ["AMG", "SL", "GT"],
  "Mercedes-Benz": ["AMG", "SL", "GT"],
  Audi: ["R8", "RS3", "RS5", "RS7", "TT"],
  Porsche: ["911", "Cayman", "Boxster", "GT3", "GT4"],
  Nissan: ["GT-R", "370Z"],
  Subaru: ["WRX", "BRZ"],
  Toyota: ["GR86", "Supra"],
  Honda: ["Civic Type R", "S2000"],
  Volkswagen: ["GTI", "Golf R", "R32"],
  Kia: ["Stinger"],
  Hyundai: ["Veloster N", "Elantra N"],
  Mazda: ["MX-5", "RX-7", "RX-8"],
};

type RiskLabel = "Very Low" | "Low" | "Moderate" | "High" | "Very High";
type CostLabel = "Very Low" | "Low" | "Moderate" | "High" | "Very High";

interface VehicleScore {
  insuranceCost: CostLabel;
  insuranceCostScore: number;
  safetyRating: number;
  safetyScore: number;
  theftRisk: RiskLabel;
  theftScore: number;
  maintenanceCost: CostLabel;
  maintenanceScore: number;
  totalScore: number;
}

function isSportsModel(make: string, model: string): boolean {
  const models = SPORTS_MODELS[make] ?? [];
  return models.some(m => model.toLowerCase().includes(m.toLowerCase()));
}

function isHighTheft(make: string, model: string): boolean {
  const models = HIGH_THEFT_MODELS[make] ?? [];
  return models.some(m => model.toLowerCase().includes(m.toLowerCase()));
}

function isLuxury(make: string): boolean {
  return LUXURY_MAKES.includes(make);
}

function isEconomy(make: string): boolean {
  return ECONOMY_MAKES.includes(make);
}

function scoreLabel(score: number, thresholds: [number, RiskLabel][]): RiskLabel {
  for (const [max, label] of thresholds) {
    if (score <= max) return label;
  }
  return thresholds[thresholds.length - 1][1];
}

function scoreVehicle(make: string, model: string, year: string | number): VehicleScore {
  const yr = parseInt(String(year));
  const sports = isSportsModel(make, model);
  const highTheft = isHighTheft(make, model);
  const luxury = isLuxury(make);
  const economy = isEconomy(make);

  // ── Theft risk ──────────────────────────────────────────────────────────────
  let theftScore = 2; // default: Low
  if (highTheft) {
    theftScore = luxury ? 5 : 4; // Very High for luxury+high-theft, High otherwise
  } else if (luxury || make === "Ford" || make === "RAM" || make === "Chevrolet" || make === "GMC") {
    theftScore = 3; // Medium for trucks/SUV brands
  } else if (sports) {
    theftScore = 3;
  }
  const theftRisk: RiskLabel = scoreLabel(theftScore, [
    [1, "Very Low"], [2, "Low"], [3, "Moderate"], [4, "High"], [5, "Very High"]
  ]);

  // ── Safety rating ───────────────────────────────────────────────────────────
  let safetyBase = 8.5;
  if (sports) safetyBase = 7.8;
  if (make === "Volvo") safetyBase = 9.5;
  if (make === "Subaru") safetyBase = 9.2;
  if (make === "Toyota" || make === "Honda") safetyBase = 9.0;
  if (make === "Mazda") safetyBase = 9.0;
  if (make === "Kia" || make === "Hyundai") safetyBase = 8.4;
  // Newer vehicles slightly safer
  if (yr >= 2020) safetyBase = Math.min(9.9, safetyBase + 0.3);
  else if (yr <= 2015) safetyBase = Math.max(6.0, safetyBase - 0.5);
  const safetyRating = parseFloat(safetyBase.toFixed(1));
  // Safety score: higher safety = lower insurance cost (inverse)
  const safetyScore = safetyRating >= 9.0 ? 1 : safetyRating >= 8.5 ? 2 : safetyRating >= 7.5 ? 3 : 4;

  // ── Maintenance / repair cost ────────────────────────────────────────────────
  let maintenanceScore = 2; // default Low
  if (luxury && sports) maintenanceScore = 5;
  else if (luxury) maintenanceScore = 4;
  else if (sports) maintenanceScore = 3;
  else if (economy) maintenanceScore = 1;
  const maintenanceCost: CostLabel = scoreLabel(maintenanceScore, [
    [1, "Very Low"], [2, "Low"], [3, "Moderate"], [4, "High"], [5, "Very High"]
  ]);

  // ── Overall insurance cost tier ──────────────────────────────────────────────
  const combinedRaw = theftScore + safetyScore + maintenanceScore;
  // combinedRaw range: 3 (cheapest) to 14 (most expensive)
  let insuranceCostScore: number;
  if (combinedRaw <= 4) insuranceCostScore = 1;
  else if (combinedRaw <= 6) insuranceCostScore = 2;
  else if (combinedRaw <= 8) insuranceCostScore = 3;
  else if (combinedRaw <= 11) insuranceCostScore = 4;
  else insuranceCostScore = 5;

  const insuranceCost: CostLabel = scoreLabel(insuranceCostScore, [
    [1, "Very Low"], [2, "Low"], [3, "Moderate"], [4, "High"], [5, "Very High"]
  ]);

  const totalScore = theftScore + safetyScore + maintenanceScore;

  return {
    insuranceCost,
    insuranceCostScore,
    safetyRating,
    safetyScore,
    theftRisk,
    theftScore,
    maintenanceCost,
    maintenanceScore,
    totalScore,
  };
}

function buildReasoning(
  v1: any, s1: VehicleScore,
  v2: any, s2: VehicleScore,
  winner: "car1" | "car2" | "tie"
): string {
  const n1 = `${v1.year} ${v1.make} ${v1.model}`;
  const n2 = `${v2.year} ${v2.make} ${v2.model}`;

  if (winner === "tie") {
    return `The ${n1} and ${n2} score similarly across theft risk, safety, and repair costs — either would cost about the same to insure in Ontario.`;
  }

  const cheaper = winner === "car1" ? n1 : n2;
  const pricier = winner === "car1" ? n2 : n1;
  const cs = winner === "car1" ? s1 : s2;
  const ps = winner === "car1" ? s2 : s1;

  const reasons: string[] = [];
  if (cs.theftScore < ps.theftScore) reasons.push(`lower theft risk (${cs.theftRisk} vs ${ps.theftRisk})`);
  if (cs.maintenanceScore < ps.maintenanceScore) reasons.push(`lower repair costs (${cs.maintenanceCost} vs ${ps.maintenanceCost} maintenance)`);
  if (cs.safetyScore < ps.safetyScore) reasons.push(`better safety ratings (${cs.safetyRating}/10 vs ${ps.safetyRating}/10)`);

  if (reasons.length === 0) {
    return `The ${cheaper} generally costs less to insure than the ${pricier} based on its overall risk profile.`;
  }

  return `The ${cheaper} is typically cheaper to insure than the ${pricier} due to its ${reasons.join(" and ")}.`;
}

const RISK_COLORS: Record<RiskLabel, string> = {
  "Very Low": "text-green-600",
  "Low": "text-green-500",
  "Moderate": "text-yellow-600",
  "High": "text-orange-500",
  "Very High": "text-red-600",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [result, setResult] = useState<any>(null);
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

    const v1 = form.getValues("vehicles.0");
    const v2 = form.getValues("vehicles.1");

    const s1 = scoreVehicle(v1.make, v1.model, v1.year);
    const s2 = scoreVehicle(v2.make, v2.model, v2.year);

    const diff = s1.totalScore - s2.totalScore;
    const winner: "car1" | "car2" | "tie" =
      Math.abs(diff) <= 1 ? "tie" : diff < 0 ? "car1" : "car2";

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
                      <CardTitle className="text-2xl">{car.year} {car.make} {car.model}</CardTitle>
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
                        <span className={`font-semibold ${RISK_COLORS[car.insuranceCost]}`}>
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
                        <span className={`font-semibold ${RISK_COLORS[car.theftRisk]}`}>
                          {car.theftRisk}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Zap size={16} /> Maintenance Cost
                        </span>
                        <span className={`font-semibold ${RISK_COLORS[car.maintenanceCost]}`}>
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
            Please note: our vehicle comparison tool provides general estimates only and is not an exact science. It's designed to give you a rough idea of which vehicles may cost more or less to insure based on typical trends including theft risk, safety ratings, and repair costs. Actual insurance rates can vary depending on your personal details and driving profile. Always get a formal quote for accurate pricing.
          </p>
        </div>
      </div>
    </div>
  );
}
