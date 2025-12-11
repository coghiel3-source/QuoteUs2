export interface Vehicle {
  year: number;
  make: string;
  model: string;
  trim?: string;
}

export const YEARS = Array.from({ length: 35 }, (_, i) => 2024 - i);

export const MAKES = [
  "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler", 
  "Dodge", "Ford", "GMC", "Honda", "Hyundai", "Infiniti", "Jeep", "Kia", 
  "Lexus", "Lincoln", "Mazda", "Mercedes-Benz", "Nissan", "Ram", "Subaru", 
  "Tesla", "Toyota", "Volkswagen", "Volvo"
];

export const MODELS: Record<string, string[]> = {
  "Honda": ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "HR-V"],
  "Toyota": ["Corolla", "Camry", "RAV4", "Highlander", "Tacoma", "Sienna", "Prius"],
  "Ford": ["F-150", "Escape", "Explorer", "Mustang", "Edge", "Bronco"],
  "Chevrolet": ["Silverado", "Equinox", "Malibu", "Traverse", "Tahoe", "Bolt EV"],
  "Hyundai": ["Elantra", "Tucson", "Santa Fe", "Kona", "Sonata"],
  "Nissan": ["Rogue", "Sentra", "Altima", "Pathfinder", "Murano"],
  "Mazda": ["Mazda3", "CX-5", "CX-30", "CX-9", "MX-5 Miata"],
  "Volkswagen": ["Jetta", "Tiguan", "Atlas", "Golf"],
  "Subaru": ["Crosstrek", "Outback", "Forester", "Impreza"],
  "Jeep": ["Wrangler", "Grand Cherokee", "Cherokee", "Compass"],
  "Tesla": ["Model 3", "Model Y", "Model S", "Model X"],
  "BMW": ["3 Series", "5 Series", "X3", "X5"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLC", "GLE"],
  "Audi": ["A4", "Q5", "A3", "Q7"],
  "Dodge": ["Grand Caravan", "Durango", "Charger", "Challenger"],
  "Kia": ["Sorento", "Sportage", "Forte", "Telluride"]
};

// Fallback for makes not in the specific list
export const getModelsForMake = (make: string) => {
  return MODELS[make] || ["Base Model", "Premium", "Sport", "Limited"];
};
