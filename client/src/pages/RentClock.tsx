import { useEffect, useRef } from "react";
import { ArrowRight, Clock3, Share2 } from "lucide-react";
import { trackRentClock } from "@/lib/rentClockAnalytics";
import { CLOCK_DISCLOSURE, CALCULATOR_DISCLOSURE, FOOTER_DISCLOSURE, RENT_CLOCK_PROVINCES, RENT_GUARANTEE_URL, type ProvinceCode } from "./rentClockConfig";
import { formatCAD, validateRent, validateUnits } from "./rentClockCalculation";
import { useCopyText, useRentClock } from "./useRentClock";
import "./rent-clock.css";

function Brand() {
  return <a className="rc-brand" href="https://quoteus.ca/" aria-label="QuoteUs.ca home"><img src="/logo.png" width="1280" height="1024" alt="QuoteUs.ca — Click-Quote-Covered" /></a>;
}

function SignupLink({ placement }: { placement: "hero" | "calculator" | "footer" | "mobile" }) {
  return <a href={`${RENT_GUARANTEE_URL}?source=rent_clock`} className="rc-button" onClick={() => trackRentClock("cta_click", { placement })}>Check my eligibility<ArrowRight size={16} aria-hidden="true" /></a>;
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
    question: "What happens when I click “Check my eligibility”?",
    answer: "You continue to QuoteUs.ca’s Rent Guarantee page. The calculator does not submit an application, create an agreement or activate protection.",
  },
];

export default function RentClockPage() {
  const { inputs, setInputs, total, isEmbed, shareUrl, iframeCode } = useRentClock();
  const share = useCopyText();
  const embed = useCopyText();
  const viewed = useRef(false);
  const calculatorUsed = useRef(false);
  useEffect(() => {
    if (!isEmbed && !viewed.current) {
      viewed.current = true;
      trackRentClock("page_view", { mode: "landing" });
    }
  }, [isEmbed]);
  const useCalculator = () => {
    if (!calculatorUsed.current) {
      calculatorUsed.current = true;
      trackRentClock("calculator_used", { province: inputs.province });
    }
  };
  const rent = validateRent(inputs.rent);
  const units = validateUnits(inputs.units);
  const rentError = rent === null ? "Enter a positive CAD amount with up to two decimal places." : "";
  const unitsError = units === null ? "Enter a positive whole number of units." : "";
  const changeProvince = (province: ProvinceCode) => {
    setInputs(previous => ({ ...previous, province }));
    trackRentClock("province_changed", { province, mode: isEmbed ? "embed" : "landing" });
  };
  const shareCalculation = async () => {
    const copied = await share.copy(shareUrl, "Calculation link copied.");
    trackRentClock(copied ? "share_success" : "share_fallback", { province: inputs.province });
  };
  const copyEmbed = async () => {
    const copied = await embed.copy(iframeCode, "Embed code copied.");
    trackRentClock(copied ? "embed_copy_success" : "embed_copy_fallback", { province: inputs.province });
  };
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
          </div>
        </nav>
      </header>
      <main id="rc-main">
        <div className="rc-container">
          <section className="rc-hero" aria-labelledby="rc-hero-title">
            <div>
              <p className="rc-eyebrow">RENT GUARANTEE · ON / BC / AB</p>
              <h1 id="rc-hero-title">Rent stops.<br /><span>Your bills don’t.</span></h1>
              <div className="rc-hero-story">
                <p>Explore protection for eligible unpaid rent. Check whether your rental qualifies, then review the terms.</p>
                <img src="/mascot.png" width="1024" height="1536" alt="The friendly QuoteUs.ca raccoon mascot" fetchPriority="high" />
              </div>
              <div className="rc-actions"><SignupLink placement="hero" /></div>
              <p className="rc-small">Subject to eligibility and agreement terms. Not available in Quebec.</p>
            </div>
            <RentClockWidget province={inputs.province} onProvinceChange={changeProvince} />
          </section>
          <section className="rc-next-steps" aria-label="How it works">
            <ol><li><span>01</span>Tell us about your rental</li><li><span>02</span>Review eligibility &amp; terms</li><li><span>03</span>Complete checks &amp; agreement</li></ol>
            <p>Protection begins only as set out in the approved agreement.</p>
          </section>
          <section className="rc-section" id="rent-exposure" aria-labelledby="rc-exposure-title">
            <div className="rc-exposure-intro">
              <div><h2 id="rc-exposure-title">What could unpaid rent cost you?</h2><p>Adjust the numbers to see your planning scenario—not a coverage estimate.</p></div>
            </div>
            <div className="rc-calculator">
              <div className="rc-controls" onChange={useCalculator}>
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
                <SignupLink placement="calculator" />
                <button className="rc-text-button" disabled={total === null || !shareUrl} onClick={shareCalculation}><Share2 size={14} aria-hidden="true" />Share my calculation</button>
                <p className="rc-copy-feedback" role="status">{share.feedback}</p>
                {share.fallback && <label className="rc-copy-fallback">Calculation link — select and copy<textarea readOnly value={share.fallback} aria-label="Shareable calculation URL" onFocus={event => event.currentTarget.select()} /></label>}
              </div>
            </div>
            <div className="rc-disclosures">
            <details>
              <summary>Questions &amp; eligibility</summary>
              <div className="rc-faq">{faqs.map((faq, index) => <details key={faq.question} onToggle={event => { if (event.currentTarget.open) trackRentClock("faq_open", { question_index: index }); }}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
            </details>
            <details>
              <summary>Embed The Rent Clock on your website</summary>
              <div className="rc-embed-body">
                <p>Includes province selection, sources and disclosures. Allow scrolling and keep disclosures visible.</p>
                <label htmlFor="rc-embed-code" className="rc-small">Read-only iframe embed code</label>
                <textarea id="rc-embed-code" className="rc-embed-code" value={iframeCode} readOnly onFocus={event => event.currentTarget.select()} />
                <button className="rc-button secondary" disabled={!iframeCode} onClick={copyEmbed}>Copy embed code</button>
                <p className="rc-copy-feedback" role="status">{embed.feedback}</p>
                {embed.fallback && <p className="rc-small">Select the read-only code above, then use your device’s copy command.</p>}
              </div>
            </details>
            </div>
          </section>
        </div>
      </main>
      <footer className="rc-container rc-footer">
        <div className="rc-footer-top"><Brand /><nav aria-label="Campaign footer" className="rc-footer-links"><a href="https://quoteus.ca/privacy">Privacy</a><SignupLink placement="footer" /></nav></div>
        <p className="rc-footer-disclosure">{FOOTER_DISCLOSURE}</p>
      </footer>
      <div className="rc-mobile-cta" aria-label="Check Rent Guarantee eligibility"><SignupLink placement="mobile" /></div>
    </div>
  );
}
