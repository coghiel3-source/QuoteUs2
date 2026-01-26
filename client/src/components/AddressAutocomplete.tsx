import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPostalCodeChange?: (postalCode: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  "data-testid"?: string;
}

const ONTARIO_CITIES = [
  "Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton", "London", "Markham",
  "Vaughan", "Kitchener", "Windsor", "Richmond Hill", "Oakville", "Burlington",
  "Greater Sudbury", "Oshawa", "Barrie", "St. Catharines", "Cambridge", "Kingston",
  "Guelph", "Thunder Bay", "Waterloo", "Brantford", "Pickering", "Niagara Falls",
  "Peterborough", "Sault Ste. Marie", "Kawartha Lakes", "Sarnia", "Norfolk County",
  "North Bay", "Welland", "Belleville", "Cornwall", "Haldimand County", "Timmins",
  "Quinte West", "Woodstock", "Stratford", "Orillia", "Orangeville", "Bradford",
  "Aurora", "Newmarket", "Caledon", "Halton Hills", "Ajax", "Whitby", "Clarington",
  "Milton", "Stouffville", "Georgina", "East Gwillimbury", "Innisfil", "Collingwood"
];

const STREET_TYPES = ["Street", "Avenue", "Road", "Drive", "Boulevard", "Lane", "Court", "Crescent", "Way", "Place", "Circle", "Trail"];

export default function AddressAutocomplete({
  value,
  onChange,
  onPostalCodeChange,
  placeholder = "Start typing your address...",
  className,
  id,
  "data-testid": testId
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const generateSuggestions = (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      return;
    }

    const inputLower = input.toLowerCase();
    const newSuggestions: string[] = [];

    const hasNumber = /^\d+/.test(input);
    
    if (hasNumber) {
      const streetNumber = input.match(/^\d+/)?.[0] || "";
      const streetPart = input.replace(/^\d+\s*/, "").toLowerCase();
      
      ONTARIO_CITIES.slice(0, 10).forEach(city => {
        STREET_TYPES.slice(0, 4).forEach(type => {
          const suggestion = `${streetNumber} ${streetPart ? streetPart.charAt(0).toUpperCase() + streetPart.slice(1) : "Main"} ${type}, ${city}, ON`;
          if (suggestion.toLowerCase().includes(inputLower) || newSuggestions.length < 5) {
            newSuggestions.push(suggestion);
          }
        });
      });
    } else {
      ONTARIO_CITIES.filter(city => 
        city.toLowerCase().includes(inputLower)
      ).slice(0, 5).forEach(city => {
        newSuggestions.push(`123 Main Street, ${city}, ON`);
      });
    }

    setSuggestions(newSuggestions.slice(0, 6));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    generateSuggestions(newValue);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length >= 3 && setShowSuggestions(true)}
        placeholder={placeholder}
        className={className}
        data-testid={testId}
        autoComplete="off"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                highlightedIndex === index && "bg-gray-100"
              )}
            >
              {suggestion}
            </button>
          ))}
          <div className="px-3 py-2 text-xs text-gray-500 border-t bg-gray-50">
            Can't find your address? Just type it manually above.
          </div>
        </div>
      )}
    </div>
  );
}
