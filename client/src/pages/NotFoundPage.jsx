import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-8xl font-bold text-gray-100">404</p>
        <h1 className="text-3xl font-bold mt-4 mb-2">Page not found</h1>
        <p className="text-ink-muted mb-8">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary">Go Home</Link>
      </div>
    </div>
  );
}
