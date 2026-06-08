import type { Student, DocumentSession } from '../services/admin.service';

type PdfKind = 'invoice' | 'report';

export type PdfSession = {
  date: string;
  time: string;
  subject: string;
  note?: string;
  notes?: string;
  price?: number;
};

type PdfSummaryItem = {
  label: string;
  value: string;
};

type PdfOptions = {
  kind: PdfKind;
  title: string;
  documentNumber: string;
  student: Student;
  periodStart: string;
  periodEnd: string;
  sessions: PdfSession[];
  summaryItems: PdfSummaryItem[];
  summaryTitle?: string;
  summary?: string;
  totalLabel?: string;
  totalValue?: string;
  footerNote: string;
};

const moneyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const pageWidth = 595;
const pageHeight = 842;
const margin = 34;
const contentWidth = pageWidth - margin * 2;

const ascii = (value: string) =>
  Array.from((value || '').normalize('NFD'))
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code <= 126;
    })
    .join('')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const wrapText = (value: string, maxChars: number) => {
  const words = (value || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    if (word.length > maxChars) {
      let index = 0;
      while (index < word.length) {
        const chunk = word.slice(index, index + maxChars);
        if (chunk.length === maxChars) {
          lines.push(chunk);
        } else {
          current = chunk;
        }
        index += maxChars;
      }
      continue;
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

const chunk = <T,>(items: T[], size: number) => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const formatDate = (value: string) => {
  if (!value) return '-';
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  const parsed = new Date(match ? `${match[1]}T00:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
};

const formatShortDate = (value: string) => {
  if (!value) return '-';
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  const parsed = new Date(match ? `${match[1]}T00:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? value : shortDateFormatter.format(parsed);
};

const formatTime = (value: string) => {
  if (!value) return '-';
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  const isoMatch = value.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}:${isoMatch[2]}`;
  return value.slice(0, 5) || value;
};

const formatMoney = (value: number) => moneyFormatter.format(value || 0);

const pdfHeader = (title: string, documentNumber: string, subtitle: string) => {
  const lines: string[] = [];
  lines.push('q');
  lines.push('0.086 0.125 0.145 rg');
  lines.push(`0 ${pageHeight - 96} ${pageWidth} 96 re f`);
  lines.push('0.976 0.855 0.012 rg');
  lines.push(`0 ${pageHeight - 10} ${pageWidth} 10 re f`);
  lines.push('Q');
  lines.push(`BT /F1-B 24 Tf 1 1 1 rg 1 0 0 1 ${margin} ${pageHeight - 54} Tm (${ascii(title)}) Tj ET`);
  lines.push(`BT /F1 10 Tf 0.94 0.94 0.94 rg 1 0 0 1 ${margin} ${pageHeight - 74} Tm (${ascii(subtitle)}) Tj ET`);
  lines.push(`BT /F1-B 14 Tf 1 1 1 rg 1 0 0 1 ${pageWidth - margin - 180} ${pageHeight - 48} Tm (No. ${ascii(documentNumber)}) Tj ET`);
  return lines.join('\n');
};

const pdfBox = (x: number, y: number, width: number, height: number, label: string, value: string) => {
  const labelLines = wrapText(label, Math.max(8, Math.floor(width / 7)));
  const valueLines = wrapText(value, Math.max(10, Math.floor(width / 7)));
  const lines: string[] = [];
  lines.push('q');
  lines.push('0.964 0.972 0.976 rg');
  lines.push(`${x} ${y} ${width} ${height} re f`);
  lines.push('0.769 0.82 0.839 RG');
  lines.push('0.8 w');
  lines.push(`${x} ${y} ${width} ${height} re S`);
  lines.push('Q');
  lines.push(`BT /F1-B 8 Tf 0.31 0.35 0.38 rg 1 0 0 1 ${x + 12} ${y + height - 16} Tm (${ascii(labelLines[0] || label)}) Tj ET`);
  const baseY = y + height - 34;
  valueLines.slice(0, 2).forEach((line, index) => {
    lines.push(`BT /F1 10 Tf 0.08 0.13 0.15 rg 1 0 0 1 ${x + 12} ${baseY - index * 13} Tm (${ascii(line)}) Tj ET`);
  });
  return lines.join('\n');
};

const pdfParagraph = (x: number, y: number, width: number, text: string, fontSize = 10, leading = 13) => {
  const maxChars = Math.max(20, Math.floor(width / (fontSize * 0.55)));
  const lines = wrapText(text, maxChars);
  return lines.map((line, index) => `BT /F1 ${fontSize} Tf 0.12 0.16 0.18 rg 1 0 0 1 ${x} ${y - index * leading} Tm (${ascii(line)}) Tj ET`).join('\n');
};

const pdfTable = (
  x: number,
  yTop: number,
  columns: Array<{ label: string; width: number }>,
  rows: Array<Array<string>>,
) => {
  const headerHeight = 22;
  const rowPadding = 8;
  const lineHeight = 12;
  const body: string[] = [];
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);

  body.push('q');
  body.push('0.925 0.941 0.949 rg');
  body.push(`${x} ${yTop - headerHeight} ${totalWidth} ${headerHeight} re f`);
  body.push('0.769 0.82 0.839 RG');
  body.push('0.8 w');
  body.push(`${x} ${yTop - headerHeight} ${totalWidth} ${headerHeight} re S`);
  body.push('Q');

  let cursorX = x;
  columns.forEach((column) => {
    body.push(`BT /F1-B 8 Tf 0.31 0.35 0.38 rg 1 0 0 1 ${cursorX + 8} ${yTop - 15} Tm (${ascii(column.label)}) Tj ET`);
    cursorX += column.width;
  });

  let cursorY = yTop - headerHeight;
  rows.forEach((row, rowIndex) => {
    const wrappedColumns = row.map((value, index) => {
      const availableChars = Math.max(12, Math.floor((columns[index].width - 16) / 5.4));
      return wrapText(value, availableChars);
    });
    const rowHeight = Math.max(...wrappedColumns.map((lines) => lines.length), 1) * lineHeight + rowPadding * 2;
    body.push('q');
    if (rowIndex % 2 === 0) {
      body.push('0.985 0.988 0.99 rg');
      body.push(`${x} ${cursorY - rowHeight} ${totalWidth} ${rowHeight} re f`);
    }
    body.push('0.85 0.88 0.9 RG');
    body.push('0.8 w');
    body.push(`${x} ${cursorY - rowHeight} ${totalWidth} ${rowHeight} re S`);
    body.push('Q');

    let cellX = x;
    columns.forEach((column, columnIndex) => {
      const cellLines = wrappedColumns[columnIndex];
      const startY = cursorY - 14;
      cellLines.slice(0, 4).forEach((line, lineIndex) => {
        body.push(`BT /F1 ${columnIndex === columns.length - 1 ? 9 : 10} Tf 0.1 0.13 0.15 rg 1 0 0 1 ${cellX + 8} ${startY - lineIndex * lineHeight} Tm (${ascii(line)}) Tj ET`);
      });
      cellX += column.width;
    });

    cursorY -= rowHeight;
  });

  return { content: body.join('\n'), bottomY: cursorY };
};

const pdfSummary = (x: number, y: number, width: number, title: string, summary: string, extraLines: string[] = []) => {
  const height = 110 + extraLines.length * 16;
  const lines: string[] = [];
  lines.push('q');
  lines.push('0.973 0.978 0.982 rg');
  lines.push(`${x} ${y - height} ${width} ${height} re f`);
  lines.push('0.769 0.82 0.839 RG');
  lines.push('0.8 w');
  lines.push(`${x} ${y - height} ${width} ${height} re S`);
  lines.push('Q');
  lines.push(`BT /F1-B 11 Tf 0.08 0.13 0.15 rg 1 0 0 1 ${x + 12} ${y - 20} Tm (${ascii(title)}) Tj ET`);
  lines.push(pdfParagraph(x + 12, y - 38, width - 24, summary, 10, 14));
  extraLines.forEach((line, index) => {
    lines.push(`BT /F1 9 Tf 0.24 0.27 0.3 rg 1 0 0 1 ${x + 12} ${y - 70 - index * 14} Tm (${ascii(line)}) Tj ET`);
  });
  return { content: lines.join('\n'), bottomY: y - height };
};

const pdfFooter = (text: string) =>
  `BT /F1 8 Tf 0.42 0.46 0.5 rg 1 0 0 1 ${margin} ${28} Tm (${ascii(text)}) Tj ET`;

const buildDocumentPdf = (options: PdfOptions) => {
  const sessionsPerPage = 8;
  const pages: string[] = [];
  const sessionPages = chunk(options.sessions, sessionsPerPage);
  const today = dateFormatter.format(new Date());

  sessionPages.forEach((pageSessions, pageIndex) => {
    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === sessionPages.length - 1;
    const page: string[] = [];

    const subtitle = `${options.kind === 'invoice' ? 'Invoice pembiayaan' : 'Report perkembangan'} - dicetak ${today}`;
    page.push(pdfHeader(options.title, options.documentNumber, subtitle));

    if (isFirstPage) {
      const boxTop = pageHeight - 130;
      const boxGap = 10;
      const boxWidth = (contentWidth - boxGap) / 2;
      page.push(pdfBox(margin, boxTop - 84, boxWidth, 84, options.summaryItems[0]?.label || 'Siswa', options.summaryItems[0]?.value || '-'));
      page.push(pdfBox(margin + boxWidth + boxGap, boxTop - 84, boxWidth, 84, options.summaryItems[1]?.label || 'Kontak', options.summaryItems[1]?.value || '-'));
      page.push(pdfBox(margin, boxTop - 182, boxWidth, 84, options.summaryItems[2]?.label || 'Periode', options.summaryItems[2]?.value || '-'));
      page.push(pdfBox(margin + boxWidth + boxGap, boxTop - 182, boxWidth, 84, options.summaryItems[3]?.label || 'Status', options.summaryItems[3]?.value || '-'));
    }

    const tableTop = isFirstPage ? pageHeight - 330 : pageHeight - 136;
    page.push(`BT /F1-B 12 Tf 0.08 0.13 0.15 rg 1 0 0 1 ${margin} ${tableTop + 18} Tm (${ascii(options.kind === 'invoice' ? 'Daftar sesi lunas' : 'Catatan per sesi')}) Tj ET`);

    const tableRows = pageSessions.map((session) => {
      if (options.kind === 'invoice') {
        return [
          formatShortDate(session.date),
          formatTime(session.time),
          session.subject,
          formatMoney(session.price || 0),
        ];
      }

      return [
        formatShortDate(session.date),
        formatTime(session.time),
        session.subject,
        session.note || '-',
      ];
    });

    const tableColumns =
      options.kind === 'invoice'
        ? [
            { label: 'Tanggal', width: 72 },
            { label: 'Waktu', width: 58 },
            { label: 'Sesi', width: 260 },
            { label: 'Nominal', width: 120 },
          ]
        : [
            { label: 'Tanggal', width: 72 },
            { label: 'Waktu', width: 58 },
            { label: 'Sesi', width: 220 },
            { label: 'Catatan', width: 160 },
          ];

    const table = pdfTable(margin, tableTop, tableColumns, tableRows);
    page.push(table.content);

    if (isLastPage) {
      const summaryTop = table.bottomY - 18;
      if (options.kind === 'invoice') {
        page.push(
          pdfSummary(
            margin,
            summaryTop,
            contentWidth,
            options.summaryTitle || 'Ringkasan invoice',
            options.summary || 'Invoice ini tercatat sebagai pembayaran resmi untuk sesi yang dipilih.',
            [
              `${options.totalLabel || 'Total'}: ${options.totalValue || '-'}`,
              `Periode: ${formatDate(options.periodStart)} sampai ${formatDate(options.periodEnd)}`,
            ],
          ).content,
        );
      } else {
        page.push(
          pdfSummary(
            margin,
            summaryTop,
            contentWidth,
            options.summaryTitle || 'Resume report',
            options.summary || 'Report ini terhubung dengan invoice yang telah disimpan.',
            [
              `Periode: ${formatDate(options.periodStart)} sampai ${formatDate(options.periodEnd)}`,
              `Invoice terkait: ${options.documentNumber}`,
            ],
          ).content,
        );
      }
    }

    page.push(pdfFooter(options.footerNote));
    pages.push(page.join('\n'));
  });

  const objects: string[] = [];
  const fontBase = 3;
  const fontBold = 4;

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`);
  objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  pages.forEach((pageContent, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontBase} 0 R /F1-B ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );
    objects.push(`${contentId} 0 obj\n<< /Length ${pageContent.length} >>\nstream\n${pageContent}\nendstream\nendobj\n`);
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
};

export const buildInvoicePdfBlob = (payload: {
  documentNumber: string;
  student: Student;
  sessions: Array<DocumentSession | PdfSession>;
  periodStart: string;
  periodEnd: string;
}) => {
  const sessions = payload.sessions.map((session) => ({
    date: 'session_date' in session ? session.session_date : session.date,
    time: 'session_time' in session ? session.session_time : session.time,
    subject: session.subject,
    note: 'note' in session ? session.note : (session as any).notes,
    price: session.price,
  }));

  const total = sessions.reduce((sum, session) => sum + (session.price || 0), 0);
  return buildDocumentPdf({
    kind: 'invoice',
    title: 'Invoice Pembayaran',
    documentNumber: payload.documentNumber,
    student: payload.student,
    periodStart: payload.periodStart,
    periodEnd: payload.periodEnd,
    sessions,
    summaryItems: [
      { label: 'Nama Siswa', value: payload.student.name },
      { label: 'Kontak', value: payload.student.contact || '-' },
      { label: 'Sekolah / Kelas', value: `${payload.student.school || '-'} / ${payload.student.grade || '-'}` },
      { label: 'Status', value: 'Lunas' },
    ],
    summaryTitle: 'Ringkasan pembayaran',
    summary: 'Invoice ini adalah catatan resmi pembayaran',
    totalLabel: 'Total Tagihan',
    totalValue: formatMoney(total),
    footerNote: 'CerdasIND invoice document',
  });
};

export const buildReportPdfBlob = (payload: {
  documentNumber: string;
  student: Student;
  sessions: Array<DocumentSession | PdfSession>;
  periodStart: string;
  periodEnd: string;
  summary: string;
  invoiceNumber?: string;
}) => {
  const sessions = payload.sessions.map((session) => ({
    date: 'session_date' in session ? session.session_date : session.date,
    time: 'session_time' in session ? session.session_time : session.time,
    subject: session.subject,
    note: 'note' in session ? session.note : (session as any).notes,
  }));

  return buildDocumentPdf({
    kind: 'report',
    title: 'Student Report',
    documentNumber: payload.documentNumber,
    student: payload.student,
    periodStart: payload.periodStart,
    periodEnd: payload.periodEnd,
    sessions,
    summaryItems: [
      { label: 'Nama Siswa', value: payload.student.name },
      { label: 'Kontak', value: payload.student.contact || '-' },
      { label: 'Invoice Terkait', value: payload.invoiceNumber || '-' },
      { label: 'Jumlah Sesi', value: String(sessions.length) },
    ],
    summaryTitle: 'Resume perkembangan',
    summary: payload.summary,
    footerNote: 'CerdasIND report document',
  });
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
