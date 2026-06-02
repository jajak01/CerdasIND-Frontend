import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminService, type Session, type Student } from '../../services/admin.service';
import { initGoogleLibrary, signInToGoogle, isGoogleAuthenticated, syncSessionToCalendar, deleteSessionFromCalendar } from '../../services/googleCalendar.service';
import { Calendar as CalendarIcon } from 'lucide-react';
import toast from 'react-hot-toast';

type SessionFilters = {
  search: string;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus: string;
};

const initialDraftFilters: SessionFilters = {
  search: '',
  startDate: '',
  endDate: '',
  status: '',
  paymentStatus: '',
};

const formatSessionDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;

  const [, year, monthNumber, day] = match;
  const monthIndex = Number(monthNumber) - 1;
  const month = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(
    new Date(Date.UTC(Number(year), monthIndex, Number(day)))
  );
  return `${day}-${month}-${year}`;
};

const formatSessionTime = (value: string) => {
  if (!value) return '-';

  const hhmm = value.match(/^(\d{2}):(\d{2})/);
  if (hhmm) return `${hhmm[1]}:${hhmm[2]}`;

  const isoTime = value.match(/T(\d{2}):(\d{2})/);
  if (isoTime) return `${isoTime[1]}:${isoTime[2]}`;

  return value;
};

const sessionStatusLabel: Record<Session['status'], string> = {
  scheduled: 'Schedule',
  completed: 'Selesai',
  cancelled: 'Batal',
};

const paymentStatusLabel: Record<Session['payment_status'], string> = {
  pending: 'Pending',
  paid: 'Lunas',
  overdue: 'Overdue',
};

type SessionForm = {
  id?: number;
  student_id: number | '';
  subject: string;
  date: string;
  time: string;
  price: number | '';
  notes: string;
  status: Session['status'];
  payment_status: Session['payment_status'];
  google_event_id?: string;
};

const createEmptySessionForm = (studentId: number | ''): SessionForm => ({
  student_id: studentId,
  subject: '',
  date: '',
  time: '',
  price: 20000,
  notes: '',
  status: 'scheduled',
  payment_status: 'pending',
  google_event_id: '',
});

const toDateInputValue = (value: string) => {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : value.slice(0, 10);
};

const toTimeInputValue = (value: string) => {
  if (!value) return '';

  const hhmm = value.match(/^(\d{2}):(\d{2})/);
  if (hhmm) return `${hhmm[1]}:${hhmm[2]}`;

  const isoTime = value.match(/T(\d{2}):(\d{2})/);
  if (isoTime) return `${isoTime[1]}:${isoTime[2]}`;

  return value.slice(0, 5);
};

const SessionAll: React.FC = () => {
  const [draftFilters, setDraftFilters] = useState<SessionFilters>(initialDraftFilters);
  const [appliedFilters, setAppliedFilters] = useState<SessionFilters>(initialDraftFilters);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentSession, setCurrentSession] = useState<SessionForm>(createEmptySessionForm(''));
  const [showModal, setShowModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    initGoogleLibrary().then(() => {
      setGoogleConnected(isGoogleAuthenticated());
    });
  }, []);

  const handleGoogleConnect = async () => {
    try {
      await signInToGoogle();
      setGoogleConnected(true);
      toast.success('Berhasil terhubung dengan Google Calendar!');
    } catch (err) {
      console.error('Failed to connect Google', err);
      toast.error('Gagal menghubungkan Google Calendar');
    }
  };

  const activeStudents = useMemo(() => students.filter((student) => student.is_active), [students]);

  const fetchSessions = async (query: SessionFilters) => {
    setSearching(true);
    try {
      const params: Record<string, string> = {};
      if (query.search.trim()) params.search = query.search.trim();
      if (query.startDate) params.startDate = query.startDate;
      if (query.endDate) params.endDate = query.endDate;
      if (query.status) params.status = query.status;
      if (query.paymentStatus) params.paymentStatus = query.paymentStatus;

      const data = await adminService.getSessions(params);
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const data = await adminService.getStudents({ active: true });
      setStudents(data);
    } catch (err) {
      console.error('Failed to fetch students', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchSessions(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const activeFilterCount = useMemo(
    () =>
      [appliedFilters.search, appliedFilters.startDate, appliedFilters.endDate, appliedFilters.status, appliedFilters.paymentStatus].filter(
        Boolean
      ).length,
    [appliedFilters]
  );

  const handleFilterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters(draftFilters);
  };

  const handleReset = async () => {
    setDraftFilters(initialDraftFilters);
    setAppliedFilters(initialDraftFilters);
  };

  const closeModal = useCallback(() => {
    if (!showModal || isClosingModal) {
      return;
    }

    setIsClosingModal(true);
    closeTimerRef.current = window.setTimeout(() => {
      setShowModal(false);
      setIsClosingModal(false);
      closeTimerRef.current = null;
    }, 220);
  }, [isClosingModal, showModal]);

  const openNewSessionModal = useCallback((studentId: number | '' = activeStudents[0]?.id ?? '') => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setCurrentSession(createEmptySessionForm(studentId));
    setIsClosingModal(false);
    setShowModal(true);
  }, [activeStudents]);

  const openEditSessionModal = useCallback((session: Session) => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setCurrentSession({
      id: session.id,
      student_id: session.student_id,
      subject: session.subject,
      date: toDateInputValue(session.date),
      time: toTimeInputValue(session.time),
      price: session.price,
      notes: session.notes || '',
      status: session.status,
      payment_status: session.payment_status,
    });
    setIsClosingModal(false);
    setShowModal(true);
  }, []);

  useEffect(() => {
    if (!showModal && !isClosingModal) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeModal, isClosingModal, showModal]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentSession.student_id === '') {
      toast.error('Pilih siswa aktif terlebih dahulu.');
      return;
    }

    const payload = {
      student_id: Number(currentSession.student_id),
      subject: currentSession.subject,
      date: currentSession.date,
      time: currentSession.time,
      price: Number(currentSession.price || 0),
      notes: currentSession.notes,
      status: currentSession.status,
      payment_status: currentSession.payment_status,
      google_event_id: currentSession.google_event_id,
    };

    setSaving(true);
    try {
      if (currentSession.id) {
        await adminService.updateSession(currentSession.id, payload);
        toast.success('Sesi berhasil diperbarui');
      } else {
        await adminService.createSession(payload);
        toast.success('Sesi baru berhasil disimpan');
      }

      await fetchSessions(appliedFilters);
      closeModal();
    } catch {
      toast.error('Gagal menyimpan data sesi');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToCalendar = async (session: Session) => {
    if (!googleConnected) {
      toast.error('Hubungkan ke Google Calendar terlebih dahulu.');
      return;
    }

    setSaving(true);
    try {
      const googleEventId = await syncSessionToCalendar({
        subject: session.subject,
        date: toDateInputValue(session.date),
        time: toTimeInputValue(session.time),
        notes: session.notes,
        student_name: session.student_name,
        google_event_id: session.google_event_id,
        status: session.status
      });

      if (googleEventId && googleEventId !== session.google_event_id) {
        await adminService.updateSession(session.id, {
          student_id: session.student_id,
          subject: session.subject,
          date: toDateInputValue(session.date),
          time: toTimeInputValue(session.time),
          price: session.price,
          notes: session.notes || '',
          status: session.status,
          payment_status: session.payment_status,
          google_event_id: googleEventId
        });
        await fetchSessions(appliedFilters);
      }
      toast.success('Berhasil sinkronisasi ke Google Calendar');
    } catch (err) {
      console.error('Sync failed', err);
      toast.error('Gagal sinkronisasi ke Google Calendar');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncAllToCalendar = async () => {
    if (!googleConnected) {
      toast.error('Hubungkan ke Google Calendar terlebih dahulu.');
      return;
    }

    const unsyncedSessions = sessions.filter(s => s.status !== 'cancelled');
    if (unsyncedSessions.length === 0) {
      toast.error('Tidak ada sesi yang perlu disinkronisasi.');
      return;
    }

    if (!confirm(`Ingin sinkronisasi ${unsyncedSessions.length} sesi ke Google Calendar?`)) return;

    setSaving(true);
    let successCount = 0;
    try {
      for (const session of unsyncedSessions) {
        try {
          const googleEventId = await syncSessionToCalendar({
            subject: session.subject,
            date: toDateInputValue(session.date),
            time: toTimeInputValue(session.time),
            notes: session.notes,
            student_name: session.student_name,
            google_event_id: session.google_event_id,
            status: session.status
          });

          if (googleEventId && googleEventId !== session.google_event_id) {
            await adminService.updateSession(session.id, {
              student_id: session.student_id,
              subject: session.subject,
              date: toDateInputValue(session.date),
              time: toTimeInputValue(session.time),
              price: session.price,
              notes: session.notes || '',
              status: session.status,
              payment_status: session.payment_status,
              google_event_id: googleEventId
            });
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to sync session ${session.id}`, err);
        }
      }
      await fetchSessions(appliedFilters);
      toast.success(`Berhasil sinkronisasi ${successCount} sesi ke Google Calendar`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sessionId: number) => {
    if (!confirm('Yakin ingin menghapus sesi ini?')) return;

    const sessionToDelete = sessions.find(s => s.id === sessionId);

    try {
      await adminService.deleteSession(sessionId);
      toast.success('Sesi berhasil dihapus');
      
      if (googleConnected && sessionToDelete?.google_event_id) {
        await deleteSessionFromCalendar(sessionToDelete.google_event_id);
      }

      await fetchSessions(appliedFilters);
    } catch {
      toast.error('Gagal menghapus sesi');
    }
  };

  if (loading || loadingStudents) return <div className="container py-8">Loading...</div>;

  return (
    <div className="container py-6 md:py-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="session-page-head">
        <div>
          <h1 className="text-display">Semua Sesi</h1>
        </div>
      </div>

      <div className="session-page-actions flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          className={`btn flex gap-2 items-center ${googleConnected ? 'btn-success' : 'btn-outline'} w-full sm:w-auto`}
          onClick={handleGoogleConnect}
        >
          <CalendarIcon size={18} />
          {googleConnected ? 'Terhubung ke Google' : 'Hubungkan Google Calendar'}
        </button>
        {googleConnected && sessions.length > 0 && (
          <button
            type="button"
            className="btn btn-outline flex gap-2 items-center w-full sm:w-auto"
            onClick={handleSyncAllToCalendar}
            disabled={saving}
          >
            <CalendarIcon size={18} />
            Sinkron Semua ke Google
          </button>
        )}
        <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => openNewSessionModal()}>
          Tambah Sesi Baru
        </button>
      </div>

      <form onSubmit={handleFilterSubmit} className="session-filter-shell card-elevated bg-white border-ash-grey shadow-sm overflow-hidden">
        <div className="session-filter-toolbar">
          <div className="max-w-3xl">
            <p className="session-kicker">Filter Sesi</p>
            <h2 className="text-heading-sm">Cari berdasarkan nama, tanggal, status sesi, dan pembayaran</h2>
            <p className="session-filter-caption session-filter-caption-soft">
              Draft filter bisa diubah bebas. Data hanya diperbarui saat tombol terapkan ditekan.
            </p>
          </div>
          <div className="session-filter-meta session-filter-meta-soft">
            <span>{sessions.length} data</span>
            <span>{activeFilterCount} filter aktif</span>
          </div>
        </div>

        <div className="session-divider" />

        <div className="session-filter-body">
          <div className="session-filter-grid">
            <div className="session-filter-field session-filter-field-wide">
              <label className="uppercase tracking-widest text-xs font-bold mb-2">Nama Siswa</label>
              <input
                type="text"
                className="bg-cloud-grey focus:bg-white transition-colors"
                value={draftFilters.search}
                onChange={e => setDraftFilters({ ...draftFilters, search: e.target.value })}
                placeholder="Cari nama atau kontak"
              />
            </div>
            <div className="session-filter-field">
              <label className="uppercase tracking-widest text-xs font-bold mb-2">Dari Tanggal</label>
              <input
                type="date"
                className="bg-cloud-grey focus:bg-white transition-colors"
                value={draftFilters.startDate}
                onChange={e => setDraftFilters({ ...draftFilters, startDate: e.target.value })}
              />
            </div>
            <div className="session-filter-field">
              <label className="uppercase tracking-widest text-xs font-bold mb-2">Sampai Tanggal</label>
              <input
                type="date"
                className="bg-cloud-grey focus:bg-white transition-colors"
                value={draftFilters.endDate}
                onChange={e => setDraftFilters({ ...draftFilters, endDate: e.target.value })}
              />
            </div>
            <div className="session-filter-field">
              <label className="uppercase tracking-widest text-xs font-bold mb-2">Status Sesi</label>
              <select
                className="bg-cloud-grey focus:bg-white transition-colors"
                value={draftFilters.status}
                onChange={e => setDraftFilters({ ...draftFilters, status: e.target.value })}
              >
                <option value="">Semua</option>
                <option value="scheduled">Schedule</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Batal</option>
              </select>
            </div>
            <div className="session-filter-field">
              <label className="uppercase tracking-widest text-xs font-bold mb-2">Pembayaran</label>
              <select
                className="bg-cloud-grey focus:bg-white transition-colors"
                value={draftFilters.paymentStatus}
                onChange={e => setDraftFilters({ ...draftFilters, paymentStatus: e.target.value })}
              >
                <option value="">Semua</option>
                <option value="pending">Pending</option>
                <option value="paid">Lunas</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="session-filter-actions">
            <button type="button" className="btn btn-outline" onClick={handleReset}>
              Reset
            </button>
            <button type="submit" className="btn btn-primary" disabled={searching}>
              {searching ? 'Mencari...' : 'Update Data'}
            </button>
          </div>
        </div>
      </form>

      <div className="card-elevated bg-white border-ash-grey shadow-sm overflow-hidden">
        <div className="session-results-head">
          <div className="max-w-2xl">
            <p className="session-kicker">Hasil Sesi</p>
            <h2 className="text-heading-sm">Daftar sesi yang cocok dengan filter</h2>
            <p className="session-results-caption">
              Klik edit untuk membuka form sesi dan lanjutkan perubahan detailnya.
            </p>
          </div>
          <div className="session-results-meta text-sm text-muted">
            <span>{sessions.length} data</span>
            <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-steel-grey" />
            <span>{activeFilterCount} filter aktif</span>
          </div>
        </div>

        <div className="session-divider" />

        <div className="session-results-body">
          {sessions.map(session => (
            <div key={session.id} className="rounded-2xl border border-ash-grey bg-paper-white p-4 md:p-5 shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-4 flex-1 min-w-0">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-body">{session.student_name || '-'}</h3>
                    <p className="text-sm text-muted">
                      {formatSessionDate(session.date)} | {formatSessionTime(session.time)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-pill bg-lavender-haze">{session.subject}</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        session.status === 'completed'
                          ? 'bg-jade-green text-onyx-black'
                          : session.status === 'scheduled'
                            ? 'bg-dusk-blue text-onyx-black'
                            : 'bg-error/20 text-error'
                      }`}
                    >
                      {sessionStatusLabel[session.status]}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        session.payment_status === 'paid'
                          ? 'bg-jade-green text-onyx-black'
                          : session.payment_status === 'pending'
                            ? 'bg-lemon-zest text-onyx-black border border-onyx-black/20'
                            : 'bg-error/20 text-error'
                      }`}
                    >
                      {paymentStatusLabel[session.payment_status]}
                    </span>
                  </div>

                  <div className="border-t border-ash-grey pt-4">
                    <p className="text-xs uppercase tracking-widest font-bold text-muted mb-2">Catatan Sesi</p>
                    <p className="text-sm text-muted leading-relaxed max-w-3xl">
                      {session.notes && session.notes.trim() !== '' ? session.notes : 'Belum ada catatan.'}
                    </p>
                  </div>
                </div>

                <div className="w-full xl:w-auto xl:min-w-[240px] border-t xl:border-t-0 xl:border-l border-ash-grey pt-4 xl:pt-0 xl:pl-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm w-full"
                      onClick={() => openEditSessionModal(session)}
                    >
                      Edit Detail
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm w-full"
                      onClick={() => openNewSessionModal(session.student_id)}
                    >
                      Buka Form
                    </button>
                    {googleConnected && (
                      <button
                        type="button"
                        className={`btn btn-sm w-full flex gap-2 items-center justify-center ${session.google_event_id ? 'btn-ghost text-jade-green' : 'btn-success'}`}
                        onClick={() => handleSyncToCalendar(session)}
                        disabled={saving}
                      >
                        <CalendarIcon size={14} />
                        {session.google_event_id ? 'Update di Google' : 'Sync ke Google'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-error font-bold hover:underline text-xs uppercase tracking-widest text-center mt-2"
                      onClick={() => handleDelete(session.id)}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center py-12 md:py-16 bg-cloud-grey/30 rounded-2xl border border-dashed border-ash-grey">
              <p className="text-lg text-body font-semibold">Tidak ada sesi yang cocok</p>
              <p className="text-muted mt-2 max-w-md mx-auto">Coba ubah filter atau reset untuk melihat data lain.</p>
            </div>
          )}
        </div>
      </div>

      {(showModal || isClosingModal) && (
        <div
          className={`session-modal-overlay ${isClosingModal ? 'is-closing' : 'is-open'}`}
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="session-modal-panel card-elevated bg-white w-full max-w-4xl border-none shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="session-modal-header">
              <div>
                <p className="session-kicker">Form Sesi</p>
                <h2 id="session-form-title" className="text-heading-sm">
                  {currentSession.id ? 'Edit Sesi' : 'Tambah Sesi'}
                </h2>
                <p className="session-subtitle session-modal-subtitle">
                  {activeStudents.length > 0
                    ? 'Pilih siswa aktif, lalu lengkapi detail sesi di form pop-up ini.'
                    : 'Tidak ada siswa aktif. Aktifkan siswa dulu untuk membuat sesi.'}
                </p>
              </div>
              <button type="button" className="session-modal-close" onClick={closeModal}>
                Tutup
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="uppercase tracking-widest text-xs font-bold mb-2">Siswa</label>
                  <select
                    className="bg-cloud-grey focus:bg-white transition-colors"
                    value={currentSession.student_id}
                    onChange={(e) =>
                      setCurrentSession({
                        ...currentSession,
                        student_id: e.target.value ? Number(e.target.value) : '',
                      })
                    }
                    required
                    disabled={activeStudents.length === 0}
                  >
                    <option value="">Pilih Siswa Aktif</option>
                    {activeStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="uppercase tracking-widest text-xs font-bold mb-2">Mata Pelajaran</label>
                  <input
                    type="text"
                    className="bg-cloud-grey focus:bg-white transition-colors"
                    value={currentSession.subject}
                    onChange={(e) => setCurrentSession({ ...currentSession, subject: e.target.value })}
                    placeholder="Contoh: Matematika"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="uppercase tracking-widest text-xs font-bold mb-2">Tanggal</label>
                  <input
                    type="date"
                    className="bg-cloud-grey focus:bg-white transition-colors"
                    value={currentSession.date}
                    onChange={(e) => setCurrentSession({ ...currentSession, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="uppercase tracking-widest text-xs font-bold mb-2">Waktu</label>
                  <input
                    type="time"
                    className="bg-cloud-grey focus:bg-white transition-colors"
                    value={currentSession.time}
                    onChange={(e) => setCurrentSession({ ...currentSession, time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="uppercase tracking-widest text-xs font-bold mb-2">Harga Sesi</label>
                  <input
                    type="number"
                    className="bg-cloud-grey focus:bg-white transition-colors"
                    value={currentSession.price}
                    onChange={(e) => setCurrentSession({ ...currentSession, price: Number(e.target.value) })}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="uppercase tracking-widest text-xs font-bold mb-2">Status Sesi</label>
                  <select
                    className="bg-cloud-grey focus:bg-white transition-colors"
                    value={currentSession.status}
                    onChange={(e) => setCurrentSession({ ...currentSession, status: e.target.value as Session['status'] })}
                  >
                    <option value="scheduled">Schedule</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Batal</option>
                  </select>
                </div>
                <div>
                  <label className="uppercase tracking-widest text-xs font-bold mb-2">Status Pembayaran</label>
                  <select
                    className="bg-cloud-grey focus:bg-white transition-colors"
                    value={currentSession.payment_status}
                    onChange={(e) =>
                      setCurrentSession({
                        ...currentSession,
                        payment_status: e.target.value as Session['payment_status'],
                      })
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Lunas</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="uppercase tracking-widest text-xs font-bold mb-2">Catatan Sesi</label>
                <textarea
                  className="bg-cloud-grey focus:bg-white transition-colors h-28"
                  value={currentSession.notes}
                  onChange={(e) => setCurrentSession({ ...currentSession, notes: e.target.value })}
                  placeholder="Tulis ringkasan materi, progres, atau catatan pembayaran..."
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 border-t border-ash-grey">
                <button type="button" className="btn btn-outline w-full sm:w-auto" onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={saving || activeStudents.length === 0}>
                  {saving ? 'Menyimpan...' : currentSession.id ? 'Update Sesi' : 'Simpan Sesi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionAll;
