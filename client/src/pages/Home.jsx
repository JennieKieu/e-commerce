import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { bannerApi, productApi, categoryApi } from '../services/api';
import HeroSection from '../components/ui/HeroSection';
import ProductCard from '../components/ui/ProductCard';
import { PageSpinner } from '../components/ui/Spinner';

const CATEGORY_IMAGES = {
  men: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80',
  women: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=600&q=80',
  kids: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?w=600&q=80',
};

export default function Home() {
  const { data: banners } = useQuery({
    queryKey: ['banners'],
    queryFn: () => bannerApi.getAll().then((r) => r.data.data),
  });

  const { data: featuredData, isLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productApi.getAll({ featured: 'true', limit: 8 }).then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll().then((r) => r.data.data),
  });

  const featured = featuredData?.data || [];
  const promoBanner = banners?.[1];

  return (
    <div>
      {/* Hero carousel */}
      <HeroSection banners={banners} />

      {/* Category Cards */}
      <section className="container-app mt-16">
        <h2 className="section-title mb-8">Shop by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(categories || []).map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category=${encodeURIComponent(cat.slug)}`}
              className="group relative aspect-video sm:aspect-[4/5] overflow-hidden rounded-2xl"
            >
              <img
                src={cat.image_url || CATEGORY_IMAGES[cat.slug] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=60'}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <h3 className="text-white text-2xl font-bold">{cat.name}</h3>
                <p className="text-white/70 text-sm mt-1 flex items-center gap-1">
                  Shop now <ArrowRight size={14} />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container-app mt-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="section-title">Featured Products</h2>
          <Link to="/shop" className="text-sm font-medium text-brand hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <PageSpinner />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Secondary promo banner — uses banner[1] from DB or a fallback */}
      <section className="mt-20">
        <div className="relative h-64 sm:h-80 overflow-hidden">
          <img
            src={promoBanner?.image_url || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80'}
            alt={promoBanner?.title || 'New Arrivals'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              {promoBanner?.subtitle && (
                <p className="text-xs tracking-[0.3em] uppercase mb-3 text-white/70">{promoBanner.subtitle}</p>
              )}
              {!promoBanner && (
                <p className="text-xs tracking-[0.3em] uppercase mb-3 text-white/70">New Season</p>
              )}
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">{promoBanner?.title || 'New Arrivals'}</h2>
              <Link
                to={promoBanner?.cta_link || '/shop'}
                className="inline-flex items-center gap-2 bg-white text-ink font-bold px-8 py-3 rounded-pill text-sm tracking-wider uppercase hover:bg-gray-100 transition-colors"
              >
                {promoBanner?.cta_text || 'Explore'} <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
