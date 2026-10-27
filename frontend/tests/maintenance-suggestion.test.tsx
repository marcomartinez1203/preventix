import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import MaintenanceSuggestion from '../src/components/common/MaintenanceSuggestion';
import type { Equipo } from '../src/types';
const mocks = vi.hoisted(() => ({ create: vi.fn(), invalidate: vi.fn(), success: vi.fn(), pending: false }));
vi.mock('../src/api', () => ({ equiposApi: { sugerencia: vi.fn() }, mantenimientosApi: { crear: mocks.create }, usuariosApi: { listar: vi.fn() } }));
vi.mock('../src/hooks/useToast', () => ({ useToast: () => ({ success: mocks.success }) }));
vi.mock('react-router-dom', () => ({ Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a> }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data: queryKey[0] === 'usuarios' ? [{ id: 'u2', nombre: 'Técnico', activo: true }] : { frecuenciaDias: 30, fechaProgramada: '2099-11-01', fechaBase: '2099-10-02', base: 'Último preventivo', justificacion: 'Revisión cada 30 días.', pendiente: mocks.pending ? { id: 'm1', estado: 'programado' } : null }, refetch: vi.fn() }),
}));
let host: HTMLDivElement;
let root: Root;
const close = vi.fn();
const equipment = { id: 'e1', nombre: 'Equipo aula', responsable: { id: 'u2' } } as Equipo;
beforeEach(() => { vi.clearAllMocks(); mocks.pending = false; host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
test('requires acceptance, sends selected date and owner, then closes after persistence', async () => {
  mocks.create.mockResolvedValue({ data: {} });
  await act(async () => root.render(<MaintenanceSuggestion equipo={equipment} onClose={close} />));
  expect(mocks.create).not.toHaveBeenCalled();
  expect((host.querySelector('#suggested-date') as HTMLInputElement).value).toBe('2099-11-01');
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ equipoId: 'e1', responsableId: 'u2', tipo: 'preventivo', fechaProgramada: '2099-11-01', sugerido: true }));
  expect(close).toHaveBeenCalledOnce();
  expect(mocks.invalidate).toHaveBeenCalled();
});
test('pending preventive cannot be accepted again', async () => {
  mocks.pending = true;
  await act(async () => root.render(<MaintenanceSuggestion equipo={equipment} onClose={close} />));
  expect(host.textContent).toContain('Ya existe un preventivo');
  expect(host.querySelector('form')).toBeNull();
  expect(mocks.create).not.toHaveBeenCalled();
});
test('failed persistence keeps the form and displays the API error', async () => {
  mocks.create.mockRejectedValue({ response: { status: 400, data: { message: 'Responsable no disponible.' } } });
  await act(async () => root.render(<MaintenanceSuggestion equipo={equipment} onClose={close} />));
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Responsable no disponible.');
  expect(close).not.toHaveBeenCalled();
});
