import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Public educational resource. Render inside the existing Layout.
 * Route, page metadata and footer discovery are handled by the app shell.
 */
export default function RentGuaranteeGuidePage() {
  return (
    <article className="rent-guarantee-guide" aria-labelledby="rent-guarantee-guide-title">
      <div className="rgg-container">
        <header>
          <p className="rgg-eyebrow">QuoteUs · Landlord resource</p>
          <h1 id="rent-guarantee-guide-title">Rent Guarantee for Canadian Landlords</h1>
          <p className="rgg-intro">
            Unpaid rent can leave a gap in your rental income. Before applying for rent
            guarantee, understand what it is designed to do, what it does not replace,
            and which details need to be checked.
          </p>
          <div className="rgg-actions">
            <Button asChild className="rgg-action">
              <a href="/rent-guarantee#landlord-form">
                Request an eligibility review <ArrowRight aria-hidden="true" />
              </a>
            </Button>
            <Button asChild variant="outline" className="rgg-action">
              <a href="/rent-clock">Explore the Rent Clock calculator</a>
            </Button>
          </div>
          <p className="rgg-notice">
            <strong>Availability:</strong> The QuoteUs rent guarantee product is not
            available in Quebec. Properties elsewhere still require an eligibility review.
          </p>
        </header>

        <div className="rgg-body">
          <div>
            <section className="rgg-section" aria-labelledby="rgg-purpose">
              <h2 id="rgg-purpose">What does rent guarantee do?</h2>
              <p>
                Rent guarantee is designed to help a landlord with eligible unpaid rent.
                Whether a missed payment qualifies depends on the agreement, including
                its start date, conditions, exclusions and claim requirements.
              </p>
              <p>
                It is not an automatic payment whenever rent is late. Ask for the
                applicable agreement and confirm what is included before relying on it.
              </p>
            </section>

            <section className="rgg-section" aria-labelledby="rgg-comparison">
              <h2 id="rgg-comparison">Rent guarantee vs. tenant and property insurance</h2>
              <dl className="rgg-comparison">
                <div>
                  <dt>Rent guarantee</dt>
                  <dd>
                    Focuses on eligible unpaid rent owed to the landlord, subject to
                    the agreement.
                  </dd>
                </div>
                <div>
                  <dt>Tenant insurance</dt>
                  <dd>
                    Generally protects a tenant’s belongings and personal liability,
                    with other benefits depending on the policy. It should not be
                    assumed to pay a landlord when a tenant misses rent.{" "}
                    <a href="/tenant" className="rgg-text-link">Explore tenant insurance</a>.
                  </dd>
                </div>
                <div>
                  <dt>Property insurance</dt>
                  <dd>
                    Generally protects the building against insured risks. Some
                    policies include lost rental income following an insured event,
                    but that is different from a tenant simply not paying rent.
                    Check your property policy’s wording.
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rgg-section" aria-labelledby="rgg-existing">
              <h2 id="rgg-existing">Existing tenancies and rent arrears</h2>
              <p>
                Having a tenant already in place does not establish eligibility.
                Disclose the tenancy’s start date, payment history and any current
                arrears when requesting a review.
              </p>
              <p>
                Do not assume that rent already owed, a known payment problem or an
                ongoing dispute will be covered. Ask specifically whether the tenancy
                qualifies and which future missed payments, if any, could be eligible.
              </p>
            </section>

            <section className="rgg-section" aria-labelledby="rgg-eligibility">
              <h2 id="rgg-eligibility">How to check eligibility</h2>
              <ol>
                <li>
                  Confirm the rental property’s province. This product excludes Quebec.
                </li>
                <li>
                  Use the{" "}
                  <a href="/rent-guarantee#landlord-form" className="rgg-text-link">
                    rent guarantee request form
                  </a>{" "}
                  to provide your contact, property and monthly rent details.
                </li>
                <li>
                  Tell the specialist about the tenancy and any missed payments.
                  Ask what screening and documents are required.
                </li>
                <li>
                  Review the written terms, including exclusions, effective date and
                  claim process. Confirm acceptance and when protection actually starts.
                </li>
              </ol>
              <p>
                Sending a request does not mean you have been approved or that
                protection is active.
              </p>
            </section>

            <section className="rgg-section" aria-labelledby="rgg-faq">
              <h2 id="rgg-faq">Common questions</h2>
              <div className="rgg-faq-item">
                <h3>Can I use the calculator to check coverage?</h3>
                <p>
                  No. The{" "}
                  <a href="/rent-clock" className="rgg-text-link">Rent Clock</a>{" "}
                  is an educational scenario calculator, not a live tribunal tracker
                  or a coverage decision. Using it does not submit an application
                  or activate protection.
                </p>
              </div>
              <div className="rgg-faq-item">
                <h3>Does tenant insurance replace rent guarantee?</h3>
                <p>
                  No. They address different risks. A tenant’s policy should not be
                  treated as protection against unpaid rent owed to a landlord.
                </p>
              </div>
              <div className="rgg-faq-item">
                <h3>Is every missed payment covered?</h3>
                <p>
                  No. Only eligible unpaid rent under the agreement may qualify.
                  Existing arrears and known payment issues must not be presumed covered.
                </p>
              </div>
            </section>
          </div>

          <aside aria-labelledby="rgg-checklist-title">
            <Card className="rgg-checklist">
              <CardHeader>
                <h2 id="rgg-checklist-title">Before you request a review</h2>
                <p>Have these details ready for the form or follow-up conversation.</p>
              </CardHeader>
              <CardContent>
                <ul>
                  <li>Your name, contact details and role in managing the property</li>
                  <li>Your address and the rental property’s full address and province</li>
                  <li>The monthly rent amount</li>
                  <li>The lease and tenancy start date</li>
                  <li>Payment history, any arrears and any ongoing dispute</li>
                  <li>Available tenant screening information; ask what is required</li>
                </ul>
                <p>
                  Follow the specialist’s instructions for providing documents.
                  You do not need to upload them to read this guide.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
        <p className="rgg-disclaimer">
          This guide is general information, not legal advice or a statement of your
          coverage. The applicable agreement determines eligibility and benefits.
          For tenancy rights or dispute procedures, consult your provincial authority
          or a qualified legal professional.
        </p>
      </div>
    </article>
  );
}
