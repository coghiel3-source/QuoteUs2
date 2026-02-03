import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Vehicle {
  Year: string;
  Make: string;
  Model: string;
}

interface VehicleSelectorProps {
  index: number;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  showVin?: boolean;
}

function SearchableSelect({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  disabled = false,
  testId,
  loading = false
}: { 
  value: string | number; 
  onChange: (val: string) => void; 
  options: { label: string; value: string }[]; 
  placeholder: string;
  disabled?: boolean;
  testId?: string;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled || loading}
          data-testid={testId}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            value
            ? options.find((opt) => opt.value === value.toString())?.label
            : placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] md:w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-auto">
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toString() === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Global cache for vehicle data
let cachedVehicles: Vehicle[] | null = null;

export function VehicleSelector({ index, register, setValue, watch, showVin = false }: VehicleSelectorProps) {
  const year = watch(`vehicles.${index}.year`);
  const make = watch(`vehicles.${index}.make`);
  const model = watch(`vehicles.${index}.model`);
  const trim = watch(`vehicles.${index}.trim`);
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (cachedVehicles) {
      setVehicles(cachedVehicles);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/data/vehicles.json');
        if (!response.ok) throw new Error("Failed to load vehicle data");
        const data = await response.json();
        cachedVehicles = data;
        setVehicles(data);
      } catch (error) {
        console.error("Error loading vehicle data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Derived options based on selections
  const yearOptions = useMemo(() => {
    if (vehicles.length === 0) return [];
    const years = Array.from(new Set(vehicles.map(v => v.Year))).sort((a, b) => parseInt(b) - parseInt(a));
    return years.map(y => ({ label: y, value: y }));
  }, [vehicles]);

  const makeOptions = useMemo(() => {
    if (!year || vehicles.length === 0) return [];
    const makes = Array.from(new Set(
      vehicles.filter(v => v.Year === year.toString()).map(v => v.Make)
    )).sort();
    return makes.map(m => ({ label: m, value: m }));
  }, [vehicles, year]);

  const modelOptions = useMemo(() => {
    if (!year || !make || vehicles.length === 0) return [];
    const models = Array.from(new Set(
      vehicles.filter(v => v.Year === year.toString() && v.Make === make).map(v => v.Model)
    )).sort();
    return models.map(m => ({ label: m, value: m }));
  }, [vehicles, year, make]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`vehicle-${index}-year`}>Year</Label>
          <SearchableSelect
            value={year}
            onChange={(val) => {
              setValue(`vehicles.${index}.year`, parseInt(val));
              setValue(`vehicles.${index}.make`, "");
              setValue(`vehicles.${index}.model`, "");
              setValue(`vehicles.${index}.trim`, "");
            }}
            options={yearOptions}
            placeholder="Select Year"
            testId={`select-year-${index}`}
            loading={isLoading}
          />
          <input type="hidden" {...register(`vehicles.${index}.year`)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`vehicle-${index}-make`}>Make</Label>
          <SearchableSelect
            value={make}
            onChange={(val) => {
              setValue(`vehicles.${index}.make`, val);
              setValue(`vehicles.${index}.model`, "");
              setValue(`vehicles.${index}.trim`, "");
            }}
            options={makeOptions}
            placeholder={year ? "Select Make" : "Select Year First"}
            disabled={!year}
            testId={`select-make-${index}`}
            loading={isLoading}
          />
          <input type="hidden" {...register(`vehicles.${index}.make`)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`vehicle-${index}-model`}>Model</Label>
          <SearchableSelect
            value={model}
            onChange={(val) => setValue(`vehicles.${index}.model`, val)}
            options={modelOptions}
            placeholder={make ? "Select Model" : "Select Make First"}
            disabled={!make}
            testId={`select-model-${index}`}
            loading={isLoading}
          />
          <input type="hidden" {...register(`vehicles.${index}.model`)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`vehicle-${index}-trim`}>Trim (Optional)</Label>
          <Input
            id={`vehicle-${index}-trim`}
            placeholder="e.g., EX, LX, Sport"
            {...register(`vehicles.${index}.trim`)}
            disabled={!model}
            data-testid={`input-trim-${index}`}
          />
        </div>
      </div>

      {showVin && (
        <div className="space-y-2">
           <Label htmlFor={`vehicle-${index}-vin`}>VIN# (Optional)</Label>
           <Input 
             id={`vehicle-${index}-vin`} 
             placeholder="Enter 17-digit VIN" 
             {...register(`vehicles.${index}.vin`)} 
             className="uppercase"
           />
           <p className="text-sm text-muted-foreground mt-2 bg-secondary/30 p-3 rounded-md border border-secondary">
             If your year, make, and model of vehicle isn't available, please use an earlier year or add your VIN#
           </p>
        </div>
      )}
    </div>
  );
}
