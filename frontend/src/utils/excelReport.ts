import { strToU8, zipSync } from 'fflate';

export type ExcelValue = string | number | null;
export interface ExcelChart { title: string; categories: string[]; series: { name: string; values: (number | null)[] }[]; money?: boolean }
export interface ExcelReport { title: string; subtitle: string; headers: string[]; rows: ExcelValue[][]; charts: ExcelChart[]; moneyColumns?: number[]; highlights?: [string, ExcelValue][] }

// Strip characters forbidden by XML 1.0 before escaping user-provided cell text.
// eslint-disable-next-line no-control-regex
const xml = (v: unknown) => String(v ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const col = (index: number): string => index < 26 ? String.fromCharCode(65 + index) : col(Math.floor(index / 26) - 1) + col(index % 26);
const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const moneyFormat = '#,##0.00;[Red](#,##0.00);0.00';
function cell(value: ExcelValue, address: string, style = 0) {
  if (value === null) return `<c r="${address}" s="${style}"/>`;
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${address}" s="${style}"><v>${value}</v></c>`;
  // Text is always inline text: names starting with '=' cannot become formulas.
  return `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}
function row(values: ExcelValue[], n: number, style = 0, moneyColumns: number[] = []) {
  return `<row r="${n}" ht="30" customHeight="1">${values.map((v, i) => cell(v, `${col(i)}${n}`, moneyColumns.includes(i) && typeof v === 'number' ? 5 : style)).join('')}</row>`;
}
const relationships = (items: string) => `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items}</Relationships>`;
const relationship = (id: string, type: string, target: string) => `<Relationship Id="${id}" Type="${rel}/${type}" Target="${target}"/>`;
function sheet(body: string, columns: number, drawing = false, lastRow = 4, filter = false) {
  return `${declaration}<worksheet xmlns="${ns}" xmlns:r="${rel}"><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="22"/><cols>${Array.from({ length: columns }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${drawing ? i < 4 ? 25 : 12 : i === 0 ? 36 : 24}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData>${filter ? `<autoFilter ref="A4:${col(columns - 1)}${lastRow}"/>` : ''}<mergeCells count="2"><mergeCell ref="A1:${col(columns - 1)}1"/><mergeCell ref="A2:${col(columns - 1)}2"/></mergeCells><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9"/>${drawing ? '<drawing r:id="rId1"/>' : ''}</worksheet>`;
}
function chartXml(chart: ExcelChart, headerRow: number, id: number) {
  const cache = (values: (string | number | null)[], numeric: boolean) => `<c:${numeric ? 'numCache' : 'strCache'}>${numeric ? `<c:formatCode>${chart.money ? moneyFormat : '0'}</c:formatCode>` : ''}<c:ptCount val="${values.length}"/>${values.map((v, i) => v === null ? '' : `<c:pt idx="${i}"><c:v>${xml(v)}</c:v></c:pt>`).join('')}</c:${numeric ? 'numCache' : 'strCache'}>`;
  const start = headerRow + 1, end = headerRow + chart.categories.length;
  const colors = ['FFD400', '64748B', '16A34A', 'DC2626'];
  return `${declaration}<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:lang val="es-CO"/><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1400" b="1"/></a:pPr><a:r><a:t>${xml(chart.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/><c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${chart.series.map((s, i) => `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:strRef><c:f>'Resumen'!$${col(i + 1)}$${headerRow}</c:f>${cache([s.name], false)}</c:strRef></c:tx><c:spPr><a:solidFill><a:srgbClr val="${colors[i % colors.length]}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr><c:cat><c:strRef><c:f>'Resumen'!$A$${start}:$A$${end}</c:f>${cache(chart.categories, false)}</c:strRef></c:cat><c:val><c:numRef><c:f>'Resumen'!$${col(i + 1)}$${start}:$${col(i + 1)}$${end}</c:f>${cache(s.values, true)}</c:numRef></c:val></c:ser>`).join('')}<c:gapWidth val="70"/><c:axId val="${id * 10 + 1}"/><c:axId val="${id * 10 + 2}"/></c:barChart><c:catAx><c:axId val="${id * 10 + 1}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:tickLblPos val="nextTo"/><c:crossAx val="${id * 10 + 2}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/></c:catAx><c:valAx><c:axId val="${id * 10 + 2}"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="${chart.money ? '#,##0.00' : '0'}" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="${id * 10 + 1}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx></c:plotArea><c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`;
}

export function buildExcelReport(report: ExcelReport): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const put = (name: string, content: string) => { files[name] = strToU8(content); };
  const charts = report.charts.filter(c => c.categories.length > 0);
  let summary = row([`PREVENTIX · ${report.title}`], 1, 1) + row([report.subtitle], 2, 3) + row(['Resumen al exportar', 'Valor'], 4, 2);
  (report.highlights ?? [['Registros', report.rows.length]]).forEach((h, i) => { summary += row(h, i + 5); });
  let cursor = Math.max(9, (report.highlights?.length ?? 1) + 7);
  const anchors: string[] = [];
  charts.forEach((chart, index) => {
    const n = index + 1;
    summary += row([chart.title], cursor, 2);
    const header = ++cursor;
    summary += row(['Categoría', ...chart.series.map(s => s.name)], header, 2);
    chart.categories.forEach((label, i) => { summary += row([label, ...chart.series.map(s => s.values[i] ?? null)], ++cursor, i % 2 ? 4 : 0, chart.money ? chart.series.map((_, j) => j + 1) : []); });
    put(`xl/charts/chart${n}.xml`, chartXml(chart, header, n));
    const top = header - 2;
    anchors.push(`<xdr:twoCellAnchor><xdr:from><xdr:col>4</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${top}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>14</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${top + 17}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${n}" name="Gráfica ${n}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId${n}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`);
    cursor = Math.max(cursor + 3, top + 20);
  });
  if (!charts.length) summary += row(['Sin datos para generar gráficas.'], cursor, 3);
  put('xl/worksheets/sheet1.xml', sheet(summary, 14, charts.length > 0));
  const data = row([report.title], 1, 1) + row([`Fuente: Preventix · ${report.subtitle}`], 2, 3) + row(report.headers, 4, 2) + report.rows.map((r, i) => row(r, i + 5, i % 2 ? 4 : 0, report.moneyColumns)).join('');
  put('xl/worksheets/sheet2.xml', sheet(data, report.headers.length, false, Math.max(4, report.rows.length + 4), true));
  if (charts.length) {
    put('xl/worksheets/_rels/sheet1.xml.rels', relationships(relationship('rId1', 'drawing', '../drawings/drawing1.xml')));
    put('xl/drawings/drawing1.xml', `${declaration}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${rel}">${anchors.join('')}</xdr:wsDr>`);
    put('xl/drawings/_rels/drawing1.xml.rels', relationships(charts.map((_, i) => relationship(`rId${i + 1}`, 'chart', `../charts/chart${i + 1}.xml`)).join('')));
  }
  put('xl/workbook.xml', `${declaration}<workbook xmlns="${ns}" xmlns:r="${rel}"><bookViews><workbookView/></bookViews><sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/><sheet name="Datos" sheetId="2" r:id="rId2"/></sheets></workbook>`);
  put('xl/_rels/workbook.xml.rels', relationships(relationship('rId1', 'worksheet', 'worksheets/sheet1.xml') + relationship('rId2', 'worksheet', 'worksheets/sheet2.xml') + relationship('rId3', 'styles', 'styles.xml')));
  put('_rels/.rels', relationships(relationship('rId1', 'officeDocument', 'xl/workbook.xml')));
  const xf = (font = 0, fill = 0, numFmt = 0) => `<xf numFmtId="${numFmt}" fontId="${font}" fillId="${fill}" borderId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1" applyNumberFormat="1"><alignment vertical="center" wrapText="1"/></xf>`;
  put('xl/styles.xml', `${declaration}<styleSheet xmlns="${ns}"><numFmts count="1"><numFmt numFmtId="164" formatCode="${moneyFormat}"/></numFmts><fonts count="3"><font><sz val="11"/><color rgb="FF202020"/><name val="Calibri"/></font><font><b/><sz val="18"/><color rgb="FFFFD400"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF151515"/><name val="Calibri"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF151515"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFD400"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1">${xf()}</cellStyleXfs><cellXfs count="6">${xf()}${xf(1, 2)}${xf(2, 3)}${xf()}${xf(0, 4)}${xf(0, 0, 164)}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  const override = (path: string, type: string) => `<Override PartName="/${path}" ContentType="application/vnd.openxmlformats-officedocument.${type}+xml"/>`;
  put('[Content_Types].xml', `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${override('xl/workbook.xml', 'spreadsheetml.sheet.main')}${override('xl/styles.xml', 'spreadsheetml.styles')}${[1, 2].map(i => override(`xl/worksheets/sheet${i}.xml`, 'spreadsheetml.worksheet')).join('')}${charts.length ? override('xl/drawings/drawing1.xml', 'drawing') : ''}${charts.map((_, i) => override(`xl/charts/chart${i + 1}.xml`, 'drawingml.chart')).join('')}</Types>`);
  return zipSync(files);
}

export function downloadExcelReport(report: ExcelReport, filename: string) {
  const bytes = buildExcelReport(report);
  const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a'); link.href = url; link.download = `${filename}.xlsx`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function countChart(title: string, values: string[]): ExcelChart {
  const counts = new Map<string, number>();
  values.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1));
  return { title, categories: [...counts.keys()], series: [{ name: 'Cantidad', values: [...counts.values()] }] };
}
