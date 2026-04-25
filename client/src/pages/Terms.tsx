import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      <div className="bg-primary text-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 text-accent">
            <FileText size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">Terms of Service</h1>
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            Please read these terms carefully before using the QuoteUs.ca platform and services.
          </p>
          <p className="text-sm text-primary-foreground/60 mt-4">Effective Date: April 19, 2026</p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 -mt-12">
        <Card className="shadow-xl border-none mb-8">
          <CardContent className="p-8 md:p-12 prose prose-slate max-w-none">

            <h2>Ownership and Operator</h2>
            <p>
              QuoteUs.ca is owned and operated by <strong>1001569714 Ontario Inc. o/a QuoteUs.ca</strong> ("QuoteUs.ca", "QuoteUs", "we", "our", or "us").
            </p>
            <p>
              Welcome to QuoteUs.ca ("QuoteUs", "we", "our", or "us"). These Terms of Service ("Terms") govern your access to and use of our website, platform, and services (collectively, the "Platform"). By accessing or using the Platform, you agree to be bound by these Terms.
            </p>

            <h2>1. Overview of Services</h2>
            <p>QuoteUs.ca provides:</p>
            <ul>
              <li>Insurance-related information, quotes, and referral services</li>
              <li>Rent Guarantee products and related services</li>
              <li>A peer-to-peer marketplace connecting independent vendors, brokers, landlords, tenants, and other users ("Vendors" and "Users")</li>
            </ul>
            <p>
              QuoteUs.ca is <strong>not</strong> an insurer, underwriter, broker (unless explicitly stated in writing), financial advisor, or fiduciary. We do not guarantee the availability, accuracy, completeness, legality, or suitability of any product or service offered through the Platform.
            </p>

            <h2>2. Peer-to-Peer Marketplace Disclaimer</h2>
            <p>The Platform may facilitate a peer-to-peer marketplace where Vendors offer products and services directly to Users.</p>
            <ul>
              <li>QuoteUs.ca acts solely as a <strong>passive technology platform and intermediary</strong>. We do not control, supervise, or direct Vendors or Users.</li>
              <li>All transactions are <strong>strictly between Users and Vendors</strong>. QuoteUs.ca is not a party to any agreement, contract, or transaction between Users and Vendors.</li>
              <li>QuoteUs.ca <strong>does not endorse, verify, warrant, or assume responsibility</strong> for any Vendor, product, service, or transaction.</li>
            </ul>

            <h3>Vendor Responsibility</h3>
            <p>Vendors are solely responsible for:</p>
            <ul>
              <li>Compliance with all applicable laws and regulations</li>
              <li>Accuracy of listings, representations, and documentation</li>
              <li>Delivery, performance, and fulfillment of services</li>
              <li>Handling disputes, refunds, and claims</li>
            </ul>

            <h3>User Responsibility</h3>
            <p>Users acknowledge that:</p>
            <ul>
              <li>They engage Vendors entirely at their own risk</li>
              <li>They must perform independent due diligence before entering into any agreement</li>
            </ul>

            <h2>3. No Liability (Enhanced Protection)</h2>
            <p>
              To the fullest extent permitted by applicable law, QuoteUs.ca, its parent company, affiliates, directors, officers, employees, agents, and contractors shall have <strong>no liability whatsoever</strong>, whether in contract, tort (including negligence), strict liability, or otherwise, for:
            </p>
            <ul>
              <li>Any direct, indirect, incidental, consequential, special, exemplary, or punitive damages</li>
              <li>Loss of profits, revenue, business opportunities, data, goodwill, or anticipated savings</li>
              <li>Personal injury, property damage, or economic loss</li>
              <li>Any loss arising from transactions between Users and Vendors</li>
              <li>Errors, omissions, delays, or inaccuracies in listings or content</li>
              <li>Failure, misconduct, negligence, or non-performance by any Vendor or third party</li>
            </ul>
            <p>QuoteUs.ca does not assume and expressly disclaims liability for:</p>
            <ul>
              <li>Insurance coverage decisions or outcomes</li>
              <li>Rent Guarantee approvals, claims, or denials</li>
              <li>Financial or investment-related decisions made by Users</li>
              <li>Any reliance placed on information provided through the Platform</li>
            </ul>
            <p>
              All liability is expressly disclaimed and, where applicable, transferred solely to the Vendor or third-party provider.
            </p>

            <h2>4. Rent Guarantee Products</h2>
            <p>Rent Guarantee products offered on the Platform are provided exclusively by third-party Vendors.</p>
            <ul>
              <li>QuoteUs.ca is <strong>not</strong> the guarantor, insurer, or underwriter</li>
              <li>All obligations lie solely with the issuing Vendor</li>
              <li>Terms, coverage, and claims are governed exclusively by the Vendor's agreement</li>
            </ul>
            <p>Users are solely responsible for reviewing Vendor-specific agreements before purchasing.</p>

            <h2>5. User Accounts</h2>
            <p>Users may be required to create an account. You agree to:</p>
            <ul>
              <li>Provide accurate and complete information</li>
              <li>Maintain the confidentiality of login credentials</li>
              <li>Be fully responsible for all activity under your account</li>
            </ul>
            <p>
              QuoteUs.ca reserves the right to suspend, restrict, or terminate accounts at its sole discretion without liability.
            </p>

            <h2>6. Prohibited Uses</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Platform for unlawful, fraudulent, or deceptive purposes</li>
              <li>Misrepresent identity, credentials, or authority</li>
              <li>Upload false, misleading, or harmful content</li>
              <li>Interfere with or disrupt the Platform's security or operation</li>
            </ul>

            <h2>7. Intellectual Property</h2>
            <p>
              All content on the Platform is owned by or licensed to QuoteUs.ca and is protected by applicable intellectual property laws. Unauthorized use is strictly prohibited.
            </p>

            <h2>8. Third-Party Services</h2>
            <p>The Platform may include third-party links or integrations.</p>
            <p>QuoteUs.ca has no control over and assumes no responsibility for:</p>
            <ul>
              <li>Third-party content, policies, or practices</li>
              <li>Data handling or security by third parties</li>
              <li>Any damages resulting from third-party interactions</li>
            </ul>

            <h2>9. Disclaimers</h2>
            <p>
              The Platform is provided on an <strong>"as is"</strong> and <strong>"as available"</strong> basis, without warranties of any kind.
            </p>
            <p>QuoteUs.ca expressly disclaims all warranties, including:</p>
            <ul>
              <li>Merchantability</li>
              <li>Fitness for a particular purpose</li>
              <li>Non-infringement</li>
            </ul>
            <p>We do not guarantee uninterrupted, secure, or error-free operation.</p>

            <h2>10. Indemnification (Strengthened)</h2>
            <p>
              You agree to fully indemnify, defend, and hold harmless QuoteUs.ca and its parent company (1001569714 Ontario Inc.), affiliates, directors, officers, employees, and agents from and against any and all claims, demands, damages, losses, liabilities, costs, and expenses (including legal fees) arising from:
            </p>
            <ul>
              <li>Your use or misuse of the Platform</li>
              <li>Your interactions or transactions with Vendors</li>
              <li>Your violation of these Terms or applicable laws</li>
            </ul>
            <p>
              Vendors specifically agree to indemnify and hold harmless QuoteUs.ca from all claims related to their products, services, conduct, and transactions.
            </p>

            <h2>11. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law:</p>
            <ul>
              <li>QuoteUs.ca's total aggregate liability shall not exceed <strong>$100 CAD</strong></li>
              <li>This limitation applies regardless of the cause of action and even if advised of potential damages</li>
              <li>If applicable law does not allow full limitation, liability shall be limited to the minimum extent permitted</li>
            </ul>

            <h2>12. Termination</h2>
            <p>
              We may suspend or terminate access to the Platform at any time, for any reason, without notice or liability.
            </p>

            <h2>13. Governing Law</h2>
            <p>
              These Terms shall be governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein.
            </p>

            <h2>14. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Continued use constitutes acceptance of updated Terms.
            </p>

            <h2>15. Contact</h2>
            <p>
              QuoteUs.ca<br />
              Email: <a href="mailto:info@quoteus.ca">info@quoteus.ca</a><br />
              Website: <a href="https://www.quoteus.ca" target="_blank" rel="noopener noreferrer">https://www.quoteus.ca</a>
            </p>

            <h2>16. Refunds, Processing Fees, and Payments</h2>

            <h3>Non-Refundable Fees</h3>
            <p>All fees are <strong>strictly non-refundable</strong> under all circumstances, including disputes, cancellations, or dissatisfaction.</p>

            <h3>Third-Party Payment Processor</h3>
            <p>Payments are processed through third parties (e.g., Stripe). QuoteUs.ca is not responsible for:</p>
            <ul>
              <li>Processing errors, delays, or failures</li>
              <li>Security breaches or data issues</li>
            </ul>

            <h3>Refunds and Vendor Responsibility</h3>
            <ul>
              <li>QuoteUs.ca does not issue refunds</li>
              <li>Users must contact Vendors directly</li>
              <li>Vendors independently determine refund policies</li>
            </ul>

            <h3>Chargebacks and Disputes</h3>
            <p>Users agree not to initiate chargebacks without first contacting the Vendor.</p>
            <p>QuoteUs.ca reserves the right to:</p>
            <ul>
              <li>Suspend accounts</li>
              <li>Recover associated costs</li>
              <li>Share transaction data to dispute chargebacks</li>
            </ul>
            <p>Vendors assume full responsibility for disputes and agree to indemnify QuoteUs.ca.</p>

            <h2>17. Acknowledgement</h2>
            <p>
              By using the Platform, you acknowledge that you have read, understood, and agree to these Terms.
            </p>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
