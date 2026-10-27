import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import Modal from '../src/components/common/Modal';
import LoginPage from '../src/pages/auth/LoginPage';
import ToastContainer from '../src/components/common/ToastContainer';
import { useToast, dismissToast } from '../src/hooks/useToast';
import { useAuthStore } from '../src/stores/authStore';
import { authApi } from '../src/api';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('../src/api', () => ({ authApi: { login: vi.fn() } }));
let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  localStorage.clear(); useAuthStore.getState().logout();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); vi.clearAllMocks(); });
const click = async (element: Element | null) => { expect(element).not.toBeNull(); await act(async () => (element as HTMLElement).click()); };
const key = async (value: string, shiftKey = false) => { await act(async () => { document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true })); }); };

function DialogExample() {
  const [open, setOpen] = useState(false);
  return <><div id="background"><button onClick={() => setOpen(true)}>Editar equipo</button><button>Otra acción</button></div><Modal open={open} onClose={() => setOpen(false)} title="Editar equipo"><label htmlFor="test-name">Nombre</label><input id="test-name" /><button>Guardar cambios</button></Modal></>;
}

test('dialog contains Tab, isolates background, closes with Escape and restores focus', async () => {
  await act(async () => root.render(<DialogExample />));
  const trigger = host.querySelector('button')!; trigger.focus();
  await click(trigger);
  const panel = host.querySelector('[role="dialog"]')!;
  const buttons = panel.querySelectorAll('button');
  expect(document.querySelector<HTMLElement>('#background')?.inert).toBe(true);
  expect(document.activeElement).toBe(buttons[0]);
  buttons[buttons.length - 1].focus();
  await key('Tab');
  expect(document.activeElement).toBe(buttons[0]);
  await key('Tab', true); expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  await key('Escape');
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(document.querySelector<HTMLElement>('#background')?.inert).not.toBe(true);
  expect(document.activeElement).toBe(trigger);
  expect(document.body.style.overflow).not.toBe('hidden');
});

test('a changed dialog callback does not lose focus containment', async () => {
  await act(async () => root.render(<DialogExample />)); await click(host.querySelector('button'));
  await act(async () => root.render(<DialogExample />));
  const panel = host.querySelector('[role="dialog"]')!;
  (host.querySelector('#background button') as HTMLElement).focus();
  await key('Tab'); expect(panel.contains(document.activeElement)).toBe(true);
  await key('Escape'); expect(host.querySelector('[role="dialog"]')).toBeNull();
});

test('demo password is opt-in; normal form submission still authenticates through the API', async () => {
  vi.mocked(authApi.login).mockResolvedValue({ data: { data: { accessToken: 'test-token', usuario: { id: 'u1', nombre: 'Demo', email: 'demo@preventix.com', rol: 'administrador', esTecnicoExterno: false }, empresa: { id: 'e1', nombre: 'Empresa' } } } } as Awaited<ReturnType<typeof authApi.login>>);
  await act(async () => root.render(<LoginPage />));
  expect(host.querySelector<HTMLInputElement>('#password')?.value).toBe('');
  const demo = Array.from(host.querySelectorAll('button')).find(button => button.textContent === 'Completar con cuenta demo')!;
  await click(demo); expect(host.querySelector<HTMLInputElement>('#password')?.value).toBe('Demo1234');
  expect(authApi.login).not.toHaveBeenCalled();
  await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  expect(authApi.login).toHaveBeenCalledWith({ email: 'demo@preventix.com', password: 'Demo1234' });
  expect(navigate).toHaveBeenCalledWith('/dashboard');
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
});

test('action notices keep Undo available; errors persist until explicitly dismissed', async () => {
  vi.useFakeTimers();
  const undo = vi.fn();
  function Notices() {
    const toast = useToast();
    return <><button onClick={() => toast.success('Equipo archivado', { label: 'Deshacer', onClick: undo })}>Archivar</button><button onClick={() => toast.error('No se pudo guardar')}>Error</button><button onClick={() => toast.toasts.forEach(t => dismissToast(t.id))}>Limpiar avisos</button><ToastContainer toasts={toast.toasts} /></>;
  }
  await act(async () => root.render(<Notices />)); await click(host.querySelector('button'));
  await act(async () => vi.advanceTimersByTime(30000));
  const action = Array.from(host.querySelectorAll('button')).find(button => button.textContent === 'Deshacer')!;
  await click(action); expect(undo).toHaveBeenCalledOnce();
  const error = Array.from(host.querySelectorAll('button')).find(button => button.textContent === 'Error')!;
  await click(error); await act(async () => vi.advanceTimersByTime(30000));
  expect(host.querySelector('[role="alert"]')?.textContent).toBe('No se pudo guardar');
  await click(host.querySelector('[aria-label="Cerrar aviso"]'));
  expect(host.querySelector('[role="alert"]')).toBeNull();
});
