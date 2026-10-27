import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useState, useEffect } from 'react';
import { useDialog } from '../../hooks/useDialog';
import ToastContainer from '../common/ToastContainer';
import { useToast } from '../../hooks/useToast';

export default function AppLayout() {
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const toast = useToast();
  const drawer = useDialog(menu, () => setMenu(false));
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1100px)');
    const close = () => { if (media.matches) setMenu(false); };
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, []);
  return (
    <div className="flex h-dvh bg-ink overflow-hidden">
      <a href="#main-content" className="skip-link">Ir al contenido</a>
      <div className="desktop-navigation"><Sidebar /></div>
      {menu && <div data-modal-root className="drawer-root fixed inset-0 z-40"><button className="absolute inset-0 bg-black/60" aria-label="Cerrar menú" onClick={() => setMenu(false)} /><div ref={drawer} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Navegación principal" className="mobile-drawer absolute inset-y-0 left-0 flex bg-ink"><Sidebar onNavigate={() => setMenu(false)} /></div></div>}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenu={() => setMenu(true)} />
        <main id="main-content" tabIndex={-1} className="workspace-main flex-1 overflow-y-auto p-4 sm:p-7">
          <div key={pathname} className="route-surface max-w-[1400px] mx-auto"><Outlet /></div>
        </main>
      </div>
      <ToastContainer toasts={toast.toasts} />
    </div>
  );
}
