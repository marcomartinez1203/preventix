import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { downloadExcelReport, type ExcelReport } from '../../utils/excelReport';

export default function ExcelExportButton({ report, filename, disabled = false }: { report: () => ExcelReport; filename: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div><button className="btn-primary inline-flex items-center gap-2" disabled={disabled || busy} onClick={async () => {
    setBusy(true); setError('');
    try { await new Promise(resolve => setTimeout(resolve, 30)); downloadExcelReport(report(), filename); }
    catch { setError('No se pudo generar el Excel. Inténtalo nuevamente.'); }
    finally { setBusy(false); }
  }}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}{busy ? 'Generando Excel…' : 'Exportar Excel con gráficas'}</button>{error && <p role="alert" className="text-xs text-red-300 mt-2">{error}</p>}</div>;
}
