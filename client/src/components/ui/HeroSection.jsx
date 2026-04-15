import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const FALLBACK = {
  image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80',
  title: 'Welcome',
  subtitle: 'Discover the new collection',
  cta_text: 'SHOP NOW',
  cta_link: '/shop',
};

const AUTOPLAY_INTERVAL = 5000;

export default function HeroSection({ banners }) {
  const slides = banners?.length ? banners : [FALLBACK];
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);

  const goTo = useCallback(
    (index) => {
      if (animating || index === current) return;
      setAnimating(true);
      setCurrent(index);
      setTimeout(() => setAnimating(false), 700);
    },
    [animating, current]
  );

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length);
  }, [current, slides.length, goTo]);

  const next = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, slides.length, goTo]);

  // Autoplay
  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    timerRef.current = setInterval(next, AUTOPLAY_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [next, paused, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next]);

  const slide = slides[current];

  return (
    <section
      className="relative w-full overflow-hidden select-none"
      style={{ height: 'calc(100vh - 64px)', minHeight: '500px', maxHeight: '800px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {slides.map((s, idx) => (
        <div
          key={s.id ?? idx}
          aria-hidden={idx !== current}
          className={clsx(
            'absolute inset-0 transition-opacity duration-700',
            idx === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          )}
        >
          <img
            src={s.image_url || FALLBACK.image_url}
            alt={s.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        </div>
      ))}

      {/* Content — always on top */}
      <div className="relative z-20 h-full flex items-center pointer-events-none">
        <div className="container-app">
          <div className="max-w-lg">
            {slide.subtitle && (
              <p
                key={`sub-${current}`}
                className="text-white/70 text-sm font-medium tracking-[0.2em] uppercase mb-4 animate-fade-in"
              >
                {slide.subtitle}
              </p>
            )}
            <h1
              key={`title-${current}`}
              className="text-white font-bold leading-none tracking-tight mb-6 animate-fade-in"
              style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}
            >
              {slide.title}
            </h1>
            <Link
              to={slide.cta_link || '/shop'}
              className="pointer-events-auto inline-flex items-center gap-3 bg-white text-ink font-bold px-8 py-4 rounded-pill text-sm tracking-wider uppercase hover:bg-gray-100 active:scale-95 transition-all duration-150 shadow-lg"
            >
              {slide.cta_text || 'SHOP NOW'}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Prev / Next arrows — only when multiple slides */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={clsx(
                'rounded-full transition-all duration-300',
                idx === current
                  ? 'w-6 h-2 bg-white'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/80'
              )}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {slides.length > 1 && !paused && (
        <div className="absolute bottom-0 left-0 right-0 z-30 h-0.5 bg-white/20">
          <div
            key={current}
            className="h-full bg-white/60"
            style={{
              animation: `progress ${AUTOPLAY_INTERVAL}ms linear forwards`,
            }}
          />
        </div>
      )}

      {/* Scroll indicator (only for single slide or when hiding dots) */}
      {slides.length <= 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 text-white/50">
          <div className="w-px h-8 bg-white/30 animate-pulse" />
          <span className="text-xs tracking-widest uppercase">Scroll</span>
        </div>
      )}

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </section>
  );
}
