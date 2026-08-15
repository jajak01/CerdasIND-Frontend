import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, MessageCircle, NotebookPen, RotateCcw, SquareCheckBig } from 'lucide-react';
import { adminService, type DocumentSession, type Student, type StudentDocument } from '../../services/admin.service';
import { buildReportPdfBlob as generateReportPdfBlob, downloadBlob, getSessionNote } from '../../utils/documentPdf';

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

const parseDateOnly = (value: string) => {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})/);
  const normalized = match ? `${match[1]}T00:00:00` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value: string) => {
  const parsed = parseDateOnly(value);
  return parsed ? dateFormatter.format(parsed) : value;
};

const formatDateShort = (value: string) => {
  const parsed = parseDateOnly(value);
  return parsed ? shortDateFormatter.format(parsed) : value;
};

const formatTime = (value: string) => {
  const match = value?.match(/^(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;

  const isoMatch = value?.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}:${isoMatch[2]}`;

  return value?.slice(0, 5) || '-';
};

const normalizeWhatsappNumber = (value: string) => {
  const digits = value.replace(/[^\d+]/g, '');
  const trimmed = digits.replace(/^\+/, '');

  if (!trimmed) return '';
  if (trimmed.startsWith('62')) return trimmed;
  if (trimmed.startsWith('0')) return `62${trimmed.slice(1)}`;
  if (trimmed.startsWith('8')) return `62${trimmed}`;
  return trimmed;
};

const buildReportMessage = (student: Student, reportNumber: string, summary: string) =>
  [
    `Nomor report: ${reportNumber}.`,
    `Laporan perkembangan untuk ${student.name}.`,
    summary ? `Resume: ${summary}.` : '',
    'Mohon cek file report terlampir.',
  ].filter(Boolean).join(' ');

// The backend snapshot of a session's "catatan" (`note`) is empty on older
// deployments. Recover it from the live session list (`notes`) so the report
// page and its PDF always show the catatan even when the backend doesn't.
const buildSessionNoteMap = (sessions: Array<{ id: number; notes?: string }>): Record<number, string> => {
  const map: Record<number, string> = {};
  sessions.forEach((session) => {
    if (session.notes) map[session.id] = session.notes;
  });
  return map;
};

const enrichDocumentSessions = (
  sessions: DocumentSession[] | undefined,
  noteMap: Record<number, string>,
): DocumentSession[] =>
  (sessions || []).map((session) => ({
    ...session,
    note: session.note?.trim() || (session.session_id != null ? noteMap[session.session_id] || '' : ''),
  }));

const buildReportPdfBlob = (
  student: Student,
  report: StudentDocument,
  summary: string,
  invoiceNumber?: string,
  sessions?: DocumentSession[],
) =>
  generateReportPdfBlob({
    documentNumber: report.document_number,
    student,
    sessions: sessions || report.sessions || [],
    periodStart: report.period_start,
    periodEnd: report.period_end,
    summary,
    invoiceNumber,
  });

const Report: React.FC = () => {
  const [invoices, setInvoices] = useState<StudentDocument[]>([]);
  const [reports, setReports] = useState<StudentDocument[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | ''>('');
  const [selectedInvoice, setSelectedInvoice] = useState<StudentDocument | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const pdfUrlRef = useRef('');
  const [savedReports, setSavedReports] = useState<StudentDocument[]>([]);
  const [lastCreatedReport, setLastCreatedReport] = useState<StudentDocument | null>(null);
  const [sessionNotes, setSessionNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      try {
        const [invoiceData, reportData] = await Promise.all([adminService.getInvoices(), adminService.getReports()]);
        setInvoices(invoiceData);
        setReports(reportData);
        setSavedReports(reportData);
      } catch (error) {
        console.error('Failed to load report records', error);
      } finally {
        setLoading(false);
      }
    };

    void loadRecords();
  }, []);

  useEffect(() => {
    const loadSelectedInvoice = async () => {
      if (!selectedInvoiceId) {
        setSelectedInvoice(null);
        setStudent(null);
        setSessionNotes({});
        return;
      }

      setLoadingInvoice(true);
      try {
        const invoice = await adminService.getInvoiceDetail(selectedInvoiceId);
        setSelectedInvoice(invoice);
        if (invoice) {
          const studentDetail = await adminService.getStudentDetail(invoice.student_id);
          setStudent(studentDetail);
          if (studentDetail) {
            const sessionList = await adminService.getSessions({ studentId: studentDetail.id });
            setSessionNotes(buildSessionNoteMap(sessionList));
          }
        } else {
          setStudent(null);
          setSessionNotes({});
        }
      } catch (error) {
        console.error('Failed to fetch invoice detail for report', error);
        setSelectedInvoice(null);
        setStudent(null);
        setSessionNotes({});
      } finally {
        setLoadingInvoice(false);
      }
    };

    void loadSelectedInvoice();
  }, [selectedInvoiceId]);

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = '';
      }
    };
  }, []);

  const clearGeneratedPdf = useCallback(() => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = '';
    }
    setPdfUrl('');
  }, []);

  const clearSavedReport = useCallback(() => {
    setLastCreatedReport(null);
  }, []);

  const handleSaveData = async () => {
    if (!selectedInvoice || !student) {
      alert('Pilih invoice terlebih dahulu.');
      return;
    }

    if (!summary.trim()) {
      alert('Isi resume manual terlebih dahulu.');
      return;
    }

    try {
      const payload = {
        student_id: student.id,
        session_ids: selectedInvoice.sessions?.map((session) => session.session_id).filter((id): id is number => typeof id === 'number') || [],
        linked_invoice_id: selectedInvoice.id,
        summary: summary.trim(),
      };
      const created = await adminService.createReport(payload);
      setLastCreatedReport(created);
      setPdfUrl('');
      setSavedReports((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    } catch (error) {
      console.error('Failed to save report data', error);
      alert('Gagal menyimpan report.');
    }
  };

  const handleCreatePdf = async () => {
    if (!selectedInvoice || !student) {
      alert('Pilih invoice terlebih dahulu.');
      return;
    }
    if (!lastCreatedReport) {
      alert('Simpan data report terlebih dahulu.');
      return;
    }

    const reportSessions = lastCreatedReport.sessions || [];
    if (reportSessions.length === 0) {
      alert('Data report belum memiliki sesi yang tersimpan.');
      return;
    }

    setGenerating(true);
    try {
      const blob = buildReportPdfBlob(student, lastCreatedReport, summary.trim(), selectedInvoice.document_number, enrichedInvoiceSessions);
      const nextUrl = URL.createObjectURL(blob);

      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }

      pdfUrlRef.current = nextUrl;
      setPdfUrl(nextUrl);
      window.open(nextUrl, '_blank', 'noopener,noreferrer');

      downloadBlob(blob, `report-${lastCreatedReport.document_number.replace(/[^\w]+/g, '-').toLowerCase()}.pdf`);
    } catch (error) {
      console.error('Failed to generate report PDF', error);
      alert('Gagal membuat report PDF.');
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenWhatsapp = () => {
    if (!selectedInvoice || !student) {
      alert('Pilih invoice terlebih dahulu.');
      return;
    }
    if (!lastCreatedReport) {
      alert('Simpan report terlebih dahulu agar nomor report tercatat.');
      return;
    }

    const phone = normalizeWhatsappNumber(student.contact);
    if (!phone) {
      alert('Kontak siswa belum valid untuk WhatsApp.');
      return;
    }

    const message = buildReportMessage(student, lastCreatedReport.document_number, summary.trim());
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadPastReport = async (documentId: number) => {
    try {
      const record = await adminService.getReportDetail(documentId);
      if (!record) {
        alert('Report tidak ditemukan.');
        return;
      }

      const linkedInvoice = record.linked_invoice_id ? await adminService.getInvoiceDetail(record.linked_invoice_id) : null;
      const recordStudent = await adminService.getStudentDetail(record.student_id);
      if (!recordStudent) {
        alert('Data siswa untuk report ini tidak ditemukan.');
        return;
      }

      const sessionList = await adminService.getSessions({ studentId: recordStudent.id });
      const enrichedSessions = enrichDocumentSessions(record.sessions, buildSessionNoteMap(sessionList));

      const blob = buildReportPdfBlob(
        recordStudent,
        record,
        record.summary || '',
        linkedInvoice?.document_number || record.linked_invoice_number || '-',
        enrichedSessions,
      );
      downloadBlob(blob, `report-${record.document_number.replace(/[^\w]+/g, '-').toLowerCase()}.pdf`);
    } catch (error) {
      console.error('Failed to download past report', error);
      alert('Gagal mengunduh report lama.');
    }
  };

  const invoiceLabel = useMemo(() => {
    if (!selectedInvoice) return '-';
    return `${selectedInvoice.document_number} - ${selectedInvoice.student_name || '-'}`;
  }, [selectedInvoice]);

  const enrichedInvoiceSessions = useMemo(
    () => enrichDocumentSessions(selectedInvoice?.sessions, sessionNotes),
    [selectedInvoice, sessionNotes],
  );

  if (loading) {
    return <div className="container py-8">Loading...</div>;
  }

  return (
    <div className="container py-8 invoice-page">
      <div className="invoice-hero">
        <div>
          <p className="invoice-kicker">Admin Panel</p>
          <h1 className="text-display">Student Report</h1>
          <p className="invoice-subtitle">
            Pilih invoice yang sudah lunas, tulis resume perkembangan, lalu simpan report yang terhubung ke accounting record.
          </p>
        </div>
        <div className="invoice-hero-actions">
          <div className="invoice-stat">
            <span className="invoice-stat-label">Invoice aktif</span>
            <span className="invoice-stat-value">{invoiceLabel}</span>
          </div>
          <div className="invoice-stat">
            <span className="invoice-stat-label">Report tersimpan</span>
            <span className="invoice-stat-value">{reports.length}</span>
          </div>
        </div>
      </div>

      <div className="invoice-layout">
        <section className="invoice-panel card-elevated bg-white border-ash-grey shadow-sm">
          <div className="invoice-panel-head">
            <div>
              <p className="invoice-kicker">Pilih Invoice</p>
              <h2 className="text-heading-sm">Report dibuat dari invoice yang sudah disimpan</h2>
            </div>
            <div className="invoice-panel-meta">
              <span>{invoices.length} invoice</span>
            </div>
          </div>

          <div className="invoice-form-grid">
            <div>
              <label className="uppercase tracking-widest text-xs font-bold mb-2">Invoice</label>
              <select
                className="bg-cloud-grey focus:bg-white transition-colors"
                value={selectedInvoiceId}
                onChange={(event) => {
                  clearGeneratedPdf();
                  clearSavedReport();
                  setSelectedInvoiceId(event.target.value ? Number(event.target.value) : '');
                }}
              >
                <option value="">Pilih invoice lunas</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.document_number} - {invoice.student_name}
                  </option>
                ))}
              </select>
            </div>

            {loadingInvoice && <div className="invoice-empty-state">Memuat detail invoice...</div>}

            {selectedInvoice && student && (
              <div className="invoice-summary">
                <div className="invoice-summary-item">
                  <span>Nama Siswa</span>
                  <strong>{student.name}</strong>
                </div>
                <div className="invoice-summary-item">
                  <span>Periode</span>
                  <strong>{formatDate(selectedInvoice.period_start)} sampai {formatDate(selectedInvoice.period_end)}</strong>
                </div>
                <div className="invoice-summary-item">
                  <span>Jumlah Sesi</span>
                  <strong>{selectedInvoice.session_count}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="invoice-divider" />

          <div className="invoice-list-header">
            <div>
              <h3 className="text-heading-sm">Catatan Sesi</h3>
              <p className="session-results-caption">Report ini menampilkan catatan per sesi dan satu resume manual.</p>
            </div>
          </div>

          {enrichedInvoiceSessions.length ? (
            <div className="invoice-session-list">
              {enrichedInvoiceSessions.map((session, index) => (
                <div key={session.id ?? `${session.session_date}-${session.session_time}-${index}`} className="invoice-session-item is-checked">
                  <div className="invoice-session-content">
                    <div className="invoice-session-topline">
                      <strong>{formatDateShort(session.session_date)}</strong>
                      <span>{formatTime(session.session_time)}</span>
                    </div>
                    <div className="invoice-session-title">{session.subject || '-'}</div>
                    <div className="invoice-session-footnote">Catatan: {getSessionNote(session) || '-'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="invoice-empty-state">Pilih invoice untuk melihat catatan sesi.</div>
          )}
        </section>

        <aside className="invoice-side card-elevated bg-white border-ash-grey shadow-sm">
          <div>
            <p className="invoice-kicker">Resume</p>
            <h2 className="text-heading-sm">Ringkasan perkembangan</h2>
          </div>

          <div>
            <label className="uppercase tracking-widest text-xs font-bold mb-2">Resume Manual</label>
            <textarea
              className="bg-cloud-grey focus:bg-white transition-colors h-40"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Tuliskan resume perkembangan siswa, sikap, pencapaian, atau perhatian khusus..."
            />
          </div>

          <div className="invoice-action-stack">
            <button type="button" className="btn btn-primary w-full" onClick={handleSaveData} disabled={generating || !selectedInvoice}>
              <FileDown size={16} />
              Simpan Data
            </button>
            <button type="button" className="btn btn-primary w-full" onClick={handleCreatePdf} disabled={generating || !lastCreatedReport}>
              <FileDown size={16} />
              {generating ? 'Membuat PDF...' : 'Buat PDF'}
            </button>
            <button type="button" className="btn btn-success w-full" onClick={handleOpenWhatsapp} disabled={!lastCreatedReport}>
              <MessageCircle size={16} />
              Buka WhatsApp
            </button>
            <button type="button" className="btn btn-outline w-full" onClick={() => setSummary('')}>
              <RotateCcw size={16} />
              Reset Resume
            </button>
          </div>

          <div className="invoice-note">
            <NotebookPen size={16} />
            <p>
              Report dibuat dari invoice yang sudah tersimpan agar catatan perkembangan tetap terhubung dengan pembayaran.
            </p>
          </div>

          <div className="invoice-footer-card">
            <SquareCheckBig size={18} />
            <div>
              <strong>Template pesan WhatsApp</strong>
              <p>
                <span>Nomor report dan resume akan ikut tercantum saat report disimpan.</span>
              </p>
            </div>
          </div>

          {pdfUrl && (
            <a className="invoice-pdf-link" href={pdfUrl} target="_blank" rel="noreferrer">
              Buka PDF yang terakhir dibuat
            </a>
          )}
        </aside>
      </div>

      <div className="invoice-panel card-elevated bg-white border-ash-grey shadow-sm">
        <div className="invoice-panel-head">
          <div>
            <p className="invoice-kicker">Rekaman</p>
            <h2 className="text-heading-sm">Report yang sudah disimpan</h2>
          </div>
          <div className="invoice-panel-meta">
            <span>{savedReports.length} record</span>
          </div>
        </div>

        <div className="invoice-record-list">
          {savedReports.length === 0 ? (
            <div className="invoice-empty-state">Belum ada report yang tersimpan.</div>
          ) : (
            savedReports.map((record) => (
              <div key={record.id} className="invoice-record-item">
                <div>
                  <strong>{record.document_number}</strong>
                  <p>
                    {record.student_name || '-'} - {formatDate(record.period_start)} sampai {formatDate(record.period_end)}
                  </p>
                </div>
                <div className="invoice-record-meta">
                  <span>{record.session_count} sesi</span>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handleDownloadPastReport(record.id)}>
                    Unduh PDF
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Report;
