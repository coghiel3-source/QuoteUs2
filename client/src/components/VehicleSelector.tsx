import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { YEARS, MAKES, getModelsForMake } from "@/lib/mockData";
import { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";

interface VehicleSelectorProps {
  index: number;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
}

export function VehicleSelector({ index, register, setValue, watch }: VehicleSelectorProps) {
  const year = watch(`vehicles.${index}.year`);
  const make = watch(`vehicles.${index}.make`);
  
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    if (make) {
      setModels(getModelsForMake(make));
      // Reset model if make changes
      // setValue(`vehicles.${index}.model`, ""); 
    } else {
      setModels([]);
    }
  }, [make, setValue, index]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor={`vehicle-${index}-year`}>Year</Label>
        <Select 
          onValueChange={(val) => setValue(`vehicles.${index}.year`, parseInt(val))}
          value={year?.toString()}
        >
          <SelectTrigger id={`vehicle-${index}-year`} data-testid={`select-year-${index}`}>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" {...register(`vehicles.${index}.year`)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`vehicle-${index}-make`}>Make</Label>
        <Select 
          onValueChange={(val) => {
            setValue(`vehicles.${index}.make`, val);
            setValue(`vehicles.${index}.model`, ""); // Reset model on make change
          }}
          value={make}
        >
          <SelectTrigger id={`vehicle-${index}-make`} data-testid={`select-make-${index}`}>
            <SelectValue placeholder="Make" />
          </SelectTrigger>
          <SelectContent>
            {MAKES.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
         <input type="hidden" {...register(`vehicles.${index}.make`)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`vehicle-${index}-model`}>Model</Label>
        <Select 
          onValueChange={(val) => setValue(`vehicles.${index}.model`, val)}
          disabled={!make}
           value={watch(`vehicles.${index}.model`)}
        >
          <SelectTrigger id={`vehicle-${index}-model`} data-testid={`select-model-${index}`}>
            <SelectValue placeholder={make ? "Select Model" : "Select Make First"} />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
         <input type="hidden" {...register(`vehicles.${index}.model`)} />
      </div>
    </div>
  );
}
