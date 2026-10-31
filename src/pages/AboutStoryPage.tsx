import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Mail,
  Phone,
  Sparkles,
  Droplets,
  Award,
  ArrowRight,
  Quote,
  Star,
  CheckCircle2,
  ShieldCheck,
  Compass,
  ShoppingBag
} from 'lucide-react';

export const AboutStoryPage: React.FC = () => {
  const testimonials = [
    {
      name: 'Chef Ananya Sharma',
      role: 'Executive Culinary Director',
      location: 'The Botanical Table, Mumbai',
      comment:
        'Aurra has fundamentally elevated our beverage pairing menus. Aurra Mint Mojito and Aurra Zesty Lime have real cold-pressed citrus bite and botanical spearmint without any artificial aftertaste.',
      rating: 5,
      favorite: 'Aurra Mint Mojito',
    },
    {
      name: 'Vikramaditya Malhotra',
      role: 'Sommelier & Hospitality Consultant',
      location: 'Bengaluru',
      comment:
        'Small-batch micro-carbonation makes a world of difference. Aurra Passionfruit and Aurra Sparkle Cranberry have the effervescence of vintage champagne and the purity of wild fruits. Remarkable craftsmanship.',
      rating: 5,
      favorite: 'Aurra Passionfruit',
    },
    {
      name: 'Priya Sengupta',
      role: 'Wellness Author & Daily Consumer',
      location: 'New Delhi',
      comment:
        'Under 50 calories per bottle, single-estate tea notes in Aurra Peach Iced Tea, and zero corn syrup. Aurra is the only beverage I keep stocked in my refrigerator every week.',
      rating: 5,
      favorite: 'Aurra Peach Iced Tea',
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      
      {/* Aesthetic Gen-Z Banner: Same transparent frosted glassmorphism & lime color combination as The 8 Flavors */}
      <section className="relative overflow-hidden border-b border-lime-300/40 bg-gradient-to-b from-[#f4faf2]/90 via-white/80 to-[#f0f7ef]/60 py-16 sm:py-24 text-slate-900 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900/90 dark:to-lime-950/20 backdrop-blur-md">
        {/* Transparent with Lime, White & Soft Grey Ambient Color Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-lime-300/25 via-emerald-100/15 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 h-96 w-96 rounded-full bg-lime-400/15 blur-3xl pointer-events-none dark:bg-lime-900/15" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-slate-200/40 blur-3xl pointer-events-none dark:bg-slate-800/20" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-slate-800 shadow-xs border border-lime-300/70 dark:bg-slate-900/90 dark:text-slate-200 dark:border-slate-800 mb-4">
            <span className="flex h-2 w-2 rounded-full bg-lime-500 animate-pulse" />
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-lime-900 dark:text-lime-400">
              AURRA BLAST BEVERAGES
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
              OUR VISION &amp; ESTATE
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white text-balance">
            Rooted in Soil. Powered by <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-lime-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Clean Botanical Energy.
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Aurra Blast Beverages was created for the next generation of go-getters: functional sparkling drinks powered by cold-pressed fruits, natural green tea catechins, and effervescent mountain springs. Zero synthetic chemicals, zero sugar crash.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4 text-lime-400 dark:text-lime-600" />
              <span>Explore The 8 Flavors</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-12 space-y-16">
        
        {/* Section 1: Our Vision & Commitments */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Our 3 Guiding Pillars
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Every bottle of Aurra is crafted adhering to stringent culinary standards
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 mb-4">
                <Droplets className="h-5 w-5" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                100% Real Orchard Fruit
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                From Ratnagiri Alphonso mangoes to Nagpur mandarins and Himalayan cranberries, we press fresh fruit pulp into micro-bubbles. Zero high-fructose corn syrups.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mb-4">
                <Sparkles className="h-5 w-5" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Botanical Precision
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Muddled garden spearmint, crushed rosemary stems, and single-estate Darjeeling black tea create nuanced flavor layers that pair beautifully with fine dining.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 mb-4">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Zero Plastic Cans Pledge
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Bottled exclusively in infinitely recyclable flint glass and BPA-free aluminum cans, preserving the crisp effervescent fizz and keeping landfills clean.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Address & Estate Location */}
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 mb-3">
                <MapPin className="h-3.5 w-3.5" />
                <span>Brewery & Tasting Room Estate</span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Aurra Blast Bottling Works & Craft Estate
              </h2>

              <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Nestled along the natural freshwater spring aquifers of the Western Ghats foothills, our estate houses small-batch carbonation tanks, cold-press maceration vats, and our public weekend tasting terrace.
              </p>

              <div className="mt-6 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Estate Address:</strong><br />
                    Plot 42, Spring Valley Foothills, Old Pune-Mumbai Highway,<br />
                    Lonavala, Maharashtra 410401, India
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <strong>Tasting Room Hours:</strong> Thursday – Sunday, 11:00 AM – 7:30 PM
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <strong>Concierge & Orders:</strong> +91 (2114) 278-900
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <strong>Direct Inquiries:</strong> hello@aurrabeverages.com
                  </div>
                </div>
              </div>
            </div>

            {/* Estate Card / Aesthetic Visual Box */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-100 p-6 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-2xl bg-amber-500 text-white font-black text-3xl shadow-md mb-4">
                A
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Aurra Cellar Door</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Join our botanical blending workshops and sample limited test-batch sparkling flavors before retail release.
              </p>
              <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Open for Public Tours & Tastings</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Hardcoded Verified Testimonials */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Praised by Chefs, Sommeliers & Drinkers
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Read how Aurra's signature botanical flavors are redefining craft beverages
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-500 mb-3">
                    {[...Array(t.rating)].map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-current" />
                    ))}
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "{t.comment}"
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{t.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{t.role}</div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                    Go-to Flavor: {t.favorite}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Banner */}
        <section className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-8 sm:p-10 text-center text-white shadow-lg">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Taste Handcrafted Botanical Sparklers Today
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-emerald-100 max-w-md mx-auto">
            From Aurra Sparkle Cranberry to Aurra Passionfruit, order your chilled 330ml cans with express delivery.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-900 transition-all active:scale-95"
            >
              <span>Back to Storefront & Cart</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

      </main>

    </div>
  );
};
