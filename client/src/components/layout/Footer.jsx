import { Link } from 'react-router-dom';
import { LOGO_FOOTER_URL } from '../../constants/brand';

export default function Footer() {
  return (
    <footer className="bg-ink text-white mt-20">
      <div className="container-app py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="inline-block mb-4">
              <img
                src={LOGO_FOOTER_URL}
                alt="LuxMode Logo"
                className="h-8 w-auto max-w-[min(100%,240px)] object-contain object-left sm:h-9"
                width={240}
                height={44}
                loading="lazy"
                decoding="async"
              />
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Premium fashion for the modern lifestyle. Curated collections, timeless style.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm tracking-wider uppercase">Shop</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/shop" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link to="/shop/men" className="hover:text-white transition-colors">Men</Link></li>
              <li><Link to="/shop/women" className="hover:text-white transition-colors">Women</Link></li>
              <li><Link to="/shop/kids" className="hover:text-white transition-colors">Kids</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm tracking-wider uppercase">Account</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Register</Link></li>
              <li><Link to="/orders" className="hover:text-white transition-colors">My Orders</Link></li>
              <li><Link to="/cart" className="hover:text-white transition-colors">Cart</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm tracking-wider uppercase">Support</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><span>support@luxemode.com</span></li>
              <li><span>Mon–Fri 9:00–18:00</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} LuxeMode. All rights reserved.</p>
          <p>Built with ♥ — Fashion E-Commerce</p>
        </div>
      </div>
    </footer>
  );
}
