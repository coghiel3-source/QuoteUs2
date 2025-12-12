import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      <div className="bg-primary text-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
           <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 text-accent">
             <Shield size={32} />
           </div>
           <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">Privacy Policy</h1>
           <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
             Your privacy is our priority. We are committed to protecting your personal data and using it responsibly.
           </p>
           <p className="text-sm text-primary-foreground/60 mt-4">Last Updated: July 21, 2025</p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 -mt-12">
        <Card className="shadow-xl border-none mb-8">
          <CardContent className="p-8 md:p-12 prose prose-slate max-w-none">
            
            <p className="lead">
              Quoteus.ca (in this Policy, “Quoteus.ca”/“we”/”us”) is committed to protecting your privacy. This privacy policy (the “Privacy Policy”) applies to the Quoteus.ca website, www.Quoteus.ca (the “Website”) together with our services as further described in our terms of use (the “Services”).
            </p>
            <p>
              The Privacy Policy describes our practices and procedures with respect to privacy and how we collect, store, use and distribute information about our users (“you”) through the Website and Services.
            </p>

            <h3>Accountability</h3>
            <p>
              We maintain internal practices and procedures to ensure that we comply with this Privacy Policy as well as update it as our offerings and activities change. We endeavour to maintain, and periodically update, practices and procedures that:
            </p>
            <ul>
              <li>Define the purposes of our collection of your Personal Information;</li>
              <li>Obtain valid and meaningful consent for that collection;</li>
              <li>Limit collection, use and disclosure of your Personal Information;</li>
              <li>Ensure your personal information is correct, complete and current;</li>
              <li>Ensure security measures are adequate to protect your Personal Information;</li>
              <li>Maintain a retention and destruction timetable;</li>
              <li>Respond to complaints, inquiries and requests to access your Personal Information;</li>
              <li>Address breach and incident-management protocols;</li>
              <li>Assess potential risks to your Personal Information;</li>
            </ul>

            <h3>Identifying Purposes</h3>
            <p>
              Ultimately, we use your Personal Information to provide you with the Services. We aim to collect, use and disclose only such information as is required to enable us to manage your account, to provide the Services, to maintain our customer/user lists, to respond to your inquiries or provide feedback, for identification and authentication purposes, and for service improvement.
            </p>
            <p>
              More specifically, the purposes for which we collect, use, and disclose your Personal Information are listed in the Use and Disclosure Section below. Generally, the purposes are to:
            </p>
            <ul>
              <li>provide you with our products and services, including through third-party suppliers;</li>
              <li>better understand your needs and preferences;</li>
              <li>maintain responsible commercial relations with you;</li>
              <li>determine your eligibility for products and services and recommend products and services to you;</li>
              <li>develop and enhance our products and services;</li>
              <li>market products and services that may be of interest to you;</li>
              <li>manage our business operations;</li>
              <li>detect, suppress or prevent fraud and manage and secure our networks; and</li>
              <li>meet our legal and regulatory obligations.</li>
            </ul>

            <h3>Consent</h3>
            <p>
              When you use the Service, your consent to the collection, use, and disclosure of Personal Information as described in this Privacy Policy will be implied in certain circumstances, most often when you willingly and intentionally provide us with your personal information, including directly in writing or electronically, for a specific stated purpose.
            </p>
            <p>
              We also rely on third parties for your consent when you access the Services using devices or software that you have disclosed your personal information to, and those services are permitted to disclose it to us.
            </p>
            <p>
              We may also seek your express consent to the collection, use or disclosure of your personal information. Most often, we will seek your express consent when it is highly sensitive or required for a new purpose. We may obtain your consent by your checking of a box, your acquiescence to an agreement or your taking another affirmative action by requesting service on our website.
            </p>

            <h3>Information</h3>
            <p>
              Two types of information may be collected through the Website and our Services: Personal Information and Website Information.
            </p>
            <p>
              <strong>“Personal Information”</strong> is personally identifiable information, such as your name, address, e-mail address, credit card information, address, birth date and gender etc. At the time of collection, we will identify the Personal Information being collected and the purposes for which it will be used.
            </p>
            <p>
              <strong>“Website Information”</strong> is information we collect when you visit our Website, such as an Internet Protocol Address (IP Address), the domain used to access the Website, and the type and version of browser or operating system being used by visitors to the Website.
            </p>

            <h3>Collection</h3>
            <p>
              We may collect Personal Information in respect of the Website through a registration process, request form submissions, financial product and service quote inquiries, communications with you, user support, online tools, and expert advice services.
            </p>
            <p>
              We also collect aggregate information, such as demographic statistics of our users (e.g. average age or geographical allocation of our users), number of visitors, what pages users access or visit, and average time spent on the Website. Similarly, business contact information such as the name, title, business address, or telephone number of a business or professional person or an employee of an organization is not considered Personal Information when such information is used for the purposes of contacting the individual in their business/professional capacity.
            </p>
            <p>
              In addition to the Personal information we collect directly from you, we also work with third parties to more fully understand your journey from requesting a quote to receiving a financial product. This information received from third parties is collected in accordance with that party’s privacy policies and may include: date of approval for the financial product, the policy type of product, the finalized value, and whether and what other products may have been bundled with the product you inquired about.
            </p>

            <h3>Use and Disclosure</h3>
            <p>We use and disclose your Personal Information for the following purposes:</p>
            <ul>
              <li><strong>Account Registration:</strong> You may be asked to register for an account to use the Services. If you choose to register for an account you must provide certain Personal Information to us such as your full name, address and email address. Unless disclosure is necessary to provide you other aspects of the Services you request, or as otherwise detailed in this Privacy Policy, none of your account registration information will be disclosed to third-parties.</li>
              <li><strong>Request Forms:</strong> If you request more information about a certain third-party product or service listed on our Website you may be required to input certain Personal Information, such as name, contact information, address, and certain other information depending on the nature of the third party product or service you are interested in. If you submit such a request form, we will send the information contained in the form to the applicable third party offering the product or service. Any Personal Information that we provide to third parties will be treated in accordance with the terms of such third party’s own privacy policies, which you should read.</li>
              <li><strong>Online Tools:</strong> As part of the Services, we may offer tools such as a mortgage calculator, Canada child benefit calculator, RESP calculator, TFSA Room calculator, and credit card finder. If you use these tools, we collect the Personal Information you provide (such as your income, RESP balance, credit score, etc.) in order to provide you with the features and functions of the tools.</li>
              <li><strong>Insurance Quotes:</strong> If you request an insurance quote, we collect either your postal code or province and may automatically redirect you to a third-party website, hosted by one of our insurance provider partners. Except for your location, any information you submit in the insurance quote process will be submitted directly to such third-party provider, and not to us. Your Personal Information will be treated in accordance with the privacy policy of the applicable third-party insurance provider. We may also offer you the ability to obtain an insurance quote directly from Quoteus.ca by providing Personal Information on the Website. We collect this information so that we can obtain an accurate quote from our third-party insurance partners, and to contact you about your quote.</li>
              <li><strong>Auto Insurance:</strong> If you request a quote for auto insurance on the Website, we collect Personal Information related to the driver like date of birth, sex, marital status, job status, driving history, licence class, insurance status, name of current insurer, price of current insurance per month, details regarding any accidents or insurance violations the driver and details about the vehicle include the year, make and model, and number of kilometers driven per year in some case drivers licenses details. Necessarily, we will have to disclose this information to auto insurance companies, brokers, or other parties to get you a quote.</li>
              <li><strong>Home Insurance:</strong> If you request a quote for home insurance, we collect information such as details regarding your property like address, type of property, and mortgages on the property; Personal Information about the occupant such as first and last name, date of birth, job status, years of property insurance, email address, and damage claims history, occupation and rental information); and property construction details like year property was built, type of exterior, number of bathrooms, property’s estimated replacement cost, and square footage.</li>
              <li><strong>Life Insurance:</strong> If you request a quote for life insurance, we collect information such as details regarding the applicant’s coverage needs such as type of coverage, coverage amount, and optional insurance products; and Personal Information about the applicant like first and last name, date of birth, location, sex, smoking habits, email address, and phone number.</li>
              <li><strong>Mortgage Application:</strong> If you complete a mortgage application form on the Website, we collect Personal Information including your first and last name, email address, phone number, province, date of birth, address history, annual income, financial institution, employment status and other employment-related information, and financial assets. We will also obtain your consent to obtain your credit report from a credit reporting agency. We share your credit report and other information provided on your application form with potential mortgage lenders so that they can assess your eligibility for a mortgage, and we may also share information with financial intermediaries and mortgage insurers as necessary to offer and provide services to you. Your credit report may include information such as the types and amounts of credit advanced to you, payment histories, negative banking items, collection actions, legal proceedings, previous bankruptcies and other information reported by your creditors. You will have authorized credit reporting agencies to provide such information to us. If we are unable to obtain your credit report based on your name, date of birth and mailing address alone, we may request you to provide other information, such as your social insurance number, on an optional basis which we will use to help us identify you with a credit reporting agency.</li>
              <li><strong>Credit Reports:</strong> To obtain a free credit report, as detailed in the Terms of Service, you will be required to provide us certain Personal Information for the purpose of the generating the free credit report. The necessary Personal Information includes: your name, email address, date of birth, annual income, phone number, social insurance number, and address. We disclose this Personal Information to our partner Equifax. Equifax may use this Personal Information for their own purposes as detailed in Equifax’s terms of service and privacy policy. We will continue to use this Personal Information to update your credit report from time to time, and accordingly, will also use this Personal Information to provide updated credit reports, which you can find in your account.</li>
              <li><strong>Credit Card Applications:</strong> We may also use and disclose your Personal Information to facilitate your applications for credit cards on our Website. We will collect Personal Information such as: first and last name, email address, phone number, date of birth, address and address history, annual income, employment status and other employment information, financial assets, and social insurance number. We may either collect this information and disclose it to a specific credit card provider, or use the information to assess the best credit card for you and provide the information to the applicable credit card providers.</li>
              <li><strong>Location Information:</strong> Certain third-party products and services are only available in certain areas, and therefore we may ask for your location, either by requesting your postal code, province, city, and/or address or by using Website Information.</li>
              <li><strong>Transactional Notifications:</strong> We provide notifications for certain activities relating to your use of our Services despite your indicated e-mail preferences, for example we may send you notices.</li>
            </ul>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
