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

            <p className="lead">
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
              QuoteUs.ca is <strong>not</strong> an insurer, underwriter, broker (unless explicitly stated), or financial advisor. We do not guarantee the availability, accuracy, or suitability of any product or service offered through the Platform.
            </p>

            <h2>2. Peer-to-Peer Marketplace Disclaimer</h2>
            <p>The Platform may facilitate a peer-to-peer marketplace where Vendors offer products and services directly to Users.</p>
            <ul>
              <li>QuoteUs.ca acts solely as a <strong>technology platform and intermediary</strong>.</li>
              <li>All transactions are <strong>strictly between Users and Vendors</strong>.</li>
              <li>QuoteUs.ca <strong>does not endorse, guarantee, or assume responsibility</strong> for any Vendor, product, service, or transaction.</li>
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
              <li>They engage Vendors at their own risk</li>
              <li>They must perform their own due diligence before entering into any agreement</li>
            </ul>

            <h2>3. No Liability</h2>
            <p>To the fullest extent permitted by law, QuoteUs.ca shall not be liable for:</p>
            <ul>
              <li>Any direct, indirect, incidental, consequential, or punitive damages</li>
              <li>Any loss arising from transactions between Users and Vendors</li>
              <li>Errors, omissions, or inaccuracies in listings or content</li>
              <li>Failure of any Vendor to perform or deliver services</li>
            </ul>
            <p>QuoteUs.ca does not assume liability for:</p>
            <ul>
              <li>Insurance coverage decisions</li>
              <li>Rent Guarantee claims or denials</li>
              <li>Financial losses incurred through use of the Platform</li>
            </ul>
            <p>All liability is expressly <strong>transferred to the Vendor or third-party provider</strong>.</p>

            <h2>4. Rent Guarantee Products</h2>
            <p>Rent Guarantee products offered on the Platform may be provided by third-party Vendors.</p>
            <ul>
              <li>QuoteUs.ca is <strong>not the guarantor or insurer</strong></li>
              <li>All obligations related to Rent Guarantee products lie solely with the issuing Vendor</li>
              <li>Terms, coverage, and claims are governed by the Vendor's agreement</li>
            </ul>
            <p>Users must review Vendor-specific agreements carefully.</p>

            <h2>5. User Accounts</h2>
            <p>Users may be required to create an account. You agree to:</p>
            <ul>
              <li>Provide accurate and complete information</li>
              <li>Maintain the confidentiality of your login credentials</li>
              <li>Be responsible for all activity under your account</li>
            </ul>
            <p>QuoteUs.ca reserves the right to suspend or terminate accounts at its discretion.</p>

            <h2>6. Prohibited Uses</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Platform for unlawful or fraudulent purposes</li>
              <li>Misrepresent identity or authority</li>
              <li>Upload false, misleading, or harmful content</li>
              <li>Interfere with the security or operation of the Platform</li>
            </ul>

            <h2>7. Intellectual Property</h2>
            <p>
              All content on the Platform, including logos, text, graphics, and software, is owned by or licensed to QuoteUs.ca. You may not copy, distribute, or exploit any content without prior written consent.
            </p>

            <h2>8. Third-Party Services</h2>
            <p>The Platform may include links or integrations with third-party services. QuoteUs.ca is not responsible for:</p>
            <ul>
              <li>Third-party content or policies</li>
              <li>Data handling by third parties</li>
              <li>Any damages resulting from third-party interactions</li>
            </ul>

            <h2>9. Disclaimers</h2>
            <p>The Platform is provided "as is" and "as available". QuoteUs.ca makes no warranties, including:</p>
            <ul>
              <li>Merchantability</li>
              <li>Fitness for a particular purpose</li>
              <li>Non-infringement</li>
            </ul>
            <p>We do not guarantee uninterrupted or error-free service.</p>

            <h2>10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless QuoteUs.ca, its directors, officers, employees, and affiliates from any claims, damages, or liabilities arising from:
            </p>
            <ul>
              <li>Your use of the Platform</li>
              <li>Your interaction with Vendors</li>
              <li>Your violation of these Terms</li>
            </ul>
            <p>
              Vendors specifically agree to indemnify QuoteUs.ca against all claims related to their products, services, and transactions.
            </p>

            <h2>11. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law:</p>
            <ul>
              <li>QuoteUs.ca's total liability shall not exceed $100 CAD</li>
              <li>We are not liable for indirect or consequential damages</li>
            </ul>

            <h2>12. Termination</h2>
            <p>We may suspend or terminate access to the Platform at any time without notice.</p>

            <h2>13. Governing Law</h2>
            <p>
              These Terms shall be governed by the laws of the Province of Ontario and the laws of Canada applicable therein.
            </p>

            <h2>14. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. Continued use of the Platform constitutes acceptance of the revised Terms.
            </p>

            <h2>15. Contact</h2>
            <p>For questions regarding these Terms, contact:</p>
            <p>
              <strong>QuoteUs.ca</strong><br />
              Email: <a href="mailto:info@quoteus.ca">info@quoteus.ca</a><br />
              Website: <a href="https://www.quoteus.ca" target="_blank" rel="noopener noreferrer">https://www.quoteus.ca</a>
            </p>

            <h2>16. Refunds, Processing Fees, and Payments</h2>
            <p>
              QuoteUs.ca is owned and operated by <strong>1001569714 Ontario Inc. o/a QuoteUs.ca</strong> ("QuoteUs.ca").
            </p>

            <h3>Non-Refundable Fees</h3>
            <p>
              All fees charged by QuoteUs.ca for use of the Platform, including but not limited to processing fees, service fees, platform fees, and transaction fees, are <strong>strictly non-refundable under all circumstances</strong>, including but not limited to:
            </p>
            <ul>
              <li>Completed or partially completed transactions</li>
              <li>Cancelled services</li>
              <li>Disputes between Users and Vendors</li>
              <li>Dissatisfaction with Vendor services</li>
            </ul>

            <h3>Third-Party Payment Processor</h3>
            <p>Payments on the Platform are processed through third-party payment processors, including but not limited to Stripe.</p>
            <p>By using the Platform, you acknowledge and agree that:</p>
            <ul>
              <li>QuoteUs.ca does not store or control your full payment information</li>
              <li>All payment processing is subject to the terms, conditions, and policies of the payment processor</li>
              <li>QuoteUs.ca is not responsible for payment processing errors, delays, failures, or security breaches caused by third-party providers</li>
            </ul>

            <h3>Refunds and Vendor Responsibility</h3>
            <p>QuoteUs.ca does not issue refunds for any products or services purchased through the Platform.</p>
            <p>To request a refund, Users must:</p>
            <ul>
              <li>Contact the Vendor directly</li>
              <li>Follow the Vendor's individual refund, cancellation, and dispute policies</li>
            </ul>
            <p>Users acknowledge and agree that:</p>
            <ul>
              <li>Each Vendor independently establishes their own refund policies</li>
              <li>QuoteUs.ca has no authority or obligation to enforce refunds</li>
              <li>All refund decisions are made solely by the Vendor</li>
            </ul>

            <h3>Chargebacks and Payment Disputes</h3>
            <p>Users agree not to initiate chargebacks or payment disputes without first attempting to resolve the issue directly with the Vendor.</p>
            <p>In the event of a chargeback or payment dispute:</p>
            <ul>
              <li>QuoteUs.ca reserves the right to suspend or terminate the User's account</li>
              <li>Any fees, penalties, or costs incurred by QuoteUs.ca as a result of the chargeback may be recovered from the User</li>
              <li>QuoteUs.ca may provide transaction records, communications, and account information to the payment processor or financial institution to dispute the chargeback</li>
            </ul>
            <p>
              Vendors are solely responsible for handling all disputes, refunds, and chargeback claims related to their products or services and agree to indemnify and hold harmless QuoteUs.ca from any resulting claims, losses, or liabilities.
            </p>

            <h2>17. Acknowledgement</h2>
            <p>
              By using the Platform, you acknowledge that you have read, understood, and agree to these Terms of Service.
            </p>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
