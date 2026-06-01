import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService, type Session } from '../../services/admin.service';

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

const emptyStats = {
  total: 0,
  scheduled: 0,
  completed: 0,
  pendingPayment: 0,
  paid: 0,
};

const SessionAll: React.FC = () => {
  const [draftFilters, setDraftFilters] = useState<SessionFilters>(initialDraftFilters);
  const [appliedFilters, setAppliedFilters] = useState<SessionFilters>(initialDraftFilters);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

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

  useEffect(() => {
    fetchSessions(appliedFilters);
  }, [appliedFilters]);

  const stats = useMemo(
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
        { ...emptyStats }
      ),
    [sessions]
  );

  const activeFilterCount = useMemo(
    () =>
      [appliedFilters.search, appliedFilters.startDate, appliedFilters.endDate, appliedFilters.status, appliedFilters.paymentStatus].filter(
        Boolean
      ).length,
    [appliedFilters]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters(draftFilters);
  };

  const handleReset = async () => {
    setDraftFilters(initialDraftFilters);
    setAppliedFilters(initialDraftFilters);
  };

  if (loading) return <div className="container py-8">Loading...</div>;

  return (
    <div className="container py-6 md:py-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-display">Semua Sesi</h1>
          <p className="text-muted mt-2 max-w-2xl">
            Gunakan filter untuk mencari data, lalu buka form jika ingin mengubah detail sesi tertentu.
          </p>
        </div>
        <Link to="/admin/sessions/form" className="btn btn-primary w-full sm:w-auto">
          Tambah Sesi Baru
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card-elevated bg-white border-ash-grey shadow-sm overflow-hidden">
        <div className="bg-onyx-black text-white p-5 md:p-6 border-b border-ash-grey">
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-lemon-zest">
            <span className="inline-block h-2 w-2 rounded-full bg-lemon-zest" />
            Filter Sesi
          </div>
          <div className="mt-4 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold leading-tight">
              Cari berdasarkan nama, tanggal, status sesi, dan pembayaran
            </h2>
            <p className="mt-3 max-w-2xl text-white/80">
              Draft filter bisa diubah bebas. Data hanya diperbarui saat tombol terapkan ditekan.
            </p>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-5">
            <div className="xl:col-span-2">
              <label className="uppercase tracking-widest text-xs font-bold mb-2">Nama Siswa</label>
              <input
                type="text"
                className="bg-cloud-grey focus:bg-white transition-colors"
                value={draftFilters.search}
                onChange={e => setDraftFilters({ ...draftFilters, search: e.target.value })}
                placeholder="Cari nama atau kontak"
              />
            </div>
            <div>
              <label className="uppercase tracking-widest text-xs font-bold mb-2">Dari Tanggal</label>
              <input
                type="date"
                className="bg-cloud-grey focus:bg-white transition-colors"
                value={draftFilters.startDate}
                onChange={e => setDraftFilters({ ...draftFilters, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="uppercase tracking-widest text-xs font-bold mb-2">Sampai Tanggal</label>
              <input
                type="date"
                className="bg-cloud-grey focus:bg-white transition-colors"
                value={draftFilters.endDate}
                onChange={e => setDraftFilters({ ...draftFilters, endDate: e.target.value })}
              />
            </div>
            <div>
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
            <div>
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

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-ash-grey pt-5 mt-6">
            <button type="button" className="btn btn-outline" onClick={handleReset}>
              Reset
            </button>
            <button type="submit" className="btn btn-primary" disabled={searching}>
              {searching ? 'Mencari...' : 'Update Data'}
            </button>
          </div>
        </div>
      </form>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 md:gap-4">
        <div className="card-elevated bg-white border-ash-grey shadow-sm p-4 md:p-5">
          <p className="text-muted text-xs uppercase tracking-widest font-bold">Total Sesi</p>
          <p className="text-display text-3xl md:text-4xl mt-2">{stats.total}</p>
        </div>
        <div className="card-elevated bg-white border-ash-grey shadow-sm p-4 md:p-5">
          <p className="text-muted text-xs uppercase tracking-widest font-bold">Schedule</p>
          <p className="text-display text-3xl md:text-4xl mt-2">{stats.scheduled}</p>
        </div>
        <div className="card-elevated bg-white border-ash-grey shadow-sm p-4 md:p-5">
          <p className="text-muted text-xs uppercase tracking-widest font-bold">Selesai</p>
          <p className="text-display text-3xl md:text-4xl mt-2">{stats.completed}</p>
        </div>
        <div className="card-elevated bg-white border-ash-grey shadow-sm p-4 md:p-5">
          <p className="text-muted text-xs uppercase tracking-widest font-bold">Lunas</p>
          <p className="text-display text-3xl md:text-4xl mt-2">{stats.paid}</p>
        </div>
        <div className="card-elevated bg-white border-ash-grey shadow-sm p-4 md:p-5">
          <p className="text-muted text-xs uppercase tracking-widest font-bold">Pending/Overdue</p>
          <p className="text-display text-3xl md:text-4xl mt-2">{stats.pendingPayment}</p>
        </div>
      </div>

      <div className="card-elevated bg-white border-ash-grey shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between p-5 md:p-6 border-b border-ash-grey">
          <div className="max-w-2xl">
            <h2 className="text-heading-sm">Hasil Sesi</h2>
            <p className="text-muted text-sm">
              Klik edit untuk membuka form sesi dan lanjutkan perubahan detailnya.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span>{sessions.length} data</span>
            <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-steel-grey" />
            <span>{activeFilterCount} filter aktif</span>
          </div>
        </div>

        <div className="p-4 md:p-5 space-y-4 md:space-y-5">
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
                    <Link
                      to={`/admin/sessions/form?studentId=${session.student_id}&sessionId=${session.id}`}
                      className="btn btn-outline btn-sm w-full"
                    >
                      Edit Detail
                    </Link>
                    <Link
                      to={`/admin/sessions/form?studentId=${session.student_id}`}
                      className="btn btn-primary btn-sm w-full"
                    >
                      Buka Form
                    </Link>
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
    </div>
  );
};

export default SessionAll;
