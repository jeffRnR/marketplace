// app/terms/page.tsx

import React from "react";
import Link from "next/link";
import { FileText, Mail, Phone, ChevronRight } from "lucide-react";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-800">
        <span
          className="text-xs font-bold text-purple-400 bg-purple-900/30 border border-purple-700/30
                         px-2.5 py-1 rounded-full shrink-0"
        >
          {number}
        </span>
        <h2 className="text-gray-100 font-bold text-lg sm:text-xl">{title}</h2>
      </div>
      <div className="space-y-3 text-gray-400 leading-relaxed text-sm sm:text-base">
        {children}
      </div>
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <h3 className="text-gray-300 font-semibold text-sm sm:text-base mb-2">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-400 leading-relaxed">{children}</p>;
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-gray-400">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── TOC ──────────────────────────────────────────────────────────────────────

const TOC_ITEMS = [
  { id: "introduction", number: "01", title: "Introduction" },
  { id: "definitions", number: "02", title: "Definitions" },
  { id: "eligibility", number: "03", title: "Eligibility" },
  { id: "account", number: "04", title: "Account Registration & Security" },
  {
    id: "marketplace",
    number: "05",
    title: "Noizy Marketplace — Vendors & Listings",
  },
  { id: "events", number: "06", title: "Events & Ticketing" },
  { id: "payments", number: "07", title: "Payments & Financial Terms" },
  { id: "messaging", number: "08", title: "Messaging & Communications" },
  { id: "prohibited", number: "09", title: "Prohibited Conduct" },
  { id: "cancellations", number: "10", title: "Cancellations & Refunds" },
  { id: "deliveries", number: "11", title: "Deliveries" },
  { id: "ip", number: "12", title: "Intellectual Property" },
  { id: "privacy", number: "13", title: "Privacy & Data Protection" },
  {
    id: "notifications",
    number: "14",
    title: "Notifications & Communications",
  },
  { id: "liability", number: "15", title: "Limitation of Liability" },
  { id: "indemnification", number: "16", title: "Indemnification" },
  {
    id: "termination",
    number: "17",
    title: "Account Suspension & Termination",
  },
  { id: "modifications", number: "18", title: "Modifications to These Terms" },
  {
    id: "governing-law",
    number: "19",
    title: "Governing Law & Dispute Resolution",
  },
  { id: "contact", number: "20", title: "Contact Us" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4">
        {/* ── Header ── */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center gap-2 bg-purple-900/30 border border-purple-700/30
                          text-graty-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
          >
            <FileText className="w-3.5 h-3.5" />
            Legal Document
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-200 mb-3">
            Terms & Conditions
          </h1>
          
            <div className="sm:flex-col gap-2 flex items-center justify-center">
              <div className="flex">
                <p className="text-gray-400 text-sm sm:text-base">
                    Effective Date:{" "}
                    <span className="text-gray-200">March 2026</span>
                    <span className="mx-2 text-gray-700">·</span>
                </p>
              </div>
              < div className="flex">
                <p className="text-gray-400 text-sm sm:text-base">
                    Last Updated: <span className="text-gray-200">March 2026</span>
                </p>
              </div>
            </div>
          <div className="mt-6 bg-purple-900/30 border border-purple-700/30 rounded-2xl p-2 max-w-2xl mx-auto">
            <p className="text-gray-200 text-sm leading-relaxed">
              Please read these Terms carefully before using our platform. By
              accessing or using Noizy Hub, you agree to be bound by these
              Terms.
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* ── Sticky TOC ── */}
          <aside className="lg:sticky lg:top-24 w-full lg:w-64 shrink-0">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
                Contents
              </p>
              <nav className="space-y-0.5 max-h-[60vh] overflow-y-auto pr-1">
                {TOC_ITEMS.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-400
                               hover:text-gray-200 hover:bg-gray-800 transition group"
                  >
                    <span className="text-purple-400 group-hover:text-purple-400 font-mono shrink-0">
                      {item.number}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </a>
                ))}
              </nav>
            </div>

            {/* Download link */}
            <div className="mt-4 bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-gray-400 text-xs mb-2">Need a copy?</p>
              <a
                href="/terms/NoizyHub-Terms-and-Conditions.docx"
                download
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300
                           text-xs font-semibold transition"
              >
                <FileText className="w-3.5 h-3.5" />
                Download .docx
                <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </aside>

          {/* ── Content ── */}
          <main className="flex-1 space-y-10 min-w-0">
            <Section id="introduction" number="01" title="Introduction">
              <P>
                Welcome to Noizy Hub, an online events and marketplace platform
                operated in Kenya. Noizy Hub connects event organisers with
                attendees through seamless event discovery and ticketing, and
                brings together buyers and vendors through Noizy Marketplace — a
                space where vendors can list their services, products, and
                offerings to reach a wider audience. We also facilitate vending
                slot applications at events, enabling vendors to showcase their
                businesses at live events across Kenya.
              </P>
              <P>
                These Terms and Conditions ("Terms") govern your access to and
                use of the Noizy Hub website, mobile application, and all
                related services (collectively, the "Platform"). By registering
                an account or using any part of our Platform, you confirm that
                you have read, understood, and agree to these Terms.
              </P>
              <P>
                If you do not agree with any part of these Terms, you must
                discontinue use of the Platform immediately.
              </P>
            </Section>

            <Section id="definitions" number="02" title="Definitions">
              <P>Key terms used throughout this document:</P>
              <Ul
                items={[
                  '"Platform" means the Noizy Hub website, mobile application, and all associated services.',
                  '"User" means any person who accesses or uses the Platform, whether registered or not.',
                  '"Vendor" or "Seller" means a User who has created a Marketplace Profile to offer goods or services.',
                  '"Buyer" means a User who browses, inquires about, or purchases goods or services through the Platform.',
                  '"Listing" means a product or service posted by a Vendor on Noizy Marketplace.',
                  '"Booking" means a request made by a Buyer to procure a Vendor\'s listed service or product.',
                  '"Event" means any event published on the Platform by an Organiser, including ticketed and free events.',
                  '"Organiser" means a User who creates and manages Events on the Platform.',
                  '"Vending Slot" means a designated space at an Event that Vendors may apply to occupy.',
                  '"Wallet" means the digital wallet on the Platform that holds a Vendor\'s earned balance.',
                  '"M-Pesa" means the mobile money payment service provided by Safaricom PLC.',
                  '"KES" means Kenyan Shillings, the currency used on the Platform.',
                  '"We", "Us", or "Noizy Hub" refers to the operators of this Platform.',
                ]}
              />
            </Section>

            <Section id="eligibility" number="03" title="Eligibility">
              <P>To use the Platform, you must:</P>
              <Ul
                items={[
                  "Be at least 18 years of age, or have the consent of a parent or legal guardian;",
                  "Be capable of entering into a legally binding agreement under Kenyan law;",
                  "Provide accurate, current, and complete information during registration;",
                  "Not be barred from using the Platform under any applicable law.",
                ]}
              />
              <P>
                By using the Platform, you represent and warrant that you meet
                all of the above eligibility requirements. Noizy Hub reserves
                the right to suspend or terminate any account that does not meet
                these requirements.
              </P>
            </Section>

            <Section
              id="account"
              number="04"
              title="Account Registration & Security"
            >
              <P>
                To access most features of the Platform, you must create an
                account. When registering, you agree to:
              </P>
              <Ul
                items={[
                  "Provide truthful and accurate personal information including your name, email address, and phone number;",
                  "Keep your account credentials confidential and not share them with any third party;",
                  "Notify us immediately at noizyhub@gmail.com if you suspect unauthorised access to your account;",
                  "Take full responsibility for all activities that occur under your account.",
                ]}
              />
              <P>
                Noizy Hub reserves the right to refuse registration, suspend, or
                permanently terminate accounts at our sole discretion,
                particularly where we suspect fraud, misrepresentation, or
                violation of these Terms.
              </P>
            </Section>

            <Section
              id="marketplace"
              number="05"
              title="Noizy Marketplace — Vendors & Listings"
            >
              <SubSection title="5.1 Becoming a Vendor on Noizy Marketplace">
                <P>
                  Any registered User may apply to become a Vendor by creating a
                  Marketplace Profile. By creating a profile, you represent
                  that:
                </P>
                <Ul
                  items={[
                    "You are the legitimate owner or authorised seller of the goods or services you list;",
                    "All listed products are genuine, legally obtained, and not counterfeit or stolen;",
                    "Your listings comply with all applicable Kenyan laws, including consumer protection and trade regulations;",
                    "You will honour confirmed bookings and deliver goods or services as described.",
                  ]}
                />
              </SubSection>
              <SubSection title="5.2 Listing Requirements">
                <P>All Listings posted on Noizy Marketplace must:</P>
                <Ul
                  items={[
                    "Accurately describe the product or service, including condition, specifications, and any limitations;",
                    "Display a fair and honest price in Kenyan Shillings (KES);",
                    "Include clear and genuine photographs where applicable;",
                    "Not advertise illegal, counterfeit, dangerous, or prohibited goods;",
                    "Not infringe on any third-party intellectual property rights.",
                  ]}
                />
                <P>
                  Noizy Hub reserves the right to remove any Listing that
                  violates these requirements without notice.
                </P>
              </SubSection>
              <SubSection title="5.3 Bookings & Transactions">
                <P>
                  When a Buyer submits a Booking request to a Vendor, the
                  following process applies:
                </P>
                <Ul
                  items={[
                    "The Vendor reviews the Booking and may Approve or Decline it;",
                    "Upon approval, the Buyer receives a notification and may proceed to payment;",
                    "For M-Pesa payments, the Buyer enters their phone number and authorises the STK Push prompt;",
                    "For offline payments, the Vendor confirms receipt of payment directly;",
                    "Once payment is confirmed, the Booking status is updated to Confirmed.",
                  ]}
                />
                <P>
                  Noizy Hub acts as a technology platform facilitating
                  transactions between Buyers and Vendors. We are not a party to
                  any transaction and are not responsible for the quality,
                  safety, legality, or delivery of any goods or services.
                </P>
              </SubSection>
              <SubSection title="5.4 Platform Fee">
                <P>
                  Noizy Hub charges a platform fee of 5% on all transactions
                  processed through the Platform. This fee is automatically
                  deducted from the Vendor's earnings before crediting the
                  Vendor's Wallet. The remaining 95% is credited to the Vendor's
                  Wallet upon successful payment confirmation.
                </P>
              </SubSection>
              <SubSection title="5.5 Vendor Wallet & Withdrawals">
                <Ul
                  items={[
                    "The minimum withdrawal amount is KES 100;",
                    "Withdrawals are processed via M-Pesa (IntaSend B2C) directly to the Vendor's registered mobile number;",
                    "Withdrawal requests are typically processed within minutes, subject to M-Pesa network availability;",
                    "Noizy Hub is not liable for delays caused by M-Pesa, Safaricom, or IntaSend network issues;",
                    "Vendors are responsible for the accuracy of the phone number provided for withdrawal;",
                    "Noizy Hub encrypts withdrawal phone numbers and does not expose them in API responses.",
                  ]}
                />
              </SubSection>
            </Section>

            <Section id="events" number="06" title="Events & Ticketing">
              <SubSection title="6.1 Event Organisers">
                <P>Users who create Events on the Platform agree to:</P>
                <Ul
                  items={[
                    "Provide accurate, complete, and up-to-date event information including date, time, location, and description;",
                    "Honour tickets purchased by attendees and ensure the event takes place as described;",
                    "Notify Noizy Hub and ticket holders promptly of any cancellations, postponements, or significant changes;",
                    "Comply with all applicable laws regarding public events, safety, and licensing in Kenya.",
                  ]}
                />
              </SubSection>
              <SubSection title="6.2 Ticket Purchases">
                <P>
                  By purchasing a ticket through Noizy Hub, you acknowledge and
                  agree that:
                </P>
                <Ul
                  items={[
                    "Tickets are subject to availability and may have limited validity periods;",
                    "All ticket sales are final unless otherwise stated by the Organiser;",
                    "Noizy Hub does not guarantee refunds for cancelled or postponed events — refund policies are set by individual Organisers;",
                    "You are responsible for attending the event at the correct time and venue;",
                    "Resale of tickets purchased through Noizy Hub is not permitted without prior written consent from the Organiser.",
                  ]}
                />
              </SubSection>
              <SubSection title="6.3 Vending Slots">
                <P>By submitting a Vending Slot application:</P>
                <Ul
                  items={[
                    "You agree to pay the applicable slot fee as specified by the Event Organiser;",
                    "Payment for priority slots is processed via M-Pesa through the Platform;",
                    "Approved applications are binding — cancellation may result in forfeiture of fees paid;",
                    "Noizy Hub does not guarantee that all applications will be approved;",
                    "The Event Organiser has sole discretion to approve or reject applications.",
                  ]}
                />
              </SubSection>
            </Section>

            <Section
              id="payments"
              number="07"
              title="Payments & Financial Terms"
            >
              <P>
                All payments on Noizy Hub are processed in Kenyan Shillings
                (KES) via M-Pesa, facilitated through our payment partner
                IntaSend. By making a payment on the Platform, you agree that:
              </P>
              <Ul
                items={[
                  "You are authorised to use the M-Pesa account or mobile number provided;",
                  "You will complete the STK Push payment authorisation on your mobile device promptly;",
                  "Payment confirmations are final and binding once processed;",
                  "Noizy Hub does not store full M-Pesa credentials — only partial reference details are retained;",
                  "Noizy Hub is not responsible for failed transactions caused by insufficient M-Pesa balance, network outages, or errors by Safaricom or IntaSend;",
                  "In the event of an erroneous charge, you must contact us at noizyhub@gmail.com within 7 days.",
                ]}
              />
              <P>
                All prices displayed on the Platform are inclusive of applicable
                taxes unless stated otherwise.
              </P>
            </Section>

            <Section
              id="messaging"
              number="08"
              title="Messaging & Communications"
            >
              <P>
                Noizy Hub provides an in-platform messaging system enabling
                Buyers to communicate with Vendors regarding Listings and
                Bookings. By using our messaging system, you agree to:
              </P>
              <Ul
                items={[
                  "Use the messaging system only for legitimate transaction-related communications;",
                  "Not send spam, unsolicited promotional content, or harassment to other Users;",
                  "Not conduct transactions outside the Platform to circumvent fees;",
                  "Not share personal financial details such as bank account numbers or passwords via messages;",
                  "Respect the privacy and dignity of other Users at all times.",
                ]}
              />
              <P>
                Noizy Hub retains message records for security, dispute
                resolution, and platform improvement purposes. All messages are
                accessible to both the sender and recipient at any time through
                the Platform.
              </P>
            </Section>

            <Section id="prohibited" number="09" title="Prohibited Conduct">
              <P>You agree not to use the Platform to:</P>
              <Ul
                items={[
                  "Sell counterfeit, stolen, or illegally obtained goods;",
                  "Misrepresent your identity, business, or the goods and services you offer;",
                  "Engage in fraudulent transactions or create fake listings to deceive Buyers;",
                  "Manipulate reviews, ratings, or feedback in any manner;",
                  "Attempt to access another User's account without authorisation;",
                  "Introduce malware, viruses, or any harmful code into the Platform;",
                  "Use automated bots or scraping tools to extract data from the Platform;",
                  "Engage in any activity that disrupts or interferes with the Platform's operation;",
                  "Harass, threaten, or abuse other Users or Noizy Hub staff;",
                  "Violate any applicable Kenyan law or regulation.",
                ]}
              />
              <P>
                Violation of these prohibitions may result in immediate account
                suspension, permanent ban, and/or referral to law enforcement
                authorities.
              </P>
            </Section>

            <Section
              id="cancellations"
              number="10"
              title="Cancellations & Refunds"
            >
              <SubSection title="10.1 Marketplace Bookings">
                <Ul
                  items={[
                    "A Buyer may cancel a Booking before it is approved by the Vendor at no charge;",
                    "Once a Booking is approved and payment has been made, cancellation requests must be directed to the Vendor;",
                    "Refunds for paid Bookings are at the Vendor's sole discretion unless goods or services were not delivered as described;",
                    "In cases of confirmed fraud or significant misrepresentation by a Vendor, Noizy Hub will investigate and may issue a refund at our discretion.",
                  ]}
                />
              </SubSection>
              <SubSection title="10.2 Event Tickets">
                <Ul
                  items={[
                    "Tickets are non-refundable unless the Event is cancelled by the Organiser;",
                    "If an Event is cancelled, the Organiser is responsible for issuing refunds to ticket holders;",
                    "Noizy Hub will assist in facilitating refunds where technically possible but is not ultimately liable for refund processing.",
                  ]}
                />
              </SubSection>
              <SubSection title="10.3 Disputes">
                <P>
                  In the event of a dispute between a Buyer and a Vendor, Noizy
                  Hub encourages parties to resolve the matter through our
                  in-platform messaging system. If resolution cannot be reached,
                  either party may escalate the dispute to Noizy Hub by emailing
                  noizyhub@gmail.com. Our decision is final and binding.
                </P>
              </SubSection>
            </Section>

            <Section id="deliveries" number="11" title="Deliveries">
              <P>
                Noizy Hub offers delivery services for purchases made through
                the Platform. The following terms apply:
              </P>
              <Ul
                items={[
                  "Delivery availability, timelines, and fees are communicated at the time of Booking or checkout;",
                  "Noizy Hub is not responsible for delays caused by circumstances beyond our control, including road conditions, weather, or third-party courier failures;",
                  "The risk of loss or damage to goods transfers to the Buyer upon delivery;",
                  "For damaged or incorrect deliveries, Buyers must notify us within 24 hours of receipt via WhatsApp at 0742 422 990 or email at noizyhub@gmail.com;",
                  "Noizy Hub reserves the right to charge a re-delivery fee where delivery fails due to incorrect address information provided by the Buyer.",
                ]}
              />
            </Section>

            <Section id="ip" number="12" title="Intellectual Property">
              <P>
                All intellectual property rights in and to the Noizy Hub
                Platform, including but not limited to the name, logo, design,
                software, content, and trademarks, are owned by or licensed to
                Noizy Hub. You are granted a limited, non-exclusive,
                non-transferable licence to access and use the Platform for
                personal or business purposes in accordance with these Terms.
              </P>
              <P>
                By uploading content to the Platform (including product images,
                descriptions, and profile information), you grant Noizy Hub a
                worldwide, royalty-free licence to use, display, and distribute
                such content for the purpose of operating and promoting the
                Platform.
              </P>
              <P>
                You must not copy, reproduce, redistribute, or create derivative
                works of any Noizy Hub content without our prior written
                consent.
              </P>
            </Section>

            <Section id="privacy" number="13" title="Privacy & Data Protection">
              <P>
                Noizy Hub collects personal data including your name, email
                address, phone number, and payment-related information in order
                to provide our services. We are committed to protecting your
                privacy in accordance with Kenya's Data Protection Act, 2019.
              </P>
              <Ul
                items={[
                  "We collect only data necessary to operate the Platform and process transactions;",
                  "Your phone number used for M-Pesa withdrawals is encrypted before storage;",
                  "We do not sell your personal data to third parties;",
                  "We may share data with payment processors (IntaSend, Safaricom) solely for transaction processing;",
                  "You may request access to, correction of, or deletion of your personal data by contacting noizyhub@gmail.com;",
                  "We use cookies and analytics tools to improve Platform performance — by using the Platform, you consent to this use.",
                ]}
              />
            </Section>

            <Section
              id="notifications"
              number="14"
              title="Notifications & Communications"
            >
              <P>By registering on Noizy Hub, you consent to receiving:</P>
              <Ul
                items={[
                  "In-app notifications regarding your account activity, bookings, messages, and transactions;",
                  "Email notifications for booking confirmations, approvals, rejections, and payment receipts;",
                  "Promotional communications about Noizy Hub offers and updates (you may opt out at any time).",
                ]}
              />
              <P>
                Transactional notifications such as payment confirmations cannot
                be disabled as they are essential to the operation of the
                service.
              </P>
            </Section>

            <Section id="liability" number="15" title="Limitation of Liability">
              <P>
                To the fullest extent permitted by applicable Kenyan law, Noizy
                Hub shall not be liable for:
              </P>
              <Ul
                items={[
                  "Any direct, indirect, incidental, special, or consequential damages arising from your use of the Platform;",
                  "The quality, safety, accuracy, or legality of any goods or services listed by Vendors;",
                  "Losses arising from failed or delayed M-Pesa transactions;",
                  "Losses arising from events outside our reasonable control (force majeure);",
                  "Any content posted by Users that is inaccurate, offensive, or misleading;",
                  "Unauthorised access to your account resulting from your failure to maintain account security.",
                ]}
              />
              <P>
                Noizy Hub's total aggregate liability to you for any claim shall
                not exceed the total amount you paid to Noizy Hub in the three
                (3) months preceding the event giving rise to the claim.
              </P>
            </Section>

            <Section id="indemnification" number="16" title="Indemnification">
              <P>
                You agree to indemnify, defend, and hold harmless Noizy Hub, its
                officers, employees, agents, and partners from and against any
                claims, liabilities, damages, losses, and expenses (including
                legal fees) arising out of or in connection with:
              </P>
              <Ul
                items={[
                  "Your use of the Platform in violation of these Terms;",
                  "Any content you submit, post, or transmit through the Platform;",
                  "Your violation of any applicable law or regulation;",
                  "Your infringement of any third-party rights, including intellectual property rights.",
                ]}
              />
            </Section>

            <Section
              id="termination"
              number="17"
              title="Account Suspension & Termination"
            >
              <P>
                Noizy Hub reserves the right to suspend or permanently terminate
                your account at any time, with or without notice, for reasons
                including but not limited to:
              </P>
              <Ul
                items={[
                  "Breach of these Terms;",
                  "Fraudulent, deceptive, or illegal activity;",
                  "Persistent negative reviews or unresolved complaints from other Users;",
                  "Inactivity for an extended period.",
                ]}
              />
              <P>
                Upon termination, your right to access the Platform ceases
                immediately. Any outstanding Wallet balance will be processed
                for withdrawal subject to verification.
              </P>
              <P>
                You may delete your account at any time by contacting us at
                noizyhub@gmail.com. Deletion does not affect obligations arising
                from transactions completed prior to deletion.
              </P>
            </Section>

            <Section
              id="modifications"
              number="18"
              title="Modifications to These Terms"
            >
              <P>
                Noizy Hub reserves the right to update or modify these Terms at
                any time. We will notify you of material changes by posting the
                updated Terms on the Platform and, where appropriate, by sending
                a notification to your registered email address. Your continued
                use of the Platform after such notification constitutes your
                acceptance of the revised Terms.
              </P>
              <P>
                We encourage you to review these Terms periodically to stay
                informed of any updates.
              </P>
            </Section>

            <Section
              id="governing-law"
              number="19"
              title="Governing Law & Dispute Resolution"
            >
              <P>
                These Terms shall be governed by and construed in accordance
                with the laws of the Republic of Kenya. Any dispute arising out
                of or in connection with these Terms shall first be subject to
                good-faith negotiation between the parties. If resolution cannot
                be reached, the dispute shall be referred to mediation or,
                failing that, to the courts of Kenya.
              </P>
            </Section>

            <Section id="contact" number="20" title="Contact Us">
              <P>
                If you have any questions, concerns, or complaints regarding
                these Terms or the Platform, please contact us:
              </P>
              <div className="mt-4 bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
                <p className="text-gray-100 font-bold text-lg">
                  Noizy Hub Kenya
                </p>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                  <a
                    href="mailto:noizyhub@gmail.com"
                    className="text-purple-400 hover:text-purple-300 transition"
                  >
                    noizyhub@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-purple-400 shrink-0" />
                  <a
                    href="tel:+254742422990"
                    className="text-gray-300 hover:text-gray-100 transition"
                  >
                    0742 422 990 (Call / WhatsApp)
                  </a>
                </div>
              </div>
            </Section>

            {/* Closing note */}
            <div className="border-t border-gray-800 pt-8 text-center space-y-2">
              <p className="text-gray-500 text-sm italic">
                By using the Noizy Hub Platform, you acknowledge that you have
                read, understood, and agree to be bound by these Terms and
                Conditions.
              </p>
              <p className="text-gray-600 text-xs">
                © 2026 Noizy Hub Kenya. All Rights Reserved.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
