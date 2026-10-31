import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Heart,
  Camera,
  ArrowRight,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Sun,
  Award,
  Zap,
  Clock,
  Droplets,
  Flame,
  CheckCircle2,
  ShoppingBag
} from 'lucide-react';

interface GalleryPhoto {
  id: string;
  src: string;
  title: string;
  subtitle: string;
  tag: string;
  category: 'Candid' | 'Artistry' | 'Nature' | 'Lifestyle';
}

interface FlavorRowData {
  id: string;
  number: number;
  name: string;
  tagline: string;
  desc: string;
  notes: string;
  calories: string;
  volume: string;
  pairingQuote: string;
  accentBg: string;
  borderColor: string;
  tagColor: string;
  photo: GalleryPhoto;
}

// All available real photo assets of Aurra Bhatnagar Badoni
const ALL_GALLERY_PHOTOS: GalleryPhoto[] = [
  {
    id: 'p-01',
    src: '/assets/aistudio/From_my_lens_to_yours____ae127eb8.jpg',
    title: 'From my lens to yours 🤍✨',
    subtitle: 'Effortless candid warmth, dimpled smile, and radiant positivity.',
    tag: 'Golden AURRA',
    category: 'Candid',
  },
  {
    id: 'p-02',
    src: '/assets/aistudio/image_353be4c5.png',
    title: "Nature's Blossom & Gentle Smile",
    subtitle: 'Framed by bougainvillea blossoms, gentle grace in full natural bloom.',
    tag: 'Botanical Grace',
    category: 'Nature',
  },
  {
    id: 'p-03',
    src: '/assets/aistudio/image_1b452295.png',
    title: 'Kinetic Energy & Free Motion',
    subtitle: 'Dynamic street dance candid in sporty pink jacket and free spirit.',
    tag: 'Pure Vitality',
    category: 'Lifestyle',
  },
  {
    id: 'p-04',
    src: '/assets/aistudio/Recents______aurrabhatnagarbadoni__fyp__insta__instagram__reel__post_f72671bb.jpg',
    title: 'Recents 🩶🐺✨ — Iconic Poise',
    subtitle: 'Golden hour elegance, halter silhouette, and timeless artistic poise.',
    tag: 'The Golden Glow',
    category: 'Artistry',
  },
  {
    id: 'p-05',
    src: '/assets/aistudio/image_cd8905d7.png',
    title: 'Mountain Waterfalls & Hiking Trails',
    subtitle: 'Cascading rapids, lush monsoon foliage, and fearless outdoor adventure.',
    tag: 'Raw Wilderness',
    category: 'Nature',
  },
  {
    id: 'p-06',
    src: '/assets/aistudio/unseen_bits_____2__92339c49.jpg',
    title: 'unseen bits 📸✨ (2) — Summer Joy',
    subtitle: 'Seated candid laughter in a floral dress under soft morning light.',
    tag: 'Garden Serenity',
    category: 'Candid',
  },
  {
    id: 'p-07',
    src: '/assets/aistudio/shielding_sun_in_style____adoring_my_hot_chocolate_____posing____again____again_.__oh_god__6c95e13c.jpg',
    title: 'Shielding sun in style 😎✨🌞',
    subtitle: 'Adoring cozy drinks, playful poses, and infectious youthful laughter.',
    tag: 'Sunlit Radiance',
    category: 'Lifestyle',
  },
  {
    id: 'p-08',
    src: '/assets/aistudio/unseen_bits_____1__077035da.jpg',
    title: 'unseen bits 📸✨ (1) — Natural Poise',
    subtitle: 'Standing floral portrait celebrating authentic poise and quiet strength.',
    tag: 'Summer Breeze',
    category: 'Artistry',
  },
  {
    id: 'p-09',
    src: '/assets/aistudio/unseen_bits____0136fe0e.jpg',
    title: 'unseen bits 📸✨ — Morning Glow',
    subtitle: 'Soft window sunlight and effortless contemporary simplicity.',
    tag: 'Sunlit Peace',
    category: 'Candid',
  },
  {
    id: 'p-10',
    src: '/assets/aistudio/_____________lovealchemi_734c592a.jpg',
    title: 'सुकून ✒️📜✨🎥 @lovealchemi',
    subtitle: 'Vintage retro frames, poetic stillness, and contemplative artistic depth.',
    tag: 'Sukoon & Soul',
    category: 'Artistry',
  },
  {
    id: 'p-11',
    src: '/assets/aistudio/as_of_late_________2__1bd3b741.jpg',
    title: 'as of late 📓♠️♟️✨ (2) — Subtle Smile',
    subtitle: 'Understated elegance, gentle eyes, and timeless quiet confidence.',
    tag: 'Quiet Confidence',
    category: 'Candid',
  },
  {
    id: 'p-12',
    src: '/assets/aistudio/as_of_late_________4__bd71a1da.jpg',
    title: 'as of late 📓♠️♟️✨ (4) — Midnight Poise',
    subtitle: 'Intricate evening embroidery, deep artistic focus, and bold presence.',
    tag: 'Velvet Midnight',
    category: 'Artistry',
  },
  {
    id: 'p-13',
    src: '/assets/aistudio/as_of_late_________3__ea734af6.jpg',
    title: 'as of late 📓♠️♟️✨ (3) — Wind-Swept',
    subtitle: 'Wind-kissed hair and serene over-the-shoulder gaze.',
    tag: 'Wind-Kissed',
    category: 'Artistry',
  },
  {
    id: 'p-14',
    src: '/assets/aistudio/as_of_late_________1__91795172.jpg',
    title: 'as of late 📓♠️♟️✨ (1) — Modern Edge',
    subtitle: 'Bold urban street posture and fearless modern presence.',
    tag: 'Modern Edge',
    category: 'Lifestyle',
  },
  {
    id: 'p-15',
    src: '/assets/aistudio/as_of_late________b63b2c6c.jpg',
    title: 'as of late 📓♠️♟️✨ (5) — Dramatic Silhouette',
    subtitle: 'Cinematic movement, back detail, and sculptural dramatic silhouette.',
    tag: 'Cinematic Flow',
    category: 'Artistry',
  },
  {
    id: 'p-16',
    src: '/assets/aistudio/_____________0e9f47cc.jpg',
    title: 'Dining & Sparkling Sips ❤️✨',
    subtitle: 'Celebratory evening dining with refreshing sparkling beverages in hand.',
    tag: 'Celebration Sips',
    category: 'Lifestyle',
  },
];

// The 8 Signature Flavors mapped to user photos and narrative notes
const FLAVORS_DATA: FlavorRowData[] = [
  {
    id: 'flavor-1',
    number: 1,
    name: 'Aurra Sparkle Cranberry',
    tagline: 'Crisp Wild Cranberries & Himalayan Mountain Springs',
    desc: 'Tart ruby cranberry pulp infused with cold-pressed rosehips and effervescent bubbles. A crisp burst of natural antioxidants that mirrors the brisk, unbridled rush of alpine waterfalls.',
    notes: 'Wild Mountain Cranberry · Champagne Effervescence · Vitamin C Boost',
    calories: '42 kcal',
    volume: '330 ml',
    pairingQuote: 'Inspired by fearless mountain trails and refreshing alpine rapids.',
    accentBg: 'from-rose-50/70 via-white to-red-50/40 dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-950',
    borderColor: 'border-rose-200/80 dark:border-rose-900/40',
    tagColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300',
    photo: ALL_GALLERY_PHOTOS[4], // Waterfall hiking trail
  },
  {
    id: 'flavor-2',
    number: 2,
    name: 'Aurra Mint Mojito',
    tagline: 'Fresh Garden Spearmint & Sun-Kissed Lime Zest',
    desc: 'Slow-steeped crushed garden mint leaves with tart Persian lime and delicate mineral fizz. Zero synthetic syrups — just the uplifting green purity of a breezy summer morning garden.',
    notes: 'Fresh Spearmint · Persian Lime Zest · Natural Green Tea Extract',
    calories: '38 kcal',
    volume: '330 ml',
    pairingQuote: 'Captures the buoyant, laughter-filled joy of a sunlit garden morning.',
    accentBg: 'from-emerald-50/70 via-white to-teal-50/40 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-950',
    borderColor: 'border-emerald-200/80 dark:border-emerald-900/40',
    tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
    photo: ALL_GALLERY_PHOTOS[5], // Unseen bits floral dress candid
  },
  {
    id: 'flavor-3',
    number: 3,
    name: 'Aurra Zesty Lime',
    tagline: 'Citrus Sparkle & Pink Himalayan Sea Salt Minerals',
    desc: 'Sun-drenched cold-pressed limes kissed with crystalline mineral salt. Engineered to replenish natural electrolytes while keeping you energized with crisp, zero-sugar brightness.',
    notes: 'Persian Citrus · Himalayan Pink Salt · Clean Mineral Hydration',
    calories: '32 kcal',
    volume: '330 ml',
    pairingQuote: 'Sunlit style, playful spontaneity, and an unshakeable inner glow.',
    accentBg: 'from-lime-50/70 via-white to-green-50/40 dark:from-lime-950/20 dark:via-slate-900 dark:to-slate-950',
    borderColor: 'border-lime-200/80 dark:border-lime-900/40',
    tagColor: 'bg-lime-100 text-lime-800 dark:bg-lime-950/80 dark:text-lime-300',
    photo: ALL_GALLERY_PHOTOS[6], // Shielding sun in style
  },
  {
    id: 'flavor-4',
    number: 4,
    name: 'Aurra Mango Rush',
    tagline: 'Ratnagiri Alphonso Mango & Sunlit Citrus Nectar',
    desc: 'Pure velvety Alphonso mango puree aerated with micro-carbonation. Rich, golden, and radiant with authentic tropical sweetness without a single drop of added corn syrup.',
    notes: 'Ratnagiri Alphonso · Golden Nectar · Silky Effervescence',
    calories: '54 kcal',
    volume: '330 ml',
    pairingQuote: 'Warm, golden, and authentically poised under summer skies.',
    accentBg: 'from-amber-50/70 via-white to-yellow-50/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-950',
    borderColor: 'border-amber-200/80 dark:border-amber-900/40',
    tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300',
    photo: ALL_GALLERY_PHOTOS[7], // Standing floral portrait
  },
  {
    id: 'flavor-5',
    number: 5,
    name: 'Aurra Fizz Orange',
    tagline: 'Nagpur Mandarin & Sun-Ripened Valencia Orange',
    desc: 'A vivid, revitalizing blend of freshly juiced Indian mandarins and Valencia citrus. Crisp natural vitamin C clarity that sparkles with genuine sunshine in every single sip.',
    notes: 'Nagpur Mandarin · Valencia Orange Peel · Pure Vitamin C Clarity',
    calories: '48 kcal',
    volume: '330 ml',
    pairingQuote: 'Soft morning light, gentle warmth, and pure daily optimism.',
    accentBg: 'from-orange-50/70 via-white to-amber-50/40 dark:from-orange-950/20 dark:via-slate-900 dark:to-slate-950',
    borderColor: 'border-orange-200/80 dark:border-orange-900/40',
    tagColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300',
    photo: ALL_GALLERY_PHOTOS[8], // Soft window sunlight
  },
  {
    id: 'flavor-6',
    number: 6,
    name: 'Aurra Peach Iced Tea',
    tagline: 'Highland Darjeeling Black Tea & Ripe Golden Peach',
    desc: 'Cold-brewed whole Darjeeling tea leaves steeped gently with aromatic peach blossom nectar. Poetic, calming, and deeply refreshing — a sip of true Sukoon for the soul.',
    notes: 'Darjeeling Black Tea · White Peach Nectar · Antioxidant Tannins',
    calories: '40 kcal',
    volume: '355 ml',
    pairingQuote: 'Sukoon: Patient dedication to the craft, stillness, and poetic depth.',
    accentBg: 'from-amber-50/70 via-white to-stone-50/60 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-950',
    borderColor: 'border-amber-200/80 dark:border-amber-900/40',
    tagColor: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300',
    photo: ALL_GALLERY_PHOTOS[9], // Sukoon retro lovealchemi
  },
  {
    id: 'flavor-7',
    number: 7,
    name: 'Aurra Passionfruit',
    tagline: 'Tropical Golden Passionfruit & Wild Citrus Blossom',
    desc: 'Exotic golden passionfruit pulp balanced with delicate citrus blossoms and crisp mineral sparkle. A vibrant sensory journey celebrating individuality, quiet confidence, and flair.',
    notes: 'Golden Passionfruit · Citrus Flower Extract · Micro-Bubbles',
    calories: '44 kcal',
    volume: '330 ml',
    pairingQuote: 'Understated elegance, authentic confidence, and radiant charm.',
    accentBg: 'from-yellow-50/70 via-white to-amber-50/40 dark:from-yellow-950/20 dark:via-slate-900 dark:to-slate-950',
    borderColor: 'border-yellow-200/80 dark:border-yellow-900/40',
    tagColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300',
    photo: ALL_GALLERY_PHOTOS[10], // as of late subtle smile
  },
  {
    id: 'flavor-8',
    number: 8,
    name: 'Aurra Berry Blast',
    tagline: 'Wild Blackberry, Blueberry & Amazonian Acai',
    desc: 'Anthocyanin-dense dark berry melange cold-pressed to perfection. Deep purple vibrancy, rich tartness, and zero taurine jitters — designed for artists and achievers stepping onto the grand stage.',
    notes: 'Wild Blackberry · Blueberries · Amazonian Acai · Royal Tartness',
    calories: '46 kcal',
    volume: '330 ml',
    pairingQuote: 'Midnight elegance, fearless performance, and unstoppable focus.',
    accentBg: 'from-purple-50/70 via-white to-indigo-50/40 dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-950',
    borderColor: 'border-purple-200/80 dark:border-purple-900/40',
    tagColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300',
    photo: ALL_GALLERY_PHOTOS[11], // as of late midnight poise
  },
];

// High-Performance Virtualized Row Component
// Uses IntersectionObserver to smoothly mount heavy DOM/image elements when scrolled into proximity,
// maintaining calculated height and smooth 60fps scrolling.
interface VirtualizedRowProps {
  flavor: FlavorRowData;
  index: number;
  isImageLeft: boolean;
  onOpenPhoto: (photo: GalleryPhoto) => void;
}

const VirtualizedFlavorRow: React.FC<VirtualizedRowProps> = ({
  flavor,
  index,
  isImageLeft,
  onOpenPhoto,
}) => {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      {
        rootMargin: '250px 0px', // Preload smoothly before entering viewport
        threshold: 0.05,
      }
    );

    if (rowRef.current) {
      observer.observe(rowRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rowRef}
      className={`min-h-[440px] rounded-3xl border ${flavor.borderColor} bg-gradient-to-br ${flavor.accentBg} p-6 sm:p-8 lg:p-10 shadow-sm transition-all duration-300 hover:shadow-md`}
    >
      {!isVisible ? (
        // Lightweight skeleton during virtualization off-screen
        <div className="flex h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Alternating Layout: Order changes based on isImageLeft */}
          
          {/* TEXT BLOCK */}
          <div
            className={`space-y-5 ${
              isImageLeft ? 'lg:col-span-6 lg:order-2' : 'lg:col-span-6 lg:order-1'
            }`}
          >
            {/* Flavor Number & Calories Badge */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black uppercase tracking-wider text-white dark:bg-white dark:text-slate-900">
                Signature #{flavor.number}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${flavor.tagColor}`}>
                {flavor.calories} · {flavor.volume}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Cold-Pressed
              </span>
            </div>

            {/* Flavor Title */}
            <div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {flavor.name}
              </h3>
              <p className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-400">
                {flavor.tagline}
              </p>
            </div>

            {/* Narrative Description */}
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
              {flavor.desc}
            </p>

            {/* Tasting Notes Strip */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/80">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Botanical Profile
              </div>
              <div className="mt-1 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {flavor.notes}
              </div>
            </div>

            {/* Quote / Inspiration pairing */}
            <div className="flex items-start gap-2.5 text-xs italic text-slate-500 dark:text-slate-400">
              <Heart className="h-4 w-4 shrink-0 text-amber-500 fill-amber-400 mt-0.5" />
              <span>&ldquo;{flavor.pairingQuote}&rdquo;</span>
            </div>

            {/* CTA: Order / Buy Link */}
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4 text-amber-400 dark:text-amber-600" />
                <span>Order {flavor.name}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* IMAGE BLOCK */}
          <div
            className={`relative ${
              isImageLeft ? 'lg:col-span-6 lg:order-1' : 'lg:col-span-6 lg:order-2'
            }`}
          >
            <div
              onClick={() => onOpenPhoto(flavor.photo)}
              className="group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-white/90 bg-white p-3 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Uniform Frame with object-contain so full image fits completely without cropping */}
              <div className="relative h-72 sm:h-80 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-stone-100 via-stone-50 to-stone-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-2">
                {/* Soft ambient backdrop to fill margins smoothly */}
                <img
                  src={flavor.photo.src}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-25 dark:opacity-30 scale-125 pointer-events-none"
                />

                {/* Full Uncut Photo */}
                <img
                  src={flavor.photo.src}
                  alt={flavor.photo.title}
                  loading="lazy"
                  className="relative z-10 max-h-full max-w-full w-auto h-auto object-contain rounded-xl shadow-xs transition-transform duration-500 group-hover:scale-[1.02]"
                />

                {/* Floating Click to Enlarge Badge on top of image */}
                <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-md transition-all duration-200 group-hover:bg-slate-900 dark:bg-white/90 dark:text-slate-900">
                  <Maximize2 className="h-3 w-3 text-amber-400 dark:text-amber-600" />
                  <span>Click to Enlarge</span>
                </div>
              </div>

              {/* Bottom Caption strip outside the image area so it never covers the photo */}
              <div className="mt-2.5 px-1 py-0.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    {flavor.photo.tag}
                  </span>
                  <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {flavor.photo.title}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  <Maximize2 className="h-3 w-3" />
                  <span>Full View</span>
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export const AurraTributePage: React.FC = () => {
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPhoto) return;
      if (e.key === 'Escape') setSelectedPhoto(null);
      
      const currentIndex = ALL_GALLERY_PHOTOS.findIndex((p) => p.id === selectedPhoto.id);
      if (e.key === 'ArrowRight' && currentIndex !== -1) {
        const next = ALL_GALLERY_PHOTOS[(currentIndex + 1) % ALL_GALLERY_PHOTOS.length];
        setSelectedPhoto(next);
      }
      if (e.key === 'ArrowLeft' && currentIndex !== -1) {
        const prev =
          ALL_GALLERY_PHOTOS[(currentIndex - 1 + ALL_GALLERY_PHOTOS.length) % ALL_GALLERY_PHOTOS.length];
        setSelectedPhoto(prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto]);

  // Top 3 Header Images side-by-side as shown in user's Wireframe
  const topThreePhotos = [
    ALL_GALLERY_PHOTOS[0], // From my lens to yours
    ALL_GALLERY_PHOTOS[1], // Nature's Blossom bougainvillea
    ALL_GALLERY_PHOTOS[2], // Kinetic energy sporty pink candid
  ];

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors pb-24">
      
      {/* ========================================================
          HERO & SECTION 1 (WIREFRAME EXACT):
          Top 3 Images Side-by-Side -> "Who is Aurra?" Content Box
          ======================================================== */}
      <section className="relative overflow-hidden border-b border-lime-100/70 bg-gradient-to-b from-lime-50/50 via-white to-stone-50/60 pt-12 pb-16 dark:border-slate-800 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950">
        
        {/* Soft Ambient Radial Accents */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-lime-200/40 via-amber-100/30 to-emerald-200/30 blur-3xl dark:from-lime-950/20 dark:via-amber-950/15 dark:to-emerald-950/20" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Page Tag Eyebrow */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-white/90 px-4 py-1.5 shadow-2xs backdrop-blur-md dark:border-amber-500/30 dark:bg-slate-900/80">
              <Sparkles className="h-4 w-4 text-amber-500 fill-amber-400 animate-pulse" />
              <span className="text-xs font-black tracking-wider uppercase text-amber-800 dark:text-amber-300">
                Official Brand Tribute To Our Real Inspiration : AURRA
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              The Muse Behind{' '}
              <span className="bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Aurra Blast
              </span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium">
              A heartfelt tribute to <span className="font-bold text-slate-900 dark:text-white">Aurra Bhatnagar Badoni</span>, whose authentic grace, artistic dedication, and radiant spirit inspire every single drop we craft.
            </p>
          </div>

          {/* WIREFRAME ROW 1: 3 Images Side-by-Side [IMG] [IMG] [IMG] */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-6 max-w-5xl mx-auto">
            {topThreePhotos.map((photo, i) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-white/90 bg-white p-2 shadow-md shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <img
                    src={photo.src}
                    alt={photo.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-70 group-hover:opacity-85 transition-opacity" />
                  
                  {/* Floating Tag */}
                  <div className="absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-900 shadow-xs backdrop-blur-md dark:bg-slate-900/90 dark:text-white">
                    {photo.tag}
                  </div>

                  {/* Zoom Icon */}
                  <div className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-md text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity dark:bg-slate-900/80 dark:text-white">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </div>

                  {/* Caption */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                    <p className="text-xs font-bold leading-tight line-clamp-1">{photo.title}</p>
                    <p className="text-[10px] text-slate-200/90 truncate">{photo.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* WIREFRAME: Directly Underneath 3 Images -> "Who is Aurra?" Content Box */}
          <div className="mt-10 max-w-5xl mx-auto rounded-3xl border border-amber-200/80 bg-white/90 p-7 sm:p-10 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3">
              <Sparkles className="h-4 w-4" />
              <span>Section 1: The Inspiration &amp; Introduction</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              The Muse Behind the Brand: Who is Aurra?
            </h2>

            <div className="mt-5 space-y-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                <strong className="text-slate-900 dark:text-white font-bold">Aurra Bhatnagar Badoni</strong> is a remarkably talented, hardworking, and dedicated young artist and actress whose natural grace and vibrant energy have captured millions of hearts across screens and beyond.
              </p>
              <p>
                Renowned for bringing emotionally profound characters to life with exceptional nuance, poise, and sincerity, Aurra embodies the very spirit of youthful passion, relentless perseverance, and joyful authenticity. Whether mastering complex dramatic performances or bringing pure, unscripted laughter to set, her humility and infectious positivity light up every environment she graces.
              </p>
              <p>
                <strong className="text-amber-600 dark:text-amber-400 font-bold">Aurra Blast Beverages</strong> was born as an homage to this exact radiant aura — an ode to living life with vibrant effervescence, unmatched purity, and natural brilliance. We believe that true energy doesn&apos;t come from synthetic stimulants or artificial shortcuts; it flows from an authentic passion for life and honoring every single moment.
              </p>
            </div>
          </div>

          {/* WIREFRAME: 3-Stat Metric Strip */}
          <div className="mt-8 max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-amber-200/80 bg-white p-4 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400">Millions</div>
              <div className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">Hearts Touched</div>
            </div>
            <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">8 Flavors</div>
              <div className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">Artisan Crafted</div>
            </div>
            <div className="rounded-2xl border border-purple-200/80 bg-white p-4 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="text-3xl font-black text-purple-600 dark:text-purple-400">100%</div>
              <div className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">Natural Purity</div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          SECTION 2 (WIREFRAME EXACT):
          Time, Dedication & The Golden AURRA
          2-Column Layout: Left Large Image, Right Text Card
          ======================================================== */}
      <section className="py-16 sm:py-20 border-b border-slate-200/60 dark:border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Section 2: The Philosophy of Time &amp; Golden AURRA</span>
            </div>
            
            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Time, Dedication &amp; The Golden AURRA
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              True excellence is not an accident — it is forged through patient dedication, continuous practice, and honoring every passing second with intention.
            </p>
          </div>

          {/* WIREFRAME 2-COLUMN LAYOUT: Left Image + Right 3-Pillars Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
            
            {/* Left Column: Large Rounded Image Card */}
            <div className="lg:col-span-5">
              <div
                onClick={() => setSelectedPhoto(ALL_GALLERY_PHOTOS[3])}
                className="group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-amber-200/80 bg-white p-2.5 shadow-xl shadow-amber-900/5 dark:border-amber-900/40 dark:bg-slate-900"
              >
                <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <img
                    src={ALL_GALLERY_PHOTOS[3].src} // Recents golden hour halter
                    alt={ALL_GALLERY_PHOTOS[3].title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80" />

                  <div className="absolute top-3 left-3 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-xs">
                    The Golden AURRA
                  </div>

                  <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-md text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity dark:bg-slate-900/80 dark:text-white">
                    <Maximize2 className="h-4 w-4" />
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <p className="text-sm font-bold">{ALL_GALLERY_PHOTOS[3].title}</p>
                    <p className="text-xs text-slate-300 mt-0.5">{ALL_GALLERY_PHOTOS[3].subtitle}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Text Card with 3 Key Pillars */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Pillar 1: The Inner Golden Glow */}
              <div className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-amber-400">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-black">
                    <Sun className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      The Inner Golden Glow
                    </h3>
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      Radiant Spirit &amp; Authentic Warmth
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  The &ldquo;Golden AURRA&rdquo; represents that unmistakable, uplifting aura surrounding individuals who pour their heart and soul into their craft. It is a light that does not diminish under pressure, but glows brighter with genuine passion and humility.
                </p>
              </div>

              {/* Pillar 2: Patience in the Craft */}
              <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-emerald-400">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-black">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Patience in the Craft
                    </h3>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Slow Cold-Pressing &amp; Uncompromising Purity
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Just as Aurra&apos;s artistic growth unfolds with discipline and poise, our artisan beverages honor the patient craft of slow cold-pressing. We allow pure botanicals and fruits the time they need to release their true essence without shortcuts.
                </p>
              </div>

              {/* Pillar 3: Timeless Effervescence */}
              <div className="rounded-3xl border border-purple-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-purple-400">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-black">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Timeless Effervescence
                    </h3>
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                      Crisp Antioxidant Bubbles · Clean Sustained Energy
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every can is calibrated to provide crisp, revitalizing carbonation infused with antioxidant-rich green tea extract and zero chemical dyes — keeping you vibrant, present, and charged for whatever stage you step onto.
                </p>
              </div>

            </div>

          </div>

          {/* WIREFRAME: Emotional Quote Banner */}
          <div className="mt-12 max-w-4xl mx-auto rounded-3xl border border-amber-300/60 bg-gradient-to-r from-amber-50 via-lime-50 to-emerald-50 p-6 sm:p-8 dark:border-amber-900/40 dark:from-slate-900 dark:via-amber-950/20 dark:to-slate-900 text-center shadow-xs">
            <p className="text-base sm:text-lg lg:text-xl font-bold italic text-slate-800 dark:text-slate-200 leading-relaxed">
              &ldquo;Energy is sacred. When you nourish your body with clean nature and your mind with genuine passion, your AURRA shines effortlessly.&rdquo;
            </p>
            <span className="mt-3 inline-block text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
              — The Aurra Blast Philosophy
            </span>
          </div>

        </div>
      </section>

      {/* ========================================================
          SECTION 3 (WIREFRAME EXACT):
          Flavors of Aurra (Renamed from The 8 Flavors)
          High-Performance Virtualized Alternating Rows:
          Row 1: [TEXT] [IMG]
          Row 2: [IMG] [TEXT]
          Row 3: [TEXT] [IMG]
          ... alternating through all 8 drinks
          ======================================================== */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-lg bg-teal-50 px-3.5 py-1 text-xs font-bold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
              <Droplets className="h-3.5 w-3.5 text-teal-600" />
              <span>Section 3: Flavors of Aurra</span>
            </div>

            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Where Natural Beauty Meets Ultimate Freshness
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Each signature beverage is paired with the authentic spirit and candid energy of Aurra Bhatnagar Badoni. Experience the 8 handcrafted creations in perfect harmony with nature.
            </p>
          </div>

          {/* Virtualized Alternating Rows List */}
          <div className="space-y-12">
            {FLAVORS_DATA.map((flavor, index) => {
              // Row 1 (index 0): Text Left, Image Right (isImageLeft = false)
              // Row 2 (index 1): Image Left, Text Right (isImageLeft = true)
              // Row 3 (index 2): Text Left, Image Right (isImageLeft = false)
              // and so on...
              const isImageLeft = index % 2 === 1;

              return (
                <VirtualizedFlavorRow
                  key={flavor.id}
                  flavor={flavor}
                  index={index}
                  isImageLeft={isImageLeft}
                  onOpenPhoto={(photo) => setSelectedPhoto(photo)}
                />
              );
            })}
          </div>

          {/* Clean Quality Guarantee Bar */}
          <div className="mt-16 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">&lt; 50 kcal</div>
                <div className="text-xs font-bold text-slate-500 mt-1">Light &amp; Guilt-Free</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">100% Real</div>
                <div className="text-xs font-bold text-slate-500 mt-1">Fruit Extract Puree</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400">0% Taurine</div>
                <div className="text-xs font-bold text-slate-500 mt-1">Zero Synthetic Jitters</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">Instant UPI</div>
                <div className="text-xs font-bold text-slate-500 mt-1">Seamless ₹ QR Pay</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          INTERACTIVE FULLSCREEN LIGHTBOX MODAL
          Allows full inspection of any photo clicked across the tribute
          ======================================================== */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 sm:p-6">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-12 right-0 sm:-right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Main Modal Image */}
            <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-slate-900 shadow-2xl max-h-[72vh] flex items-center justify-center">
              <img
                src={selectedPhoto.src}
                alt={selectedPhoto.title}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-2xl"
              />
            </div>

            {/* Modal Caption Card */}
            <div className="mt-4 w-full rounded-2xl border border-white/20 bg-slate-900/90 p-4 backdrop-blur-md text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">
                    {selectedPhoto.tag}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    Aurra Bhatnagar Badoni Collection
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold mt-1">{selectedPhoto.title}</h4>
                <p className="text-xs text-slate-300">{selectedPhoto.subtitle}</p>
              </div>

              {/* Prev / Next controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const currentIndex = ALL_GALLERY_PHOTOS.findIndex((p) => p.id === selectedPhoto.id);
                    const prev =
                      ALL_GALLERY_PHOTOS[
                        (currentIndex - 1 + ALL_GALLERY_PHOTOS.length) % ALL_GALLERY_PHOTOS.length
                      ];
                    setSelectedPhoto(prev);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                  title="Previous Photo (Left Arrow)"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    const currentIndex = ALL_GALLERY_PHOTOS.findIndex((p) => p.id === selectedPhoto.id);
                    const next = ALL_GALLERY_PHOTOS[(currentIndex + 1) % ALL_GALLERY_PHOTOS.length];
                    setSelectedPhoto(next);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                  title="Next Photo (Right Arrow)"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
