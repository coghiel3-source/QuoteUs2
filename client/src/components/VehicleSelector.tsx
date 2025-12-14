import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { YEARS, MAKES, getModelsForMake } from "@/lib/mockData";
import { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Check, ChevronsUpDown } from "lucide-react";
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
  testId
}: { 
  value: string | number; 
  onChange: (val: string) => void; 
  options: { label: string; value: string }[]; 
  placeholder: string;
  disabled?: boolean;
  testId?: string;
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
          disabled={disabled}
          data-testid={testId}
        >
          {value
            ? options.find((opt) => opt.value === value.toString())?.label
            : placeholder}
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

export function VehicleSelector({ index, register, setValue, watch, showVin = false }: VehicleSelectorProps) {
  const year = watch(`vehicles.${index}.year`);
  const make = watch(`vehicles.${index}.make`);
  const model = watch(`vehicles.${index}.model`);
  
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    if (make) {
      setModels(getModelsForMake(make));
    } else {
      setModels([]);
    }
  }, [make]);

  const yearOptions = YEARS.map(y => ({ label: y.toString(), value: y.toString() }));
  const makeOptions = MAKES.map(m => ({ label: m, value: m }));
  const modelOptions = models.map(m => ({ label: m, value: m }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`vehicle-${index}-year`}>Year</Label>
          <SearchableSelect
            value={year}
            onChange={(val) => setValue(`vehicles.${index}.year`, parseInt(val))}
            options={yearOptions}
            placeholder="Select Year"
            testId={`select-year-${index}`}
          />
          <input type="hidden" {...register(`vehicles.${index}.year`)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`vehicle-${index}-make`}>Make</Label>
          <SearchableSelect
            value={make}
            onChange={(val) => {
              setValue(`vehicles.${index}.make`, val);
              setValue(`vehicles.${index}.model`, ""); // Reset model on make change
            }}
            options={makeOptions}
            placeholder="Select Make"
            testId={`select-make-${index}`}
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
          />
          <input type="hidden" {...register(`vehicles.${index}.model`)} />
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
