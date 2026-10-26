import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useState } from 'react';
import ToastContainer from '../common/ToastContainer';
import { useToast } from '../../hooks/useToast';

export default function AppLayout() {
  const [menu, setMenu] = useState(false);
  const toast = useToast();
  return (
    <div className="flex h-dvh bg-ink overflow-hidden">
      <div className="hidden md:flex"><Sidebar /></div>
      {menu && <div className="fixed inset-0 z-40 md:hidden"><button className="absolute inset-0 bg-black/40" aria-label="Cerrar menú" onClick={() => setMenu(false)} /><div className="absolute inset-y-0 left-0 flex"><Sidebar onNavigate={() => setMenu(false)} /></div></div>}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenu={() => setMenu(true)} />
        <main className="workspace-main flex-1 overflow-y-auto p-4 md:p-7 lg:p-9">
          <div className="max-w-[1520px] mx-auto"><Outlet /></div>
        </main>
      </div>
      <ToastContainer toasts={toast.toasts} />
    </div>
  );
}
