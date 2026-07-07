import React from "react";
import { MapPin, User, Car, Shield, AlertTriangle, FileWarning, Ban, Briefcase, Heart, Plane, PawPrint, Home, Building } from "lucide-react";

interface DetailSection {
  title: string;
  icon: React.ReactNode;
  fields: { label: string; key: string }[];
}

const formatLabel = (k: string) => k
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, str => str.toUpperCase())
  .replace(/_/g, ' ')
  .trim();

const formatValue = (v: any): string => {
  if (v === null || v === undefined || v === '') return 'Not provided';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return String(v);
};

const autoSections: DetailSection[] = [
  {
    title: "Address Information",
    icon: <MapPin size={16} />,
    fields: [
      { label: "Address", key: "address" },
      { label: "City", key: "city" },
      { label: "Postal Code", key: "postalCode" },
    ]
  },
  {
    title: "Personal Information",
    icon: <User size={16} />,
    fields: [
      { label: "First Name", key: "firstName" },
      { label: "Last Name", key: "lastName" },
      { label: "Date of Birth", key: "dob" },
      { label: "Email", key: "email" },
      { label: "Phone", key: "phone" },
      { label: "Marital Status", key: "maritalStatus" },
    ]
  },
  {
    title: "License Information",
    icon: <Shield size={16} />,
    fields: [
      { label: "License Type", key: "licenseType" },
      { label: "License Date (Current)", key: "licenseDate" },
      { label: "G2 Date Obtained", key: "licenseDateG2" },
      { label: "G1 Date Obtained", key: "licenseDateG1" },
      { label: "Driver's Training", key: "driversTraining" },
      { label: "Driver's Training Date", key: "driversTrainingDate" },
    ]
  },
  {
    title: "Driving History",
    icon: <AlertTriangle size={16} />,
    fields: [
      { label: "Tickets", key: "tickets" },
      { label: "Accidents", key: "accidents" },
      { label: "Cancellations", key: "cancellations" },
    ]
  },
  {
    title: "Insurance History",
    icon: <FileWarning size={16} />,
    fields: [
      { label: "Current Insurance", key: "hasInsurance" },
      { label: "Current Insurance Start Date", key: "currentInsuranceDate" },
      { label: "Prior Insurance", key: "priorInsurance" },
      { label: "Prior Insurance Years", key: "priorInsuranceYears" },
    ]
  },
];

const homeSections: DetailSection[] = [
  {
    title: "Address Information",
    icon: <MapPin size={16} />,
    fields: [
      { label: "Address", key: "address" },
      { label: "City", key: "city" },
      { label: "Postal Code", key: "postalCode" },
    ]
  },
  {
    title: "Personal Information",
    icon: <User size={16} />,
    fields: [
      { label: "First Name", key: "firstName" },
      { label: "Last Name", key: "lastName" },
      { label: "Date of Birth", key: "dob" },
      { label: "Email", key: "email" },
      { label: "Phone", key: "phone" },
    ]
  },
  {
    title: "Property Details",
    icon: <Home size={16} />,
    fields: [
      { label: "Year Built", key: "yearBuilt" },
      { label: "Square Footage", key: "sqft" },
      { label: "Construction Type", key: "constructionType" },
      { label: "Roof Age", key: "roofAge" },
      { label: "Furnace Age", key: "furnaceAge" },
      { label: "Years at Address", key: "yearsAtAddress" },
      { label: "Currently Insured", key: "hasInsurance" },
      { label: "Years of Insurance", key: "insuranceYears" },
    ]
  },
  {
    title: "Claims History",
    icon: <AlertTriangle size={16} />,
    fields: [
      { label: "Claims Count", key: "claimsCount" },
      { label: "Claims", key: "claims" },
    ]
  },
];

const tenantSections: DetailSection[] = [
  {
    title: "Address Information",
    icon: <MapPin size={16} />,
    fields: [
      { label: "Address", key: "address" },
      { label: "Unit", key: "unit" },
      { label: "City", key: "city" },
      { label: "Postal Code", key: "postalCode" },
    ]
  },
  {
    title: "Personal Information",
    icon: <User size={16} />,
    fields: [
      { label: "First Name", key: "firstName" },
      { label: "Last Name", key: "lastName" },
      { label: "Date of Birth", key: "dob" },
      { label: "Email", key: "email" },
      { label: "Phone", key: "phone" },
    ]
  },
  {
    title: "Rental Details",
    icon: <Building size={16} />,
    fields: [
      { label: "Contents Value", key: "contentsValue" },
      { label: "Years at Address", key: "yearsAtAddress" },
      { label: "Currently Insured", key: "hasInsurance" },
      { label: "Years of Insurance", key: "insuranceYears" },
      { label: "Claims Count", key: "claimsCount" },
      { label: "Claims", key: "claims" },
    ]
  },
];

const businessSections: DetailSection[] = [
  {
    title: "Address Information",
    icon: <MapPin size={16} />,
    fields: [
      { label: "Address", key: "address" },
      { label: "City", key: "city" },
      { label: "Postal Code", key: "postalCode" },
    ]
  },
  {
    title: "Contact Information",
    icon: <User size={16} />,
    fields: [
      { label: "Contact Name", key: "contactName" },
      { label: "Email", key: "email" },
      { label: "Phone", key: "phone" },
    ]
  },
  {
    title: "Business Details",
    icon: <Briefcase size={16} />,
    fields: [
      { label: "Business Name", key: "businessName" },
      { label: "Industry", key: "industry" },
      { label: "Annual Revenue", key: "revenue" },
      { label: "Number of Employees", key: "employees" },
      { label: "Years in Business", key: "yearsInBusiness" },
      { label: "Current Insurer", key: "currentInsurer" },
      { label: "Additional Info", key: "additionalInfo" },
      { label: "Has Attachment", key: "hasAttachment" },
    ]
  },
];

const lifeSections: DetailSection[] = [
  {
    title: "Address Information",
    icon: <MapPin size={16} />,
    fields: [
      { label: "Address", key: "address" },
      { label: "City", key: "city" },
      { label: "Postal Code", key: "postalCode" },
    ]
  },
  {
    title: "Personal Information",
    icon: <User size={16} />,
    fields: [
      { label: "First Name", key: "firstName" },
      { label: "Last Name", key: "lastName" },
      { label: "Date of Birth", key: "dob" },
      { label: "Email", key: "email" },
      { label: "Phone", key: "phone" },
      { label: "Gender", key: "gender" },
      { label: "Occupation", key: "occupation" },
    ]
  },
  {
    title: "Health & Lifestyle",
    icon: <Heart size={16} />,
    fields: [
      { label: "Smoker", key: "smoker" },
      { label: "Health Conditions", key: "healthConditions" },
    ]
  },
  {
    title: "Coverage Details",
    icon: <Shield size={16} />,
    fields: [
      { label: "Annual Income", key: "annualIncome" },
      { label: "Has Mortgage", key: "hasMortgage" },
      { label: "Outstanding Mortgage", key: "outstandingMortgage" },
      { label: "Coverage Type", key: "coverageType" },
      { label: "Coverage Amount", key: "coverageAmount" },
    ]
  },
];

const travelSections: DetailSection[] = [
  {
    title: "Address Information",
    icon: <MapPin size={16} />,
    fields: [
      { label: "Address", key: "address" },
      { label: "City", key: "city" },
      { label: "Postal Code", key: "postalCode" },
    ]
  },
  {
    title: "Personal Information",
    icon: <User size={16} />,
    fields: [
      { label: "First Name", key: "firstName" },
      { label: "Last Name", key: "lastName" },
      { label: "Email", key: "email" },
      { label: "Phone", key: "phone" },
    ]
  },
  {
    title: "Trip Details",
    icon: <Plane size={16} />,
    fields: [
      { label: "Destination", key: "destination" },
      { label: "Departure Date", key: "departureDate" },
      { label: "Return Date", key: "returnDate" },
      { label: "Number of Travellers", key: "travellers" },
      { label: "Primary Traveller Age", key: "primaryTravellerAge" },
      { label: "Pre-Existing Condition", key: "preExistingCondition" },
      { label: "Pre-Existing Details", key: "preExistingDetails" },
    ]
  },
];

const petSections: DetailSection[] = [
  {
    title: "Address Information",
    icon: <MapPin size={16} />,
    fields: [
      { label: "Address", key: "address" },
      { label: "City", key: "city" },
      { label: "Postal Code", key: "postalCode" },
    ]
  },
  {
    title: "Owner Information",
    icon: <User size={16} />,
    fields: [
      { label: "First Name", key: "ownerFirstName" },
      { label: "Last Name", key: "ownerLastName" },
      { label: "Email", key: "email" },
      { label: "Phone", key: "phone" },
    ]
  },
  {
    title: "Pet Details",
    icon: <PawPrint size={16} />,
    fields: [
      { label: "Pet Name", key: "petName" },
      { label: "Pet Type", key: "petType" },
      { label: "Breed", key: "breed" },
      { label: "Age", key: "age" },
      { label: "Spayed/Neutered", key: "spayedNeutered" },
      { label: "Pre-Existing Conditions", key: "preExistingConditions" },
    ]
  },
];

function getSectionsForType(type: string): DetailSection[] | null {
  switch (type) {
    case 'Auto': return autoSections;
    case 'Home': return homeSections;
    case 'Tenant': return tenantSections;
    case 'Business': return businessSections;
    case 'Life': return lifeSections;
    case 'Travel': return travelSections;
    case 'Pet': return petSections;
    default: return null;
  }
}

function getValueFromDetails(details: any, key: string): any {
  if (details[key] !== undefined) return details[key];
  if (details.primaryDriver && details.primaryDriver[key] !== undefined) return details.primaryDriver[key];
  return undefined;
}

function renderArrayItems(items: any[]): React.ReactNode {
  if (items.length === 0) return <span className="text-slate-400 italic">None</span>;
  return (
    <div className="space-y-1 mt-1">
      {items.map((item, i) => (
        <div key={i} className="bg-white rounded p-2 border border-slate-200 text-xs">
          {typeof item === 'object' && item !== null ? (
            Object.entries(item).map(([k, v]) => (
              <span key={k} className="mr-3">
                <span className="text-slate-500">{formatLabel(k)}:</span>{' '}
                <span className="font-medium">{formatValue(v)}</span>
              </span>
            ))
          ) : (
            <span className="font-medium">{String(item)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function renderVehicles(vehicles: any[]): React.ReactNode {
  if (!vehicles || vehicles.length === 0) return null;
  return (
    <div className="space-y-3">
      {vehicles.map((v: any, i: number) => (
        <div key={i} className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="font-semibold text-sm text-primary mb-2">
            {v.year} {v.make} {v.model} {v.trim || ''}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {v.vin && <><span className="text-slate-500">VIN:</span><span className="font-medium">{v.vin}</span></>}
            {v.datePurchased && <><span className="text-slate-500">Date Purchased:</span><span className="font-medium">{v.datePurchased}</span></>}
            <span className="text-slate-500">Usage:</span><span className="font-medium capitalize">{v.usage}</span>
            <span className="text-slate-500">Annual KM:</span><span className="font-medium">{v.annualKm?.toLocaleString()}</span>
            <span className="text-slate-500">Coverage:</span><span className="font-medium capitalize">{v.coverageType === 'full' ? 'Full Coverage' : 'Liability Only'}</span>
            {v.coverageType === 'full' && v.collisionDeductible && <><span className="text-slate-500">Collision Ded:</span><span className="font-medium">${v.collisionDeductible}</span></>}
            {v.coverageType === 'full' && v.comprehensiveDeductible && <><span className="text-slate-500">Comprehensive Ded:</span><span className="font-medium">${v.comprehensiveDeductible}</span></>}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderAdditionalDrivers(drivers: any[]): React.ReactNode {
  if (!drivers || drivers.length === 0) return null;
  return (
    <div className="space-y-3">
      {drivers.map((d: any, i: number) => (
        <div key={i} className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="font-semibold text-sm text-primary mb-2">
            {d.firstName} {d.lastName} ({d.relationship})
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-slate-500">Date of Birth:</span><span className="font-medium">{d.dob}</span>
            <span className="text-slate-500">License Type:</span><span className="font-medium">{d.licenseType}</span>
            {d.licenseDate && <><span className="text-slate-500">License Date:</span><span className="font-medium">{d.licenseDate}</span></>}
            {d.licenseDateG2 && <><span className="text-slate-500">G2 Date:</span><span className="font-medium">{d.licenseDateG2}</span></>}
            {d.licenseDateG1 && <><span className="text-slate-500">G1 Date:</span><span className="font-medium">{d.licenseDateG1}</span></>}
            {d.priorInsurance && <><span className="text-slate-500">Prior Insurance:</span><span className="font-medium capitalize">{d.priorInsurance}</span></>}
            {d.priorInsuranceYears && <><span className="text-slate-500">Prior Insurance Years:</span><span className="font-medium">{d.priorInsuranceYears}</span></>}
          </div>
          {(d.tickets?.length > 0 || d.accidents?.length > 0 || d.cancellations?.length > 0) && (
            <div className="mt-2 pt-2 border-t border-slate-100 text-xs space-y-1">
              {d.tickets?.length > 0 && <div><span className="text-slate-500">Tickets:</span> {d.tickets.map((t: any) => `${t.type} (${t.date})`).join(', ')}</div>}
              {d.accidents?.length > 0 && <div><span className="text-slate-500">Accidents:</span> {d.accidents.map((a: any) => `${a.type} (${a.date})`).join(', ')}</div>}
              {d.cancellations?.length > 0 && <div><span className="text-slate-500">Cancellations:</span> {d.cancellations.map((c: any) => `${c.reason} (${c.date})`).join(', ')}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function renderCrossSell(crossSell: any): React.ReactNode {
  if (!crossSell) return null;
  const interests = [];
  if (crossSell.wantHomeQuote) interests.push('Home Insurance');
  if (crossSell.wantTenantQuote) interests.push('Tenant Insurance');
  if (crossSell.wantAutoQuote) interests.push('Auto Insurance');
  if (interests.length === 0) return null;
  return (
    <div className="text-sm font-medium text-green-700">{interests.join(', ')}</div>
  );
}

interface LeadDetailViewProps {
  quoteType: string;
  details: any;
}

export default function LeadDetailView({ quoteType, details }: LeadDetailViewProps) {
  if (!details || Object.keys(details).length === 0) {
    return <p className="text-sm text-muted-foreground">No additional details available.</p>;
  }

  const sections = getSectionsForType(quoteType);

  if (!sections) {
    return (
      <div className="space-y-3">
        {Object.entries(details).map(([key, value]) => (
          <div key={key} className="py-2 border-b border-slate-200 last:border-0">
            <div className="text-sm text-slate-500 mb-1">{formatLabel(key)}</div>
            <div className="text-sm font-semibold text-primary">
              {typeof value === 'object' && value !== null
                ? Array.isArray(value)
                  ? renderArrayItems(value)
                  : <pre className="text-xs bg-white p-2 rounded border whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                : formatValue(value)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const usedKeys = new Set<string>();
  sections.forEach(s => s.fields.forEach(f => usedKeys.add(f.key)));
  usedKeys.add('primaryDriver');
  usedKeys.add('vehicles');
  usedKeys.add('additionalDrivers');
  usedKeys.add('vehicleSummary');
  usedKeys.add('driverCount');
  usedKeys.add('crossSellInterest');
  usedKeys.add('comments');

  return (
    <div className="space-y-4">
      {sections.map((section, sIdx) => {
        const hasData = section.fields.some(f => {
          const val = getValueFromDetails(details, f.key);
          return val !== undefined && val !== null && val !== '';
        });
        if (!hasData) return null;

        return (
          <div key={sIdx} className="border rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 border-b">
              <span className="text-primary">{section.icon}</span>
              <h5 className="font-semibold text-sm text-slate-700">{section.title}</h5>
            </div>
            <div className="p-3 bg-white">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {section.fields.map((field, fIdx) => {
                  const val = getValueFromDetails(details, field.key);
                  if (val === undefined) return null;

                  if (Array.isArray(val)) {
                    return (
                      <div key={fIdx} className="col-span-2">
                        <div className="text-xs text-slate-500 mb-1">{field.label}</div>
                        {renderArrayItems(val)}
                      </div>
                    );
                  }

                  return (
                    <div key={fIdx} className="py-1">
                      <div className="text-xs text-slate-500">{field.label}</div>
                      <div className="text-sm font-medium text-slate-900 capitalize">{formatValue(val)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {quoteType === 'Auto' && details.vehicles && details.vehicles.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 border-b">
            <span className="text-primary"><Car size={16} /></span>
            <h5 className="font-semibold text-sm text-slate-700">Vehicles ({details.vehicles.length})</h5>
          </div>
          <div className="p-3 bg-white">
            {renderVehicles(details.vehicles)}
          </div>
        </div>
      )}

      {quoteType === 'Auto' && details.additionalDrivers && details.additionalDrivers.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 border-b">
            <span className="text-primary"><User size={16} /></span>
            <h5 className="font-semibold text-sm text-slate-700">Additional Drivers ({details.additionalDrivers.length})</h5>
          </div>
          <div className="p-3 bg-white">
            {renderAdditionalDrivers(details.additionalDrivers)}
          </div>
        </div>
      )}

      {details.crossSellInterest && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 border-b">
            <span className="text-primary"><Shield size={16} /></span>
            <h5 className="font-semibold text-sm text-slate-700">Cross-Sell Interest</h5>
          </div>
          <div className="p-3 bg-white">
            {renderCrossSell(details.crossSellInterest)}
            {!renderCrossSell(details.crossSellInterest) && <span className="text-sm text-slate-400 italic">No cross-sell interest</span>}
          </div>
        </div>
      )}

      {details.comments && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 border-b">
            <span className="text-primary"><FileWarning size={16} /></span>
            <h5 className="font-semibold text-sm text-slate-700">Comments</h5>
          </div>
          <div className="p-3 bg-white">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{details.comments}</p>
          </div>
        </div>
      )}

      {(() => {
        const remainingKeys = Object.keys(details).filter(k => !usedKeys.has(k));
        if (remainingKeys.length === 0) return null;
        return (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 border-b">
              <h5 className="font-semibold text-sm text-slate-700">Other Details</h5>
            </div>
            <div className="p-3 bg-white">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {remainingKeys.map(key => {
                  const val = details[key];
                  if (typeof val === 'object' && val !== null) {
                    return (
                      <div key={key} className="col-span-2 py-1">
                        <div className="text-xs text-slate-500">{formatLabel(key)}</div>
                        {Array.isArray(val) ? renderArrayItems(val) : (
                          <pre className="text-xs bg-slate-50 p-2 rounded border whitespace-pre-wrap mt-1">{JSON.stringify(val, null, 2)}</pre>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div key={key} className="py-1">
                      <div className="text-xs text-slate-500">{formatLabel(key)}</div>
                      <div className="text-sm font-medium text-slate-900">{formatValue(val)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
