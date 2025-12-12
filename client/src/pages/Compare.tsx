import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { VehicleSelector } from "@/components/VehicleSelector";
import { ArrowRightLeft, Shield, DollarSign, Zap, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function ComparePage() {
  const [result, setResult] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);

  const form = useForm({
    defaultValues: {
      vehicles: [
        { year: 2022, make: "Honda", model: "Civic" },
        { year: 2022, make: "Toyota", model: "Corolla" }
      ]
    }
  });

  const onCompare = async () => {
    setIsComparing(true);
    // Simulate API
    await new Promise(r => setTimeout(r, 1500));
    
    const v1 = form.getValues("vehicles.0");
    const v2 = form.getValues("vehicles.1");

    setResult({
      winner: "car1", // Mock winner
      car1: {
        ...v1,
        monthly: 145,
        safetyRating: 9.5,
        theftRisk: "Low",
        maintenance: "Low"
      },
      car2: {
        ...v2,
        monthly: 158,
        safetyRating: 9.2,
        theftRisk: "Medium",
        maintenance: "Low"
      },
      reasoning: `${v1.make} ${v1.model} generally has lower repair costs and slightly better safety ratings in this model year compared to the ${v2.make} ${v2.model}.`
    });
    setIsComparing(false);
  };

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto max-w-5xl text-center">
           <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Vehicle Comparison Tool</h1>
           <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
             See how different vehicles stack up in terms of insurance costs, safety, and risk factors.
           </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 -mt-8">
        <Card className="shadow-xl border-none">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-[1fr,auto,1fr] gap-8 items-center">
              
              {/* Car A */}
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

              {/* VS Divider */}
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg z-10">
                  <ArrowRightLeft size={20} />
                </div>
              </div>

              {/* Car B */}
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
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-white text-lg px-12 h-14" onClick={onCompare} disabled={isComparing}>
                {isComparing ? "Analyzing..." : "Compare Insurance Costs"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
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
               {/* Result Card 1 */}
               <Card className={`border-t-4 ${result.winner === 'car1' ? 'border-t-green-500 ring-2 ring-green-500/20' : 'border-t-primary'} shadow-lg`}>
                 <CardHeader className="text-center pb-2">
                   <CardTitle className="text-2xl">{result.car1.year} {result.car1.make} {result.car1.model}</CardTitle>
                   {result.winner === 'car1' && <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide">Lower Rate</span>}
                 </CardHeader>
                 <CardContent className="p-6 space-y-6">
                    <div className="flex justify-between items-center border-b pb-4">
                      <span className="text-muted-foreground flex items-center gap-2"><DollarSign size={16} /> Est. Monthly</span>
                      <span className="text-3xl font-bold text-primary">${result.car1.monthly}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-4">
                      <span className="text-muted-foreground flex items-center gap-2"><Shield size={16} /> Safety Rating</span>
                      <span className="font-semibold">{result.car1.safetyRating}/10</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-4">
                      <span className="text-muted-foreground flex items-center gap-2"><AlertTriangle size={16} /> Theft Risk</span>
                      <span className="font-semibold">{result.car1.theftRisk}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2"><Zap size={16} /> Maintenance</span>
                      <span className="font-semibold">{result.car1.maintenance}</span>
                    </div>
                 </CardContent>
               </Card>

               {/* Result Card 2 */}
               <Card className={`border-t-4 ${result.winner === 'car2' ? 'border-t-green-500 ring-2 ring-green-500/20' : 'border-t-primary'} shadow-lg`}>
                 <CardHeader className="text-center pb-2">
                   <CardTitle className="text-2xl">{result.car2.year} {result.car2.make} {result.car2.model}</CardTitle>
                   {result.winner === 'car2' && <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide">Lower Rate</span>}
                 </CardHeader>
                 <CardContent className="p-6 space-y-6">
                    <div className="flex justify-between items-center border-b pb-4">
                      <span className="text-muted-foreground flex items-center gap-2"><DollarSign size={16} /> Est. Monthly</span>
                      <span className="text-3xl font-bold text-primary">${result.car2.monthly}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-4">
                      <span className="text-muted-foreground flex items-center gap-2"><Shield size={16} /> Safety Rating</span>
                      <span className="font-semibold">{result.car2.safetyRating}/10</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-4">
                      <span className="text-muted-foreground flex items-center gap-2"><AlertTriangle size={16} /> Theft Risk</span>
                      <span className="font-semibold">{result.car2.theftRisk}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2"><Zap size={16} /> Maintenance</span>
                      <span className="font-semibold">{result.car2.maintenance}</span>
                    </div>
                 </CardContent>
               </Card>
             </div>
          </motion.div>
        )}

        <div className="mt-16 text-sm text-muted-foreground bg-secondary/20 p-6 rounded-lg">
          <h4 className="font-bold mb-2 text-primary">Vehicle Comparison Tool Notes</h4>
          <p>
            Please note: our vehicle comparison tool provides general estimates only and is not an exact science. It’s designed to give you a rough idea of which vehicles may cost more or less to insure based on typical trends. Actual insurance rates can vary depending on your personal details and driving profile.
          </p>
        </div>
      </div>
    </div>
  );
}
