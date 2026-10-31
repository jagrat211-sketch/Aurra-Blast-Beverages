import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, ArrowLeft, Lock, HelpCircle, CheckCircle2, ChevronRight } from 'lucide-react';

export const TermsAndPrivacyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

  return (
    <div className="min-h-screen py-10 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Storefront</span>
        </Link>

        {/* Page Header */}
        <div className="rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-emerald-500/10 p-6 sm:p-10 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950 backdrop-blur-md mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-400/20 dark:text-amber-300 mb-3 border border-amber-400/30">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Aurra Beverages Legal & Transparency</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Terms of Service & Privacy Policy
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
            We value your trust, integrity, and privacy. Read how Aurra Beverages protects your personal data, handles secure UPI payments, and defines our customer guarantees.
          </p>

          {/* Quick Tab Switcher */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === 'terms'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Terms & Conditions</span>
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === 'privacy'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              <Lock className="h-4 w-4" />
              <span>Privacy Policy</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Terms & Conditions */}
        {activeTab === 'terms' && (
          <div className="space-y-8 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                Terms and Conditions
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">Effective: 2026 Edition</span>
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-amber-600 dark:text-amber-400">
                1. Acceptance of Agreement
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                By browsing, accessing, or placing orders on Aurra Beverages (&quot;Aurra&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms and Conditions. These terms govern the purchase of artisan sparkling drinks and all associated digital services.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-amber-600 dark:text-amber-400">
                2. Products, Formulations & Pricing
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                All prices on Aurra Beverages are displayed in Indian Rupees (INR) and are inclusive of applicable GST taxes. We offer natural sparkling botanical drinks crafted with cold-pressed real fruits and mineral-rich mountain water. Nutritional highlights, volume (330ml / 355ml), and calorie counts are specified on each can snapshot.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-amber-600 dark:text-amber-400">
                3. Orders, UPI Payments & Verification
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Orders are processed through our integrated UPI gateway supporting both instant UPI ID / VPA verification and dynamic QR code scanning. You agree to provide accurate delivery and contact details. Aurra does not store banking credentials or UPI PIN numbers. All successful transactions are logged with an immutable snapshot of products and pricing.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-amber-600 dark:text-amber-400">
                4. Shipping, Express Delivery & Tracking
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                We deliver to serviceable PIN codes across India. Standard orders are packed in climate-regulated shock-absorbing cartons to prevent carbonation degradation. Orders over ₹499 qualify for free shipping. You can track your active and past shipments in the &quot;My Orders&quot; section after logging in.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-amber-600 dark:text-amber-400">
                5. Quality Guarantee, Cancellations & Refunds
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                If a can arrives damaged, leaked, or fails our freshness criteria, report it within 48 hours with a photo. We will immediately issue a replacement or initiate a refund directly back to your original source UPI account within 3–5 business days.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-amber-600 dark:text-amber-400">
                6. Governing Law & Dispute Resolution
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                These terms shall be governed by and construed in accordance with the laws of India, including the Information Technology Act, 2000 and Consumer Protection Act, 2019. Any disputes shall be subject to the exclusive jurisdiction of the competent courts in India.
              </p>
            </section>
          </div>
        )}

        {/* Tab 2: Privacy Policy */}
        {activeTab === 'privacy' && (
          <div className="space-y-8 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-500" />
                Privacy Policy
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">Updated: 2026 Standards</span>
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                1. Information We Collect
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                We collect only the essential information necessary to deliver authentic sparkling beverages to your doorstep:
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
                <li><strong className="text-slate-900 dark:text-white">Account Details:</strong> Your name, email address, password hash (encrypted via bcrypt), and verification status.</li>
                <li><strong className="text-slate-900 dark:text-white">Order History:</strong> Quantities, flavors purchased, delivery billing snapshots, and date records.</li>
                <li><strong className="text-slate-900 dark:text-white">Technical Preferences:</strong> Light/dark theme selection, shopping bag session state, and device telemetry.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                2. UPI & Financial Security
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Your financial security is our highest priority. Aurra uses encrypted UPI interfaces (VPA and dynamic QR codes). We do not store, process, or transmit your credit/debit card numbers or your confidential UPI MPIN. All authorization takes place directly within your verified banking app (GPay, PhonePe, Paytm, BHIM, Cred, etc.).
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                3. How We Use Your Information
              </h3>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
                <li>Fulfilling, shipping, and dispatching your beverage orders with real-time tracking.</li>
                <li>Authenticating user sessions and safeguarding your account against unauthorized logins.</li>
                <li>Providing customer support regarding shipments, flavor requests, or invoices.</li>
                <li>We do not sell, rent, or trade your personal data to any third-party marketing brokers.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                4. Cookies & Session Storage
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                We use secure, HTTP-only authentication cookies and local storage to keep your session logged in and remember items in your shopping cart across browser reloads.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                5. User Rights & Data Deletion
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                You have the right to access, edit your profile details, review your order history, or request full account deletion by contacting our privacy desk at <span className="font-semibold text-slate-900 dark:text-white">privacy@aurrabev.com</span>.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                6. Contact & Grievance Redressal
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                For any inquiries regarding our Terms or Privacy Policy, please reach out to:
              </p>
              <div className="rounded-2xl bg-slate-50 p-4 text-xs dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white">Aurra Blast Beverages Grievance Cell</p>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Estate Grounds & Bottling Reserve, Pune-Bengaluru Highway, India</p>
                <p className="text-amber-600 dark:text-amber-400 mt-1 font-semibold">care@aurrabev.com · support@aurrabev.com</p>
              </div>
            </section>
          </div>
        )}

        {/* Footer switch prompt */}
        <div className="mt-8 flex items-center justify-between rounded-2xl bg-amber-50/70 p-4 text-xs dark:bg-slate-800/40 border border-amber-200/50 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Viewing {activeTab === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
            </span>
          </div>
          <button
            onClick={() => setActiveTab(activeTab === 'terms' ? 'privacy' : 'terms')}
            className="font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1"
          >
            <span>Switch to {activeTab === 'terms' ? 'Privacy Policy' : 'Terms & Conditions'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
