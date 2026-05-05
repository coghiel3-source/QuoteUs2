import { forwardRef } from "react";

interface LeaseData {
  landlordName: string;
  landlordAddress: string;
  landlordPhone: string;
  landlordEmail: string;
  propertyAddress: string;
  qualifiedTenants: string;
  effectiveDate: string;
}

const s = {
  wrap: {
    width: "794px",
    background: "#ffffff",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "12pt",
    lineHeight: "1.7",
    color: "#111111",
    padding: "40px 48px",
    position: "absolute" as const,
    left: "-9999px",
    top: "0",
  },
  h1: { fontSize: "16pt", textAlign: "center" as const, marginBottom: "4px", marginTop: "0", fontFamily: "Georgia, serif" },
  h2: {
    fontSize: "13pt", marginTop: "28px", marginBottom: "6px",
    borderBottom: "1px solid #cccccc", paddingBottom: "4px", fontFamily: "Georgia, serif",
  },
  headerBlock: { textAlign: "center" as const, marginBottom: "28px" },
  headerP: { margin: "2px 0", fontSize: "11pt" },
  partyBlock: { margin: "16px 0", padding: "14px 18px", borderLeft: "3px solid #2563eb", background: "#f8faff" },
  partyP: { margin: "3px 0", fontSize: "11pt" },
  legal: { fontSize: "10.5pt", color: "#333333", marginTop: "8px", lineHeight: "1.75" },
  table: { borderCollapse: "collapse" as const, width: "100%", marginTop: "8px" },
  tdLabel: {
    padding: "6px 10px", border: "1px solid #bbbbbb", verticalAlign: "top" as const,
    fontSize: "11pt", fontWeight: "bold" as const, width: "52%", color: "#333333",
  },
  tdValue: {
    padding: "6px 10px", border: "1px solid #bbbbbb", verticalAlign: "top" as const, fontSize: "11pt",
  },
  sigBlock: { marginTop: "40px", display: "flex" as const, gap: "60px" },
  sigCol: { flex: 1, minWidth: "200px" },
  sigLine: { borderTop: "1px solid #555555", marginTop: "40px", marginBottom: "4px" },
  sigLabel: { fontSize: "10pt", color: "#555555", margin: "1px 0" },
  filled: { color: "#1a56db", fontWeight: 600 as const, borderBottom: "1.5px solid #1a56db", padding: "0 2px" },
  blank: { color: "#999999", fontStyle: "italic" as const },
};

const Fill = ({ v, fallback = "_______________" }: { v: string; fallback?: string }) =>
  v && v.trim()
    ? <span style={s.filled}>{v.trim()}</span>
    : <span style={s.blank}>{fallback}</span>;

const LeaseTemplatePrint = forwardRef<HTMLDivElement, { data: LeaseData }>(({ data }, ref) => {
  const fmtDate = (d: string) => {
    try { return new Date(d + "T00:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return d; }
  };
  const eff = data.effectiveDate ? fmtDate(data.effectiveDate) : "_______________";

  return (
    <div ref={ref} style={s.wrap}>
      <div style={s.headerBlock}>
        <h1 style={s.h1}>Lease Co-Guarantee Agreement</h1>
        <p style={s.headerP}><strong>"Agreement"</strong></p>
        <p style={{ ...s.headerP, marginTop: "14px" }}><strong>Pensio Risk Management Group Inc.</strong> "Product Manager"</p>
        <p style={s.headerP}>80 Carlauren Rd, Unit 23, Woodbridge, ON, L4L 7Z5</p>
        <p style={s.headerP}>Product Manager's Email: info@pensioglobal.com</p>
      </div>

      <div style={s.partyBlock}>
        <p style={s.partyP}><strong>Rentatee "Landlord"</strong></p>
        <p style={s.partyP}><strong>Name:</strong> <Fill v={data.landlordName} /></p>
        <p style={s.partyP}><strong>Address:</strong> <Fill v={data.landlordAddress} /></p>
        <p style={s.partyP}><strong>Contact Number:</strong> <Fill v={data.landlordPhone} /></p>
        <p style={s.partyP}><strong>Email:</strong> <Fill v={data.landlordEmail} /></p>
      </div>

      <h2 style={s.h2}>Declarations</h2>
      <table style={s.table}>
        <tbody>
          <tr>
            <td style={s.tdLabel}>Residential Rental Property Address</td>
            <td style={s.tdValue}><Fill v={data.propertyAddress} /></td>
          </tr>
          <tr>
            <td style={s.tdLabel}>Qualified Tenants Residing in a Rental Unit</td>
            <td style={s.tdValue}><Fill v={data.qualifiedTenants} /></td>
          </tr>
          <tr>
            <td style={s.tdLabel}>Lease Co-Guarantee Agreement Contract Control Number</td>
            <td style={s.tdValue}>Pensio00001</td>
          </tr>
          <tr>
            <td style={s.tdLabel}>Lease Co-Guarantee Effective Date</td>
            <td style={s.tdValue}><Fill v={eff} /></td>
          </tr>
        </tbody>
      </table>

      <h2 style={s.h2}>Reimbursements and Product Fee</h2>
      <p style={s.legal}><strong>Rent Guarantee Reimbursement</strong> provided under this Agreement covers a maximum rent loss for each registered residential rental Unit in the Property. The maximum amount for the rent loss reimbursement is capped at sixty thousand Canadian Dollars CDN $60,000 for each twelve (12) month period for any one (1) habitable rentable Unit in the Property for the Term.</p>
      <p style={s.legal}><strong>Malicious Tenant Damage Reimbursement</strong> provided under this Agreement covers a maximum malicious tenant damage loss for each registered residential rental Unit in the Property. The maximum amount for the malicious tenant damage loss reimbursement is capped at ten thousand Canadian Dollars CDN $10,000 for each twelve (12) month period for any one (1) habitable and rentable Unit in the Property for the Term.</p>
      <p style={s.legal}><strong>Eviction Expense Reimbursement</strong> provided under this Agreement covers a maximum loss for each registered residential rental Unit in the Property. The maximum amount for the eviction expense loss reimbursement is capped at one thousand five hundred Canadian Dollars CDN $1,500 for each twelve (12) month period for any one (1) habitable and rentable Unit in the Property for the Term.</p>
      <p style={s.legal}><strong>Product Fee</strong> payable to Rentatee Technologies Inc. ("Rentatee") shall be five percent (5.0%) of the declared monthly rent if paid monthly, or four and one-half percent (4.5%) of the declared annual rent if paid annually, paid by the Landlord for the Qualifying Tenant(s) listed above to rent a Unit in the Property under a Lease Agreement. The Product Fee payment must be made to Rentatee on or before the 15th calendar day of each month commencing on the Effective Date, for the Term and any Extension thereof.</p>

      <h2 style={s.h2}>Reimbursement Loss Payee</h2>
      <div style={s.partyBlock}>
        <p style={s.partyP}><strong>Landlord:</strong> <Fill v={data.landlordName} /></p>
        <p style={s.partyP}><strong>Product Manager Agent:</strong> Rentatee Technologies Inc.</p>
        <p style={s.partyP}>1610 Swainson Road, Kelowna, BC, V1P 1C5</p>
        <p style={s.partyP}>Agent's Email: sales@rentatee.com</p>
      </div>

      <h2 style={s.h2}>Important Notice Disclaimer</h2>
      <p style={s.legal}>The Tenant Management Services and Reimbursements provided by the Product Manager to the Landlord, as stated in this Agreement, are explicitly clarified to not constitute insurance. It is strongly recommended that Landlord carefully review this Agreement, seek professional advice, or consult the Product Manager or Product Manager's Agent before entering into this Agreement.</p>
      <p style={s.legal}>The Product Manager directly self-procured a surety in the form of a Performance Bond from a Surety with an insurance or reinsurance rating of A.M. Best A (excellent) or better to secure the Product Manager's services and performance for the client.</p>

      <h2 style={s.h2}>Lease Co-Guarantee</h2>
      <p style={s.legal}>This Lease Co-Guarantee Agreement (the "Agreement") made on the <Fill v={eff} fallback="_____________" /> (the "Effective Date") between Rentatee (or with the Landlord's authorized Property Manager) (the "Landlord" or "Property Manager") and Pensio Risk Management Group Inc., located at 80 Carlauren Rd, Unit 23, Woodbridge, ON, L4L 7Z5 ("Product Manager").</p>

      <h2 style={s.h2}>Recitals</h2>
      <p style={s.legal}>Whereas the Landlord and Product Manager may be referred to herein each as (a "Party") and collectively as (the "Parties") to this Agreement;</p>
      <p style={s.legal}>Whereas the Landlord, being the owner, operator, and manager of the registered rental Unit, situated at the address of the property (the "Property");</p>
      <p style={s.legal}>Whereas in consideration of the terms and conditions outlined in this Agreement, the Product Manager agrees to provide the Landlord with the following Tenant Management Services and reimbursements for losses in the event of a Tenant violation of an enforceable Lease Agreement: (i) Rent Guarantee Reimbursement for defaulted rent loss; (ii) Malicious Tenant Damage Reimbursement for malicious tenant damage; and (iii) Eviction Expense Reimbursement, for eviction and legal expenses.</p>
      <p style={s.legal}>Whereas the initial term (the "Lease Term") for any Qualified Tenant listed above who meets the qualifications to enter into a Lease Agreement is for a minimum occupancy period of twelve (12) months.</p>
      <p style={s.legal}>And Whereas the Parties have mutually agreed to enter into this Agreement and are bound by the terms and conditions specified within this Agreement.</p>

      <div style={s.sigBlock}>
        <div style={s.sigCol}>
          <div style={s.sigLine} />
          <p style={s.sigLabel}><strong>Landlord Signature</strong></p>
          <p style={s.sigLabel}>Name: <Fill v={data.landlordName} /></p>
          <p style={s.sigLabel}>Date: <Fill v={eff} /></p>
        </div>
        <div style={s.sigCol}>
          <div style={s.sigLine} />
          <p style={s.sigLabel}><strong>Product Manager</strong></p>
          <p style={s.sigLabel}>Pensio Risk Management Group Inc.</p>
          <p style={s.sigLabel}>By: Jim Milankov, President</p>
        </div>
      </div>

      <p style={{ marginTop: "48px", fontSize: "9pt", color: "#888888", textAlign: "center" }}>
        Generated by QuoteUs.ca — {new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>
  );
});

LeaseTemplatePrint.displayName = "LeaseTemplatePrint";
export default LeaseTemplatePrint;
