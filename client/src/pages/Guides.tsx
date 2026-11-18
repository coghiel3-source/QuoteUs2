export default function GuidesPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <header className="mb-9 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight">Guides &amp; Tools</h1>
        <p className="mt-3 text-muted-foreground">Find resources to help you compare Ontario auto insurance or understand your options for unpaid rent.</p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-card p-6" aria-labelledby="guides-auto">
          <h2 id="guides-auto" className="text-xl font-bold">Ontario Auto Insurance</h2>
          <p className="my-3 text-muted-foreground">Learn what details an insurer may need before comparing quotes.</p>
          <ul className="space-y-3">
            <li><a className="text-primary underline underline-offset-4" href="https://www.fsrao.ca/consumers/auto-insurance/understanding-auto-insurance-rates/getting-auto-insurance-quote">FSRA’s guide to getting an auto insurance quote</a></li>
            <li><a className="font-semibold text-primary underline underline-offset-4" href="/auto#auto-quote-form">Request an Ontario auto quote</a></li>
          </ul>
        </section>
        <section className="rounded-xl border bg-card p-6" aria-labelledby="guides-landlord">
          <h2 id="guides-landlord" className="text-xl font-bold">Landlord Rent Guarantee</h2>
          <p className="my-3 text-muted-foreground">Understand how eligibility works and estimate what missed rent could cost.</p>
          <ul className="space-y-3">
            <li><a className="text-primary underline underline-offset-4" href="/rent-guarantee-guide">Read the landlord Rent Guarantee guide</a></li>
            <li><a className="text-primary underline underline-offset-4" href="/rent-clock">Use the unpaid rent calculator</a></li>
            <li><a className="font-semibold text-primary underline underline-offset-4" href="/rent-guarantee#landlord-form">Check Rent Guarantee eligibility</a></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
