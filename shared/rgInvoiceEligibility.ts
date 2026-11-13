// Static, shared copy for invoice PDFs, emails, and the client review page.
export const rgEligibility = {
  title: "Who is eligible for Rent Guarantee?",
  introduction: "Rent Guarantee eligibility depends on whether the tenant is new or an existing tenant with 12+ months of occupancy.",
  newTenants: [
    "No evictions, bankruptcies, or court judgments in the past 3 years",
    "A completed rental application",
    "At least one piece of government-issued photo ID",
    "Monthly rent that does not exceed 45% of gross household income",
    "At least one household member who is employed",
    "A recent credit report",
    "Proof of income",
    "A minimum 12-month lease",
  ],
  existingTenants: [
    "At least 12 consecutive months of occupancy",
    "No current missed or unpaid rent",
    "No history of malicious property damage claims or unresolved related judgments",
    "Government-issued identification",
    "Supporting documentation if requested",
  ],
  conclusion: "Final eligibility is determined through documentation review and program requirements.",
};

// Only trusted static copy above is interpolated, never invoice/user input.
export function renderRgEligibilityHtml(): string {
  const list = (items: string[]) => `<ul style="margin:5px 0 8px;padding-left:17px;list-style-type:disc;">${items.map(item => `<li style="margin:2px 0;">${item}</li>`).join("")}</ul>`;
  return `<section style="margin:14px 0;color:#374151;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;">
    <h3 style="margin:0 0 6px;font-size:16px;font-weight:700;">${rgEligibility.title}</h3>
    <p style="margin:0 0 8px;">${rgEligibility.introduction}</p>
    <table role="presentation" style="width:100%;table-layout:fixed;border-collapse:collapse;">
      <tbody><tr>
        <td style="width:50%;vertical-align:top;padding:0 12px 0 0;">
          <p style="margin:0;font-weight:600;">For new tenants, eligibility generally requires:</p>
          ${list(rgEligibility.newTenants)}
        </td>
        <td style="width:50%;vertical-align:top;padding:0 0 0 12px;">
          <p style="margin:0;font-weight:600;">For existing tenants, eligibility generally requires:</p>
          ${list(rgEligibility.existingTenants)}
        </td>
      </tr></tbody>
    </table>
    <p style="margin:0;">${rgEligibility.conclusion}</p>
  </section>`;
}

export function renderRgEligibilityText(): string {
  return [
    rgEligibility.title, rgEligibility.introduction,
    "For new tenants, eligibility generally requires:",
    ...rgEligibility.newTenants.map(item => `• ${item}`),
    "For existing tenants, eligibility generally requires:",
    ...rgEligibility.existingTenants.map(item => `• ${item}`),
    rgEligibility.conclusion,
  ].join("\n");
}
