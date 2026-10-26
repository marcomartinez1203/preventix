import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-6"><p className="text-6xl font-bold text-brand">404</p><h1 className="text-2xl font-semibold">Esta página no existe</h1><p className="text-zinc-400">Revisa la dirección o regresa al inicio.</p><Link className="btn-primary" to="/dashboard">Volver al dashboard</Link></div>;
}
