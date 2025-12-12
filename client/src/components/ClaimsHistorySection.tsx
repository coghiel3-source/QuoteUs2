import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { useFieldArray, Control, UseFormRegister, UseFormSetValue } from "react-hook-form";

interface ClaimsHistorySectionProps {
  control: Control<any>;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
}

export function ClaimsHistorySection({ control, register, setValue }: ClaimsHistorySectionProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "claims",
  });

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <div>
           <Label className="text-base font-semibold flex items-center gap-2">
             <AlertTriangle size={16} className="text-amber-500" /> Claims History
           </Label>
           <p className="text-sm text-muted-foreground">Have you had any claims in the last 5 years?</p>
        </div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => append({ date: "", type: "", amount: "" })} 
          className="gap-2 text-primary border-primary/20 hover:bg-primary/5"
        >
          <Plus size={14} /> Add Claim
        </Button>
      </div>

      {fields.length === 0 && (
        <div className="text-sm text-muted-foreground italic p-4 bg-secondary/10 rounded-lg text-center border border-dashed">
          No claims recorded.
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <Card key={field.id} className="bg-secondary/5 border shadow-sm">
            <CardContent className="p-4 relative">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive h-6 w-6"
                onClick={() => remove(index)}
              >
                <Trash2 size={14} />
              </Button>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date of Loss</Label>
                  <Input type="date" {...register(`claims.${index}.date`)} />
                </div>
                <div className="space-y-2">
                  <Label>Type of Claim</Label>
                  <Select onValueChange={(val) => setValue(`claims.${index}.type`, val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="water">Water / Flood</SelectItem>
                      <SelectItem value="fire">Fire</SelectItem>
                      <SelectItem value="theft">Theft / Burglary</SelectItem>
                      <SelectItem value="wind">Wind / Hail</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Approximate Amount ($)</Label>
                  <Input type="number" placeholder="5000" {...register(`claims.${index}.amount`)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
