import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, MessageCircle, ReceiptText, RotateCcw, SquareCheckBig } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService, type Session, type Student, type StudentDocument, type DocumentSession } from '../../services/admin.service';
import { buildInvoicePdfBlob as generateInvoicePdfBlob, buildBillingPdfBlob as generateBillingPdfBlob, downloadBlob, type PdfSession } from '../../utils/documentPdf';

type PaidSession = Session;
type InvoiceMode = 'billing' | 'payment';

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const parseDateOnly = (value: string) => {
  if (!value) return null;

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  const normalized = match ? `${match[1]}T00:00:00` : value;
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value: string) => {
  const parsed = parseDateOnly(value);
  return parsed ? dateFormatter.format(parsed) : value;
};

const formatTime = (value: string) => {
  if (!value) return '-';

  const match = value.match(/^(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;

  const isoMatch = value.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}:${isoMatch[2]}`;

  return value.slice(0, 5) || value;
};

const formatMoney = (value: number) => currencyFormatter.format(value || 0);

const normalizeWhatsappNumber = (value: string) => {
  const digits = value.replace(/[^\d+]/g, '');
  const trimmed = digits.replace(/^\+/, '');

  if (!trimmed) return '';
  if (trimmed.startsWith('62')) return trimmed;
  if (trimmed.startsWith('0')) return `62${trimmed.slice(1)}`;
  if (trimmed.startsWith('8')) return `62${trimmed}`;
  return trimmed;
};

const buildMessage = (student: Student, selectedSessions: PaidSession[], mode: InvoiceMode, documentNumber?: string) => {
  const firstDate = selectedSessions[0]?.date ? formatDate(selectedSessions[0].date) : '-';
  const lastDate = selectedSessions[selectedSessions.length - 1]?.date
    ? formatDate(selectedSessions[selectedSessions.length - 1].date)
    : '-';
  const total = selectedSessions.reduce((sum, session) => sum + (session.price || 0), 0);

  const typeName = mode === 'billing' ? 'penagihan' : 'pembayaran';

  return [
    documentNumber ? `Nomor invoice: ${documentNumber}.` : '',
    `Ini adalah invoice ${typeName} dari tanggal ${firstDate} sampai ${lastDate}.`,
    `Nama siswa: ${student.name}.`,
    `Total tagihan: ${formatMoney(total)}.`,
    'Mohon cek file invoice terlampir.',
  ].filter(Boolean).join(' ');
};

const buildInvoicePdfBlob = (
  student: Student,
  selectedSessions: Array<DocumentSession | PdfSession>,
  documentNumber: string,
  periodStart: string,
  periodEnd: string,
) =>
  generateInvoicePdfBlob({
    documentNumber,
    student,
    sessions: selectedSessions,
    periodStart,
    periodEnd,
  });

const buildBillingPdfBlob = (
  student: Student,
  selectedSessions: Array<DocumentSession | PdfSession>,
  documentNumber: string,
  periodStart: string,
  periodEnd: string,
) =>
  generateBillingPdfBlob({
    documentNumber,
    student,
    sessions: selectedSessions,
    periodStart,
    periodEnd,
  });

const Invoice: React.FC = () => {
  const [mode, setMode] = useState<InvoiceMode>('billing');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [sessions, setSessions] = useState<PaidSession[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const pdfUrlRef = useRef('');
  const [savedDocuments, setSavedDocuments] = useState<StudentDocument[]>([]);
  const [lastCreatedDoc, setLastCreatedDoc] = useState<StudentDocument | null>(null);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) || null,
    [selectedStudentId, students],
  );

  const selectedSessions = useMemo(
    () => sessions.filter((session) => selectedSessionIds.includes(session.id)),
    [selectedSessionIds, sessions],
  );

  const totalAmount = useMemo(
    () => selectedSessions.reduce((sum, session) => sum + (session.price || 0), 0),
    [selectedSessions],
  );

  const periodLabel = useMemo(() => {
    if (selectedSessions.length === 0) return '-';

    const sorted = [...selectedSessions].sort((left, right) => {
      const leftDate = parseDateOnly(left.date)?.getTime() || 0;
      const rightDate = parseDateOnly(right.date)?.getTime() || 0;
      return leftDate - rightDate;
    });

    const first = sorted[0]?.date;
    const last = sorted[sorted.length - 1]?.date;

    if (!first || !last) return '-';
    return `${formatDate(first)} sampai ${formatDate(last)}`;
  }, [selectedSessions]);

  useEffect(() => {
    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const data = await adminService.getStudents();
        setStudents(data);
      } catch (error) {
        console.error('Failed to fetch students for invoice', error);
      } finally {
        setLoadingStudents(false);
      }
    };

    void loadStudents();
  }, []);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const data = mode === 'billing' ? await adminService.getBillings() : await adminService.getInvoices();
        setSavedDocuments(data);
      } catch (error) {
        console.error(`Failed to fetch ${mode}s`, error);
      }
    };

    void loadDocuments();
  }, [mode]);

  useEffect(() => {
    const loadSessions = async () => {
      if (!selectedStudentId) {
        setSessions([]);
        setSelectedSessionIds([]);
        return;
      }

      setLoadingSessions(true);
      try {
        const data = await adminService.getSessions({
          studentId: selectedStudentId,
          paymentStatus: mode === 'payment' ? 'paid' : 'pending',
        });
        const filteredSessions = data
          .filter((session) => mode === 'payment' ? session.payment_status === 'paid' : session.payment_status === 'pending')
          .sort((left, right) => {
            const leftDate = parseDateOnly(left.date)?.getTime() || 0;
            const rightDate = parseDateOnly(right.date)?.getTime() || 0;
            if (leftDate !== rightDate) return leftDate - rightDate;
            return (left.time || '').localeCompare(right.time || '');
          });

        setSessions(filteredSessions);
        setSelectedSessionIds(filteredSessions.map((session) => session.id));
      } catch (error) {
        console.error(`Failed to fetch ${mode} sessions for invoice`, error);
        setSessions([]);
        setSelectedSessionIds([]);
      } finally {
        setLoadingSessions(false);
      }
    };

    void loadSessions();
  }, [selectedStudentId, mode]);

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = '';
      }
    };
  }, []);

  const clearGeneratedPdf = () => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = '';
    }
    setPdfUrl('');
  };

  const clearSavedDoc = () => {
    setLastCreatedDoc(null);
  };

  const handleToggleSession = (sessionId: number) => {
    clearGeneratedPdf();
    clearSavedDoc();
    setSelectedSessionIds((current) =>
      current.includes(sessionId) ? current.filter((id) => id !== sessionId) : [...current, sessionId],
    );
  };

  const handleSelectAll = () => {
    clearGeneratedPdf();
    clearSavedDoc();
    setSelectedSessionIds(sessions.map((session) => session.id));
  };

  const handleClearSelection = () => {
    clearGeneratedPdf();
    clearSavedDoc();
    setSelectedSessionIds([]);
  };

  const handleSaveData = async () => {
    if (!selectedStudent) {
      toast.error('Pilih siswa terlebih dahulu.');
      return;
    }

    if (selectedSessions.length === 0) {
      const statusText = mode === 'payment' ? 'lunas' : 'belum lunas';
      toast.error(`Pilih minimal satu sesi yang ${statusText}.`);
      return;
    }

    try {
      const payload = {
        student_id: selectedStudent.id,
        session_ids: selectedSessions.map((session) => session.id),
        message: buildMessage(selectedStudent, selectedSessions, mode),
      };
      const created = mode === 'billing' 
        ? await adminService.createBilling(payload) 
        : await adminService.createInvoice(payload);
      
      setLastCreatedDoc(created);
      setPdfUrl('');
      setSavedDocuments((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      toast.success(`${mode === 'billing' ? 'Billing' : 'Invoice'} berhasil disimpan.`);
    } catch (error) {
      console.error(`Failed to save ${mode} data`, error);
      toast.error(`Gagal menyimpan data ${mode}.`);
    }
  };

  const handleCreatePdf = async () => {
    if (!selectedStudent) {
      toast.error('Pilih siswa terlebih dahulu.');
      return;
    }

    if (!lastCreatedDoc) {
      toast.error('Simpan data terlebih dahulu.');
      return;
    }

    const selectedSnapshots = lastCreatedDoc.sessions || [];
    if (selectedSnapshots.length === 0) {
      toast.error('Data belum memiliki sesi yang tersimpan.');
      return;
    }

    setGenerating(true);
    try {
      const blob = mode === 'billing'
        ? buildBillingPdfBlob(
            selectedStudent,
            selectedSnapshots,
            lastCreatedDoc.document_number,
            lastCreatedDoc.period_start,
            lastCreatedDoc.period_end,
          )
        : buildInvoicePdfBlob(
            selectedStudent,
            selectedSnapshots,
            lastCreatedDoc.document_number,
            lastCreatedDoc.period_start,
            lastCreatedDoc.period_end,
          );
      const nextUrl = URL.createObjectURL(blob);

      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }

      pdfUrlRef.current = nextUrl;
      setPdfUrl(nextUrl);
      window.open(nextUrl, '_blank', 'noopener,noreferrer');

      const prefix = mode === 'billing' ? 'billing' : 'invoice';
      downloadBlob(blob, `${prefix}-${lastCreatedDoc.document_number.replace(/[^\w]+/g, '-').toLowerCase()}.pdf`);
    } catch (error) {
      console.error(`Failed to generate ${mode} PDF`, error);
      toast.error(`Gagal membuat PDF ${mode}.`);
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenWhatsapp = () => {
    if (!selectedStudent) {
      toast.error('Pilih siswa terlebih dahulu.');
      return;
    }

    if (selectedSessions.length === 0) {
      toast.error('Pilih minimal satu sesi.');
      return;
    }

    if (!lastCreatedDoc) {
      toast.error('Simpan data terlebih dahulu agar nomor dokumen tercatat.');
      return;
    }

    const phone = normalizeWhatsappNumber(selectedStudent.contact);
    if (!phone) {
      toast.error('Kontak siswa belum valid untuk WhatsApp.');
      return;
    }

    const message = buildMessage(selectedStudent, selectedSessions, mode, lastCreatedDoc.document_number);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadPastDoc = async (documentId: number) => {
    try {
      const record = mode === 'billing' 
        ? await adminService.getBillingDetail(documentId)
        : await adminService.getInvoiceDetail(documentId);
      
      if (!record) {
        toast.error('Dokumen tidak ditemukan.');
        return;
      }

      const recordStudent = await adminService.getStudentDetail(record.student_id);
      if (!recordStudent) {
        toast.error('Data siswa untuk dokumen ini tidak ditemukan.');
        return;
      }

      const blob = mode === 'billing'
        ? buildBillingPdfBlob(
            recordStudent,
            record.sessions || [],
            record.document_number,
            record.period_start,
            record.period_end,
          )
        : buildInvoicePdfBlob(
            recordStudent,
            record.sessions || [],
            record.document_number,
            record.period_start,
            record.period_end,
          );
      
      const prefix = mode === 'billing' ? 'billing' : 'invoice';
      downloadBlob(blob, `${prefix}-${record.document_number.replace(/[^\w]+/g, '-').toLowerCase()}.pdf`);
    } catch (error) {
      console.error(`Failed to download past ${mode}`, error);
      toast.error(`Gagal mengunduh ${mode} lama.`);
    }
  };

  const docNumberPreview = useMemo(() => {
    if (!selectedStudent) return '-';
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const prefix = mode === 'billing' ? 'BIL' : 'INV';
    return `${prefix}-${datePart}-${String(selectedStudent.id).padStart(4, '0')}`;
  }, [selectedStudent, mode]);

  if (loadingStudents) {
    return <div className="container py-8">Loading...</div>;
  }

  return (
    <div className="container py-8 invoice-page">
      <div className="invoice-hero">
        <div>
          <p className="invoice-kicker">Admin Panel</p>
          <h1 className="text-display">{mode === 'billing' ? 'Invoice Penagihan' : 'Invoice Pembayaran'}</h1>
          <p className="invoice-subtitle">
            {mode === 'billing' 
              ? 'Pilih siswa, centang sesi yang belum lunas, lalu buat PDF penagihan untuk wali murid.' 
              : 'Pilih siswa, centang sesi yang sudah lunas, lalu buat PDF bukti pembayaran.'}
          </p>
        </div>
        <div className="invoice-hero-actions">
          <div className="invoice-stat">
            <span className="invoice-stat-label">Siswa dipilih</span>
            <span className="invoice-stat-value">{selectedStudent ? selectedStudent.name : '-'}</span>
          </div>
          <div className="invoice-stat">
            <span className="invoice-stat-label">{mode === 'billing' ? 'Sesi pending' : 'Sesi lunas'}</span>
            <span className="invoice-stat-value">{selectedSessions.length}</span>
          </div>
          <div className="invoice-stat">
            <span className="invoice-stat-label">Total</span>
            <span className="invoice-stat-value">{formatMoney(totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          className={`btn ${mode === 'billing' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setMode('billing'); clearGeneratedPdf(); clearSavedDoc(); setSelectedStudentId(''); }}
        >
          Mode Penagihan
        </button>
        <button 
          className={`btn ${mode === 'payment' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setMode('payment'); clearGeneratedPdf(); clearSavedDoc(); setSelectedStudentId(''); }}
        >
          Mode Pembayaran
        </button>
      </div>

      <div className="invoice-layout">
        <section className="invoice-panel card-elevated bg-white border-ash-grey shadow-sm">
          <div className="invoice-panel-head">
            <div>
              <p className="invoice-kicker">Pilih Data</p>
              <h2 className="text-heading-sm">Siswa dan sesi yang akan dimasukkan ke {mode === 'billing' ? 'billing' : 'invoice'}</h2>
            </div>
            <div className="invoice-panel-meta">
              <span>{students.length} siswa</span>
              <span>{sessions.length} sesi {mode === 'billing' ? 'pending' : 'lunas'}</span>
            </div>
          </div>

          <div className="invoice-form-grid">
            <div>
              <label className="uppercase tracking-widest text-xs font-bold mb-2">Siswa</label>
              <select
                className="bg-cloud-grey focus:bg-white transition-colors"
                value={selectedStudentId}
                onChange={(event) => {
                  clearGeneratedPdf();
                  clearSavedDoc();
                  setSelectedStudentId(event.target.value ? Number(event.target.value) : '');
                }}
              >
                <option value="">Pilih siswa</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} - {student.contact}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="invoice-divider" />

          <div className="invoice-list-header">
            <div>
              <h3 className="text-heading-sm">Checklist sesi {mode === 'billing' ? 'pending' : 'lunas'}</h3>
              <p className="session-results-caption">
                Hanya sesi dengan status pembayaran <strong>{mode === 'billing' ? 'Pending' : 'Lunas'}</strong> yang muncul di sini.
              </p>
            </div>
            <div className="invoice-list-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={handleSelectAll} disabled={sessions.length === 0}>
                Pilih Semua
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleClearSelection} disabled={sessions.length === 0}>
                Kosongkan
              </button>
            </div>
          </div>

          {loadingSessions ? (
            <div className="invoice-empty-state">Memuat sesi...</div>
          ) : sessions.length === 0 ? (
            <div className="invoice-empty-state">
              Pilih siswa untuk melihat daftar sesi yang {mode === 'billing' ? 'belum lunas' : 'sudah lunas'}.
            </div>
          ) : (
            <div className="invoice-session-list">
              {sessions.map((session) => {
                const checked = selectedSessionIds.includes(session.id);

                return (
                  <label key={session.id} className={`invoice-session-item ${checked ? 'is-checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleSession(session.id)}
                    />
                    <div className="invoice-session-content">
                      <div className="invoice-session-topline">
                        <strong>{formatDate(session.date)}</strong>
                        <span>{formatTime(session.time)}</span>
                      </div>
                      <div className="invoice-session-title">{session.subject || '-'}</div>
                      <div className="invoice-session-footnote">{formatMoney(session.price)}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        <aside className="invoice-side card-elevated bg-white border-ash-grey shadow-sm">
          <div>
            <p className="invoice-kicker">Ringkasan</p>
            <h2 className="text-heading-sm">Preview {mode === 'billing' ? 'billing' : 'invoice'}</h2>
          </div>

          <div className="invoice-summary">
            <div className="invoice-summary-item">
              <span>Nomor Dokumen</span>
              <strong>{lastCreatedDoc?.document_number || docNumberPreview}</strong>
            </div>
            <div className="invoice-summary-item">
              <span>Nama Siswa</span>
              <strong>{selectedStudent?.name || '-'}</strong>
            </div>
            <div className="invoice-summary-item">
              <span>Kontak WhatsApp</span>
              <strong className="font-stk-gerhard">{selectedStudent?.contact || '-'}</strong>
            </div>
            <div className="invoice-summary-item">
              <span>Periode</span>
              <strong>{periodLabel}</strong>
            </div>
            <div className="invoice-summary-item">
              <span>Total Terpilih</span>
              <strong>{formatMoney(totalAmount)}</strong>
            </div>
          </div>

          <div className="invoice-action-stack">
            <button type="button" className="btn btn-primary w-full" onClick={handleSaveData} disabled={generating || selectedSessions.length === 0}>
              <FileDown size={16} />
              Simpan Data
            </button>
            <button type="button" className="btn btn-primary w-full" onClick={handleCreatePdf} disabled={generating || !lastCreatedDoc}>
              <FileDown size={16} />
              {generating ? 'Membuat PDF...' : 'Buat PDF'}
            </button>
            <button type="button" className="btn btn-success w-full" onClick={handleOpenWhatsapp} disabled={!lastCreatedDoc}>
              <MessageCircle size={16} />
              Buka WhatsApp
            </button>
            <button
              type="button"
              className="btn btn-outline w-full"
              onClick={() => {
                clearGeneratedPdf();
                clearSavedDoc();
                setSelectedStudentId('');
              }}
            >
              <RotateCcw size={16} />
              Reset Siswa
            </button>
          </div>

          <div className="invoice-note">
            <ReceiptText size={16} />
            <p>
              File PDF dibuat sementara di browser. Setelah dibuka, unduh file tersebut lalu lampirkan secara manual di WhatsApp.
            </p>
          </div>

          <div className="invoice-footer-card">
            <SquareCheckBig size={18} />
            <div>
              <strong>Template pesan WhatsApp</strong>
              <p>
                <span>Ini adalah invoice {mode === 'billing' ? 'penagihan' : 'pembayaran'} dari tanggal sekian sampai sekian.</span>
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
            <h2 className="text-heading-sm">{mode === 'billing' ? 'Billing' : 'Invoice'} yang sudah disimpan</h2>
          </div>
          <div className="invoice-panel-meta">
            <span>{savedDocuments.length} record</span>
          </div>
        </div>

        <div className="invoice-record-list">
          {savedDocuments.length === 0 ? (
            <div className="invoice-empty-state">Belum ada {mode === 'billing' ? 'billing' : 'invoice'} yang tersimpan.</div>
          ) : (
            savedDocuments.map((record) => (
              <div key={record.id} className="invoice-record-item">
                <div>
                  <strong>{record.document_number}</strong>
                  <p>
                    {record.student_name || '-'} - {formatDate(record.period_start)} sampai {formatDate(record.period_end)}
                  </p>
                </div>
                <div className="invoice-record-meta">
                  <span>{record.session_count} sesi</span>
                  <span>{formatMoney(record.total_amount)}</span>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handleDownloadPastDoc(record.id)}>
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

export default Invoice;
