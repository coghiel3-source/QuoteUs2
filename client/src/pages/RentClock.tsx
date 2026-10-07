import type { ReactNode } from "react";
import { ArrowRight, Building2, Clock3, FileCheck2, Handshake, House, ShieldCheck, Share2, WalletCards } from "lucide-react";
import { CLOCK_DISCLOSURE, CALCULATOR_DISCLOSURE, FOOTER_DISCLOSURE, RENT_CLOCK_PROVINCES, RENT_GUARANTEE_URL, type ProvinceCode } from "./rentClockConfig";
import { formatCAD, validateRent, validateUnits } from "./rentClockCalculation";
import { useCopyText, useRentClock } from "./useRentClock";
import landlordImage from "./rent-clock-landlord.jpg";
import "./rent-clock.css";

function Brand() {
  return <a className="rc-brand" href="https://quoteus.ca/" aria-label="QuoteUs.ca home"><img src="/logo.png" width="1280" height="1024" alt="QuoteUs.ca — Click-Quote-Covered" /></a>;
}

function SignupLink({ children, lime = false }: { children: ReactNode; lime?: boolean }) {
  return <a href={RENT_GUARANTEE_URL} className={`rc-button${lime ? " lime" : ""}`}>{children}<ArrowRight size={16} aria-hidden="true" /></a>;
}

export function RentClockWidget({ province, onProvinceChange }: { province: ProvinceCode; onProvinceChange: (value: ProvinceCode) => void }) {
  const config = RENT_CLOCK_PROVINCES.find(p => p.code === province) ?? RENT_CLOCK_PROVINCES[0];
  return (
    <section className="rc-clock" aria-labelledby="rent-clock-title">
      <div className="rc-clock-heading">
        <span className="rc-clock-symbol"><Clock3 size={21} aria-hidden="true" /></span>
        <div><h2 id="rent-clock-title">The Rent Clock</h2><p className="rc-clock-subtitle">A DIFFERENT WAY TO THINK ABOUT WAITING</p></div>
      </div>
      <label className="rc-province-label" htmlFor="rc-province">Choose your province</label>
      <select id="rc-province" value={province} onChange={event => onProvinceChange(event.target.value as ProvinceCode)}>
        {RENT_CLOCK_PROVINCES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
      </select>
      <div className="rc-comparison" aria-live="polite" aria-atomic="true">
        <div className="rc-counter">
          <p className="rc-counter-title">Tribunal wait scenario</p>
          <span className="rc-number">{config.days ?? "—"}</span>
          <span className="rc-counter-label">{config.days === null ? "data not connected" : "days of waiting"}</span>
          <span className="rc-status">{config.status}</span>
        </div>
        <div className="rc-counter target">
          <p className="rc-counter-title">QuoteUs payout campaign target*</p>
          <span className="rc-number">1</span>
          <span className="rc-counter-label">day · subject to confirmation</span>
          <span className="rc-target-note">Proposed, not confirmed</span>
        </div>
      </div>
      <p className="rc-clock-explanation">{config.explanation}</p>
      <p className="rc-clock-disclosure">{CLOCK_DISCLOSURE}</p>
      <div className="rc-clock-links">
        <a href={config.sourceUrl} target="_blank" rel="noopener noreferrer">Official {config.tribunal} website ↗<span className="sr-only"> (opens in a new tab)</span></a>
        <a href="https://quoteus.ca/" target="_blank" rel="noopener noreferrer">By QuoteUs.ca<span className="sr-only"> (opens in a new tab)</span></a>
      </div>
    </section>
  );
}

const faqs = [
  {
    question: "Does QuoteUs.ca guarantee payment in one day?",
    answer: "No. The one-day counter is a proposed campaign target, not a confirmed benefit or contractual promise. Payment timing depends on approved product terms, eligibility and claim requirements. Review the applicable agreement for confirmed terms.",
  },
  {
    question: "Are the tribunal numbers live?",
    answer: "No. Ontario uses an illustrative scenario of 8 months × 30 days, not a measured wait time. Verified provincial feeds are not connected. British Columbia and Alberta show data pending, rather than estimated wait-time figures. The official tribunal links provide provincial information.",
  },
  {
    question: "Can I protect an existing tenancy?",
    answer: "Eligibility depends on tenant history, required checks and the applicable product terms. An existing tenancy may need additional review. Existing arrears must not be assumed covered; ask about eligibility and exclusions before proceeding.",
  },
  {
    question: "Is Rent Guarantee available in Quebec?",
    answer: "No. Rent Guarantee is not available in Quebec. Quebec is not included in The Rent Clock tracker.",
  },
  {
    question: "What happens when I click “Let’s protect my rent”?",
    answer: "You continue to QuoteUs.ca’s Rent Guarantee page to explore your options and start the application process. Using the calculator does not submit an application, create an agreement or activate protection.",
  },
];

export default function RentClockPage() {
  const { inputs, setInputs, total, isEmbed, shareUrl, iframeCode } = useRentClock();
  const share = useCopyText();
  const embed = useCopyText();
  const rent = validateRent(inputs.rent);
  const units = validateUnits(inputs.units);
  const rentError = rent === null ? "Enter a positive CAD amount with up to two decimal places." : "";
  const unitsError = units === null ? "Enter a positive whole number of units." : "";
  const changeProvince = (province: ProvinceCode) => setInputs(previous => ({ ...previous, province }));
  if (isEmbed) {
    return <main className="rent-clock-page rc-embed-mode"><RentClockWidget province={inputs.province} onProvinceChange={changeProvince} /></main>;
  }
  return (
    <div className="rent-clock-page">
      <a href="#rc-main" className="rc-skip">Skip to main content</a>
      <header className="rc-container">
        <nav className="rc-nav" aria-label="Rent Clock campaign">
          <Brand />
          <div className="rc-nav-links">
            <a href="#rent-exposure">Your rent exposure</a>
            <a href="#how-it-works">How it works</a>
            <SignupLink>Get Rent Guarantee</SignupLink>
          </div>
        </nav>
      </header>
      <main id="rc-main">
        <div className="rc-container">
          <section className="rc-hero" aria-labelledby="rc-hero-title">
            <div>
              <p className="rc-eyebrow">RENT GUARANTEE FOR CANADIAN LANDLORDS</p>
              <h1 id="rc-hero-title">Your rental.<br />Your future.<br /><span>Let’s protect it.</span></h1>
              <p className="rc-tagline">We Don’t Wait for the Tribunal.</p>
              <div className="rc-hero-story">
                <p>You’ve put a lot into your rental. Let’s help you protect the income that supports it, with clear options and a friendly place to start.</p>
                <img src="/mascot.png" width="1024" height="1536" alt="The friendly QuoteUs.ca raccoon mascot" fetchPriority="high" />
              </div>
              <div className="rc-actions"><SignupLink>Let’s protect my rent</SignupLink><a href="#rent-exposure" className="rc-button secondary">See my rent exposure</a></div>
              <p className="rc-small">Check eligibility and terms before you commit. Not available in Quebec.</p>
            </div>
            <RentClockWidget province={inputs.province} onProvinceChange={changeProvince} />
          </section>
          <div className="rc-audience" aria-label="Who Rent Guarantee is for">
            <span><House size={18} aria-hidden="true" />Independent landlords · 1–10 rental units</span>
            <span><Building2 size={18} aria-hidden="true" />Property managers · portfolios of every size</span>
            <span><Handshake size={18} aria-hidden="true" />Realtors · help protect investor clients</span>
          </div>
          <section className="rc-section" id="rent-exposure" aria-labelledby="rc-exposure-title">
            <div className="rc-exposure-intro">
              <div><p className="rc-eyebrow">THE COST OF THE CLOCK</p><h2 id="rc-exposure-title">Every month adds up.</h2><p>Rent can stop. Mortgage payments, taxes and operating costs keep coming. See how much rental income could be at stake.</p></div>
              <img className="rc-landlord" src={landlordImage} width="1024" height="1024" loading="lazy" decoding="async" alt="A concerned landlord reviewing bills and a calculator at a kitchen table" />
            </div>
            <div className="rc-calculator">
              <div className="rc-controls">
                <div className="rc-input-grid">
                  <div className="rc-field">
                    <label htmlFor="rc-rent">Monthly rent per unit (CAD)</label>
                    <div className="rc-input-wrap"><span aria-hidden="true">$</span><input id="rc-rent" type="text" inputMode="decimal" autoComplete="off" value={inputs.rent} aria-invalid={!!rentError} aria-describedby={rentError ? "rc-rent-error" : undefined} onChange={event => setInputs(previous => ({ ...previous, rent: event.target.value }))} /></div>
                    {rentError && <p id="rc-rent-error" className="rc-field-error">{rentError}</p>}
                  </div>
                  <div className="rc-field">
                    <label htmlFor="rc-units">Units with unpaid rent</label>
                    <input id="rc-units" type="text" inputMode="numeric" autoComplete="off" value={inputs.units} aria-invalid={!!unitsError} aria-describedby={unitsError ? "rc-units-error" : undefined} onChange={event => setInputs(previous => ({ ...previous, units: event.target.value }))} />
                    {unitsError && <p id="rc-units-error" className="rc-field-error">{unitsError}</p>}
                  </div>
                </div>
                <div className="rc-field rc-range">
                  <label htmlFor="rc-months">Months without rent<output htmlFor="rc-months">{inputs.months} months</output></label>
                  <input id="rc-months" type="range" min="1" max="12" step="1" value={inputs.months} aria-valuetext={`${inputs.months} months without rent`} onChange={event => setInputs(previous => ({ ...previous, months: Number(event.target.value) }))} />
                  <div className="rc-range-ticks" aria-hidden="true"><span>1 month</span><span>12 months</span></div>
                </div>
                <p className="rc-small">{CALCULATOR_DISCLOSURE}</p>
              </div>
              <div className="rc-result">
                <div aria-live="polite" aria-atomic="true">
                  <p className="rc-eyebrow">POTENTIAL UNPAID RENT</p>
                  <p className="rc-result-amount">{total === null ? "—" : formatCAD(total)}</p>
                  <p className="rc-equation">{total !== null && rent !== null && units !== null ? `${formatCAD(rent)} × ${units.toLocaleString("en-CA")} ${units === 1 ? "unit" : "units"} × ${inputs.months} ${inputs.months === 1 ? "month" : "months"}` : rentError || unitsError ? "Enter valid amounts to see your scenario." : "This calculation is too large. Reduce the rent or number of units."}</p>
                </div>
                <SignupLink>Check my Rent Guarantee options</SignupLink>
                <button className="rc-text-button" disabled={total === null || !shareUrl} onClick={() => share.copy(shareUrl, "Calculation link copied. Opening it restores your scenario.")}><Share2 size={14} aria-hidden="true" />Share my calculation</button>
                <p className="rc-copy-feedback" role="status">{share.feedback}</p>
                {share.fallback && <label className="rc-copy-fallback">Calculation link — select and copy<textarea readOnly value={share.fallback} aria-label="Shareable calculation URL" onFocus={event => event.currentTarget.select()} /></label>}
              </div>
            </div>
            <details className="rc-embed-details">
              <summary>For associations &amp; property managers: embed The Rent Clock</summary>
              <div className="rc-embed-body">
                <p>Add this educational comparison to your website. The widget includes its province selector, source links, disclosures and QuoteUs.ca attribution. Its frame allows scrolling in narrow containers; keep disclosures visible.</p>
                <label htmlFor="rc-embed-code" className="rc-small">Read-only iframe embed code</label>
                <textarea id="rc-embed-code" className="rc-embed-code" value={iframeCode} readOnly onFocus={event => event.currentTarget.select()} />
                <button className="rc-button secondary" disabled={!iframeCode} onClick={() => embed.copy(iframeCode, "Embed code copied.")}>Copy embed code</button>
                <p className="rc-copy-feedback" role="status">{embed.feedback}</p>
                {embed.fallback && <p className="rc-small">Select the read-only code above, then use your device’s copy command.</p>}
              </div>
            </details>
          </section>
        </div>
        <section className="rc-benefits-section">
          <div className="rc-container rc-section rc-benefits">
            <div><p className="rc-eyebrow">A LITTLE MORE CERTAINTY</p><h2>Less uncertainty.<br />More room to breathe.</h2></div>
            <div className="rc-benefit-list">
              <article className="rc-benefit"><ShieldCheck size={25} aria-hidden="true" /><div><h3>Plan for a missed payment</h3><p>Explore protection for eligible unpaid rent, subject to tenant eligibility, required checks and the terms of your agreement.</p></div></article>
              <article className="rc-benefit"><WalletCards size={25} aria-hidden="true" /><div><h3>Keep the bigger picture in view</h3><p>Rent protection can support cash-flow planning alongside your mortgage payments, taxes and everyday operating costs.</p></div></article>
              <article className="rc-benefit"><FileCheck2 size={25} aria-hidden="true" /><div><h3>Know what you’re signing up for</h3><p>Review eligibility, pricing, limits, exclusions and payout timing before you commit. Understand what is—and isn’t—included.</p></div></article>
            </div>
          </div>
        </section>
        <div className="rc-container">
          <section className="rc-section" id="how-it-works" aria-labelledby="rc-process-title">
            <div className="rc-process-heading"><p className="rc-eyebrow">YOUR NEXT STEP, MADE CLEAR</p><h2 id="rc-process-title">Three steps. A clearer plan.</h2></div>
            <ol className="rc-process-list">
              <li><span className="rc-step-number">01 / YOUR RENTAL</span><h3>Tell us about your rental.</h3><p>Start on QuoteUs.ca’s Rent Guarantee page and share the property and tenancy details needed for review.</p></li>
              <li><span className="rc-step-number">02 / YOUR OPTIONS</span><h3>Review your eligibility &amp; options.</h3><p>Understand the eligibility requirements, pricing, coverage limits, exclusions and confirmed payout terms.</p></li>
              <li><span className="rc-step-number">03 / YOUR AGREEMENT</span><h3>Complete your agreement.</h3><p>Review your agreement and finish the required checks and paperwork before protection can begin.</p></li>
            </ol>
            <p className="rc-process-disclosure">Protection begins according to the approved agreement after required checks and paperwork.</p>
          </section>
          <section className="rc-section rc-faq-section rc-faq-layout" aria-labelledby="rc-faq-title">
            <div><p className="rc-eyebrow">GOOD QUESTIONS. CLEAR ANSWERS.</p><h2 id="rc-faq-title">Let’s clear<br />a few things up.</h2></div>
            <div className="rc-faq">{faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
          </section>
          <section className="rc-final" aria-labelledby="rc-final-title">
            <div><h2 id="rc-final-title">A little protection.<br />A lot more peace of mind.</h2><p>Find out whether your rental qualifies for Rent Guarantee. Get the details, understand the terms, and take the next step with confidence.</p><SignupLink lime>Start with QuoteUs.ca</SignupLink></div>
            <img src="/mascot.png" width="1024" height="1536" loading="lazy" decoding="async" alt="The QuoteUs.ca raccoon mascot, ready to help you take the next step" />
          </section>
        </div>
      </main>
      <footer className="rc-container rc-footer">
        <div className="rc-footer-top"><Brand /><nav aria-label="Campaign footer" className="rc-footer-links"><a href="https://quoteus.ca/">QuoteUs.ca</a><a href="https://quoteus.ca/privacy">Privacy</a><a href={RENT_GUARANTEE_URL}>Rent Guarantee</a></nav></div>
        <p className="rc-footer-disclosure">{FOOTER_DISCLOSURE}</p>
      </footer>
    </div>
  );
}
