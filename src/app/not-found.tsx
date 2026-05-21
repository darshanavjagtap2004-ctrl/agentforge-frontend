import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-slate-200 mb-4">404</p>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Page not found</h1>
        <p className="text-slate-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
