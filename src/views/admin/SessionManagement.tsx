import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminService, type Session, type Student } from '../../services/admin.service';

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
});

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

const formatSessionTime = (value: string) => {
  const normalized = toTimeInputValue(value);
  return normalized || '-';
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

const parseId = (value: string | null) => {
  if (!value) return null;
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

const SessionManagement: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [currentSession, setCurrentSession] = useState<SessionForm>(createEmptySessionForm(''));
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingSessionId, setUpdatingSessionId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editNoteValue, setEditNoteValue] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [isClosingFormModal, setIsClosingFormModal] = useState(false);
  const pendingSessionIdRef = useRef<number | null>(null);
  const closeFormTimerRef = useRef<number | null>(null);

  const queryStudentId = parseId(searchParams.get('studentId'));
  const querySessionId = parseId(searchParams.get('sessionId'));
  const activeStudents = useMemo(() => students.filter(student => student.is_active), [students]);
  const selectedStudent = activeStudents.find(student => student.id === selectedStudentId);
  const autoOpenFormRef = useRef(Boolean(queryStudentId || querySessionId));

  const fetchStudents = async () => {
    try {
      const data = await adminService.getStudents({ active: true });
      setStudents(data);
    } catch (err) {
      console.error('Failed to fetch students', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchSessions = async (studentId: number) => {
    setLoadingSessions(true);
    try {
      const data = await adminService.getSessions({ studentId });
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const applySessionToForm = (session: Session) => {
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
  };

  const buildUpdatePayload = (session: Session, patch: Partial<SessionForm>) => ({
    student_id: patch.student_id === undefined ? session.student_id : Number(patch.student_id),
    subject: patch.subject ?? session.subject,
    date: patch.date ?? toDateInputValue(session.date),
    time: patch.time ?? toTimeInputValue(session.time),
    price: Number(patch.price ?? session.price),
    notes: patch.notes ?? session.notes ?? '',
    status: patch.status ?? session.status,
    payment_status: patch.payment_status ?? session.payment_status,
  });

  const refreshSelectedFormIfNeeded = (sessionId: number, patch: Partial<SessionForm>) => {
    if (currentSession.id !== sessionId) return;

    setCurrentSession(prev => ({
      ...prev,
      ...patch,
      id: sessionId,
      student_id: patch.student_id ?? prev.student_id,
      subject: patch.subject ?? prev.subject,
      date: patch.date ?? prev.date,
      time: patch.time ?? prev.time,
      price: patch.price ?? prev.price,
      notes: patch.notes ?? prev.notes,
      status: patch.status ?? prev.status,
      payment_status: patch.payment_status ?? prev.payment_status,
    }));
  };

  const commitSessionPatch = async (session: Session, patch: Partial<SessionForm>) => {
    setUpdatingSessionId(session.id);
    try {
      const payload = buildUpdatePayload(session, patch);
      await adminService.updateSession(session.id, payload);
      await fetchSessions(session.student_id);
      refreshSelectedFormIfNeeded(session.id, patch);
      if (patch.notes !== undefined) {
        setEditingNoteId(null);
        setEditNoteValue('');
      }
    } catch (err) {
      alert('Gagal mengupdate sesi');
    } finally {
      setUpdatingSessionId(null);
    }
  };

  const closeFormModal = useCallback(() => {
    if (!showFormModal || isClosingFormModal) {
      return;
    }

    setIsClosingFormModal(true);
    closeFormTimerRef.current = window.setTimeout(() => {
      setShowFormModal(false);
      setIsClosingFormModal(false);
      closeFormTimerRef.current = null;
    }, 220);
  }, [isClosingFormModal, showFormModal]);

  const openNewFormModal = useCallback((studentId: number | '' = selectedStudentId) => {
    if (closeFormTimerRef.current !== null) {
      window.clearTimeout(closeFormTimerRef.current);
      closeFormTimerRef.current = null;
    }

    setCurrentSession(createEmptySessionForm(studentId));
    setEditingNoteId(null);
    setEditNoteValue('');
    setIsClosingFormModal(false);
    setShowFormModal(true);
  }, [selectedStudentId]);

  const openSessionFormModal = useCallback((session: Session) => {
    if (closeFormTimerRef.current !== null) {
      window.clearTimeout(closeFormTimerRef.current);
      closeFormTimerRef.current = null;
    }

    if (session.student_id !== selectedStudentId) {
      pendingSessionIdRef.current = session.id;
      setSelectedStudentId(session.student_id);
      setCurrentSession(createEmptySessionForm(session.student_id));
    } else {
      applySessionToForm(session);
    }

    setEditingNoteId(null);
    setEditNoteValue('');
    setIsClosingFormModal(false);
    setShowFormModal(true);
  }, [selectedStudentId]);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (students.length === 0) return;

    if (queryStudentId && students.some(student => student.id === queryStudentId && student.is_active)) {
      setSelectedStudentId(queryStudentId);
      return;
    }

    const firstActive = students.find(student => student.is_active);
    setSelectedStudentId(prev => {
      if (prev && students.some(student => student.id === prev && student.is_active)) {
        return prev;
      }
      return firstActive?.id ?? '';
    });
  }, [students, queryStudentId]);

  useEffect(() => {
    if (selectedStudentId === '') {
      setSessions([]);
      setCurrentSession(createEmptySessionForm(''));
      setEditingNoteId(null);
      setEditNoteValue('');
      return;
    }

    fetchSessions(selectedStudentId);
    setCurrentSession(createEmptySessionForm(selectedStudentId));
  }, [selectedStudentId]);

  useEffect(() => {
    if (sessions.length === 0) return;

    const targetSessionId = pendingSessionIdRef.current ?? querySessionId;
    if (!targetSessionId) return;

    const session = sessions.find(item => item.id === targetSessionId);
    if (!session) return;

    applySessionToForm(session);
    pendingSessionIdRef.current = null;
  }, [sessions, querySessionId]);

  useEffect(() => {
    if (!autoOpenFormRef.current) return;
    if (selectedStudentId === '' || loadingSessions) return;

    if (querySessionId) {
      const session = sessions.find(item => item.id === querySessionId);
      if (!session) return;

      openSessionFormModal(session);
      autoOpenFormRef.current = false;
      return;
    }

    openNewFormModal(selectedStudentId);
    autoOpenFormRef.current = false;
  }, [loadingSessions, openNewFormModal, openSessionFormModal, querySessionId, selectedStudentId, sessions]);

  useEffect(() => {
    if (!showFormModal && !isClosingFormModal) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeFormModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeFormModal, isClosingFormModal, showFormModal]);

  useEffect(() => {
    return () => {
      if (closeFormTimerRef.current !== null) {
        window.clearTimeout(closeFormTimerRef.current);
        closeFormTimerRef.current = null;
      }
    };
  }, []);

  const sessionStats = useMemo(
    () =>
      sessions.reduce(
        (acc, session) => {
          acc.total += 1;
          if (session.status === 'scheduled') acc.scheduled += 1;
          if (session.status === 'completed') acc.completed += 1;
          if (session.payment_status === 'paid') acc.paid += 1;
          if (session.payment_status === 'pending' || session.payment_status === 'overdue') {
            acc.pendingPayment += 1;
          }
          return acc;
        },
        { total: 0, scheduled: 0, completed: 0, paid: 0, pendingPayment: 0 }
      ),
    [sessions]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const studentId = currentSession.student_id === '' ? selectedStudentId : currentSession.student_id;
    if (studentId === '') {
      alert('Pilih siswa aktif terlebih dahulu.');
      return;
    }

    const payload = {
      student_id: Number(studentId),
      subject: currentSession.subject,
      date: currentSession.date,
      time: currentSession.time,
      price: Number(currentSession.price || 0),
      notes: currentSession.notes,
      status: currentSession.status,
      payment_status: currentSession.payment_status,
    };

    setSaving(true);
    try {
      if (currentSession.id) {
        await adminService.updateSession(currentSession.id, payload);
      } else {
        await adminService.createSession(payload);
      }

      await fetchSessions(Number(studentId));
      setCurrentSession(createEmptySessionForm(Number(studentId)));
      setEditingNoteId(null);
      setEditNoteValue('');
      closeFormModal();
    } catch {
      alert('Gagal menyimpan data sesi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sessionId: number) => {
    if (!confirm('Yakin ingin menghapus sesi ini?')) return;

    try {
      await adminService.deleteSession(sessionId);
      if (selectedStudentId !== '') {
        await fetchSessions(selectedStudentId);
      }
      setCurrentSession(createEmptySessionForm(selectedStudentId));
      setEditingNoteId(null);
      setEditNoteValue('');
    } catch {
      alert('Gagal menghapus sesi');
    }
  };

  if (loadingStudents) return <div className="container py-8">Loading...</div>;

  return (
    <div className="container py-6 md:py-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="session-hero">
        <div>
          <p className="session-kicker">Admin Panel</p>
          <h1 className="text-display">Form Sesi</h1>
          <p className="session-subtitle">
            Pilih siswa aktif, lalu buka form untuk menambah sesi baru atau mengubah detail sesi yang sudah ada.
          </p>
        </div>
        <div className="session-hero-actions">
          <Link to="/admin/sessions" className="btn btn-outline w-full sm:w-auto">
            Kembali ke Semua Sesi
          </Link>
          <button
            type="button"
            className="btn btn-primary w-full sm:w-auto"
            onClick={() => openNewFormModal(selectedStudentId)}
            disabled={selectedStudentId === ''}
          >
            Tambah Sesi Baru
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] items-start">
        <aside className="session-side card-elevated bg-white border-ash-grey shadow-sm p-5 md:p-6 lg:sticky lg:top-6">
          <div className="pb-4 border-b border-ash-grey">
            <h2 className="text-heading-sm">Siswa Aktif</h2>
            <p className="text-muted text-sm mt-1">Pilih satu siswa untuk memuat seluruh sesi miliknya.</p>
          </div>

          <div className="pt-4 space-y-4">
            <div>
              <label className="uppercase tracking-widest text-xs font-bold mb-2">Pilih Siswa</label>
              <select
                className="bg-cloud-grey focus:bg-white transition-colors"
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value ? Number(e.target.value) : '')}
                disabled={activeStudents.length === 0}
              >
                <option value="">Pilih Siswa Aktif</option>
                {activeStudents.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedStudent && (
              <div className="rounded-2xl border border-ash-grey bg-paper-white p-4">
                <div className="font-bold text-body">{selectedStudent.name}</div>
                <div className="text-sm text-muted">{selectedStudent.school || '-'}</div>
                <div className="mt-3 inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-jade-green text-onyx-black">
                  Aktif
                </div>
              </div>
            )}

            {activeStudents.length === 0 && (
              <p className="text-sm text-muted">
                Tidak ada siswa aktif. Aktifkan siswa di menu Manajemen Siswa terlebih dahulu.
              </p>
            )}

            <div className="session-side-summary">
              <div>
                <span className="session-side-label">Total Sesi</span>
                <strong>{sessionStats.total}</strong>
              </div>
              <div>
                <span className="session-side-label">Filter / Siswa</span>
                <strong>{selectedStudent ? selectedStudent.name : 'Belum dipilih'}</strong>
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <div className="card-elevated bg-white border-ash-grey shadow-sm p-4 md:p-5">
              <p className="text-muted text-xs uppercase tracking-widest font-bold">Total Sesi</p>
              <p className="text-display text-3xl md:text-4xl mt-2">{sessionStats.total}</p>
            </div>
            <div className="card-elevated bg-white border-ash-grey shadow-sm p-4 md:p-5">
              <p className="text-muted text-xs uppercase tracking-widest font-bold">Schedule</p>
              <p className="text-display text-3xl md:text-4xl mt-2">{sessionStats.scheduled}</p>
            </div>
            <div className="card-elevated bg-white border-ash-grey shadow-sm p-4 md:p-5">
              <p className="text-muted text-xs uppercase tracking-widest font-bold">Selesai</p>
              <p className="text-display text-3xl md:text-4xl mt-2">{sessionStats.completed}</p>
            </div>
            <div className="card-elevated bg-white border-ash-grey shadow-sm p-4 md:p-5">
              <p className="text-muted text-xs uppercase tracking-widest font-bold">Lunas</p>
              <p className="text-display text-3xl md:text-4xl mt-2">{sessionStats.paid}</p>
            </div>
            <div className="card-elevated bg-white border-ash-grey shadow-sm p-4 md:p-5">
              <p className="text-muted text-xs uppercase tracking-widest font-bold">Pending/Overdue</p>
              <p className="text-display text-3xl md:text-4xl mt-2">{sessionStats.pendingPayment}</p>
            </div>
          </div>

          <section className="card-elevated bg-white border-ash-grey shadow-sm overflow-hidden">
            <div className="session-list-toolbar p-5 md:p-6 border-b border-ash-grey">
              <div className="max-w-2xl">
                <h2 className="text-heading-sm">
                  {selectedStudent ? `Daftar Sesi: ${selectedStudent.name}` : 'Daftar Sesi'}
                </h2>
                <p className="text-muted text-sm">
                  {selectedStudent
                    ? 'Klik edit detail untuk membuka pop-up form, atau ubah status dan catatan langsung di kartu.'
                    : 'Pilih siswa aktif untuk menampilkan sesi.'}
                </p>
              </div>
              <div className="session-list-meta">
                <span>{loadingSessions ? 'Memuat sesi...' : `${sessions.length} data`}</span>
                <span>{selectedStudent ? '1 siswa aktif dipilih' : 'Belum ada siswa dipilih'}</span>
              </div>
            </div>

            <div className="p-4 md:p-5 space-y-4 md:space-y-5">
              {sessions.map(session => {
                const sessionNote = session.notes || '';
                const isEditingNote = editingNoteId === session.id;

                return (
                  <div key={session.id} className="rounded-2xl border border-ash-grey bg-paper-white p-4 md:p-5 shadow-sm">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex-1 min-w-0 space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold text-body">{session.subject}</h3>
                          <p className="text-sm text-muted">
                            {formatSessionDate(session.date)} | {formatSessionTime(session.time)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="badge-pill bg-lavender-haze">{session.student_name || '-'}</span>
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
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <label className="uppercase tracking-widest text-xs font-bold">Catatan Sesi</label>
                            {!isEditingNote && (
                              <button
                                type="button"
                                className="text-onyx-black font-bold hover:underline text-xs uppercase tracking-widest"
                                onClick={() => {
                                  setEditingNoteId(session.id);
                                  setEditNoteValue(sessionNote);
                                }}
                              >
                                {sessionNote ? 'Edit Catatan' : 'Tambah Catatan'}
                              </button>
                            )}
                          </div>

                          {isEditingNote ? (
                            <div className="space-y-3">
                              <textarea
                                value={editNoteValue}
                                onChange={e => setEditNoteValue(e.target.value)}
                                placeholder="Ketik catatan sesi..."
                                className="bg-cloud-grey focus:bg-white transition-colors h-24"
                                autoFocus
                              />
                              <div className="flex flex-col sm:flex-row justify-end gap-3">
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm w-full sm:w-auto"
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setEditNoteValue('');
                                  }}
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm w-full sm:w-auto"
                                  disabled={updatingSessionId === session.id}
                                  onClick={() => commitSessionPatch(session, { notes: editNoteValue })}
                                >
                                  {updatingSessionId === session.id ? 'Menyimpan...' : 'Simpan Catatan'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted leading-relaxed">
                              {sessionNote.trim() !== '' ? sessionNote : 'Belum ada catatan.'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="xl:min-w-[300px] xl:border-l xl:border-ash-grey xl:pl-5 space-y-4">
                        <div className="space-y-2">
                          <label className="uppercase tracking-widest text-xs font-bold">Status Sesi</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                              type="button"
                              className={`btn btn-sm w-full ${session.status === 'scheduled' ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => commitSessionPatch(session, { status: 'scheduled' })}
                              disabled={updatingSessionId === session.id}
                            >
                              Jadwal
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm w-full ${session.status === 'completed' ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => commitSessionPatch(session, { status: 'completed' })}
                              disabled={updatingSessionId === session.id}
                            >
                              Selesai
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm w-full ${session.status === 'cancelled' ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => commitSessionPatch(session, { status: 'cancelled' })}
                              disabled={updatingSessionId === session.id}
                            >
                              Batal
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="uppercase tracking-widest text-xs font-bold">Status Pembayaran</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                              type="button"
                              className={`btn btn-sm w-full ${session.payment_status === 'pending' ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => commitSessionPatch(session, { payment_status: 'pending' })}
                              disabled={updatingSessionId === session.id}
                            >
                              Pending
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm w-full ${session.payment_status === 'paid' ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => commitSessionPatch(session, { payment_status: 'paid' })}
                              disabled={updatingSessionId === session.id}
                            >
                              Lunas
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm w-full ${session.payment_status === 'overdue' ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => commitSessionPatch(session, { payment_status: 'overdue' })}
                              disabled={updatingSessionId === session.id}
                            >
                              Overdue
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm w-full"
                            onClick={() => openSessionFormModal(session)}
                          >
                            Edit Detail
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm w-full"
                            onClick={() => openNewFormModal(session.student_id)}
                          >
                            Buka Form
                          </button>
                        </div>
                        <button
                          type="button"
                          className="text-error font-bold hover:underline text-xs uppercase tracking-widest"
                          onClick={() => handleDelete(session.id)}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!loadingSessions && sessions.length === 0 && (
                <div className="text-center py-12 md:py-16 bg-cloud-grey/30 rounded-2xl border border-dashed border-ash-grey">
                  <p className="text-lg text-body font-semibold">Belum ada sesi untuk siswa ini</p>
                  <p className="text-muted mt-2 max-w-md mx-auto">Pilih siswa aktif lain atau buat sesi baru.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {(showFormModal || isClosingFormModal) && (
        <div
          className={`session-modal-overlay ${isClosingFormModal ? 'is-closing' : 'is-open'}`}
          role="presentation"
          onClick={closeFormModal}
        >
          <div
            className="session-modal-panel card-elevated bg-white w-full max-w-4xl border-none shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-form-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="session-modal-header">
              <div>
                <p className="session-kicker">Form Sesi</p>
                <h2 id="session-form-title" className="text-heading-sm">
                  {currentSession.id ? 'Edit Sesi' : 'Tambah Sesi'}
                </h2>
                <p className="session-subtitle session-modal-subtitle">
                  {selectedStudent ? `${selectedStudent.name} - ${selectedStudent.school || '-'}` : 'Pilih siswa aktif untuk mulai mengisi form.'}
                </p>
              </div>
              <button type="button" className="session-modal-close" onClick={closeFormModal}>
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
                    onChange={e =>
                      setCurrentSession({
                        ...currentSession,
                        student_id: e.target.value ? Number(e.target.value) : '',
                      })
                    }
                    required
                    disabled={activeStudents.length === 0}
                  >
                    <option value="">Pilih Siswa Aktif</option>
                    {activeStudents.map(student => (
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
                    onChange={e => setCurrentSession({ ...currentSession, subject: e.target.value })}
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
                    onChange={e => setCurrentSession({ ...currentSession, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="uppercase tracking-widest text-xs font-bold mb-2">Waktu</label>
                  <input
                    type="time"
                    className="bg-cloud-grey focus:bg-white transition-colors"
                    value={currentSession.time}
                    onChange={e => setCurrentSession({ ...currentSession, time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="uppercase tracking-widest text-xs font-bold mb-2">Harga Sesi</label>
                  <input
                    type="number"
                    className="bg-cloud-grey focus:bg-white transition-colors"
                    value={currentSession.price}
                    onChange={e => setCurrentSession({ ...currentSession, price: Number(e.target.value) })}
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
                    onChange={e => setCurrentSession({ ...currentSession, status: e.target.value as Session['status'] })}
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
                    onChange={e =>
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
                  onChange={e => setCurrentSession({ ...currentSession, notes: e.target.value })}
                  placeholder="Tulis ringkasan materi, progres, atau catatan pembayaran..."
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 border-t border-ash-grey">
                <button type="button" className="btn btn-outline w-full sm:w-auto" onClick={closeFormModal}>
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary w-full sm:w-auto"
                  disabled={saving || activeStudents.length === 0}
                >
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

export default SessionManagement;
