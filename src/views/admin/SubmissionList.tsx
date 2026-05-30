import React, { useEffect, useState } from 'react';
import { adminService, type Submission } from '../../services/admin.service';

const SubmissionList: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'menunggu_koreksi' | 'selesai'>('menunggu_koreksi');

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const data = await adminService.getSubmissions(statusFilter);
        setSubmissions(data);
      } catch (err) {
        console.error('Failed to fetch submissions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [statusFilter]);

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-display">Antrean Koreksi</h1>
        <div className="flex gap-2 bg-cloud-grey p-1 rounded-full border border-onyx-black/10">
          <button 
            className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              statusFilter === 'menunggu_koreksi' ? 'bg-lemon-zest shadow-sm text-onyx-black' : 'text-stone-grey hover:text-onyx-black'
            }`}
            onClick={() => setStatusFilter('menunggu_koreksi')}
          >
            Menunggu
          </button>
          <button 
            className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              statusFilter === 'selesai' ? 'bg-lemon-zest shadow-sm text-onyx-black' : 'text-stone-grey hover:text-onyx-black'
            }`}
            onClick={() => setStatusFilter('selesai')}
          >
            Selesai
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 font-stk-gerhard text-muted animate-pulse">Memuat data antrean...</div>
      ) : (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="card-elevated text-center py-20 bg-paper-white border-dashed border-2 border-ash-grey">
              <p className="text-muted font-medium">Tidak ada ujian {statusFilter === 'menunggu_koreksi' ? 'yang menunggu koreksi' : 'yang sudah selesai'}.</p>
            </div>
          ) : (
            submissions.map(s => (
              <div key={s.history_id} className="item-card bg-white hover:border-onyx-black transition-all group">
                <div>
                  <h3 className="font-bold text-xl mb-1">{s.username}</h3>
                  <div className="flex items-center gap-3">
                    <span className="badge-pill bg-lavender-haze">{s.nama_bundle}</span>
                    <span className="text-xs text-muted font-stk-gerhard tracking-tighter">
                      Sub: {new Date(s.tanggal_submit).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {s.status === 'menunggu_koreksi' ? (
                    <a href={`/admin/koreksi/${s.history_id}`} className="btn btn-primary group-hover:scale-105 transition-transform">
                      Mulai Koreksi
                    </a>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="badge-pill bg-jade-green text-xs font-bold uppercase tracking-widest">Terselesaikan</span>
                      <span className="text-[10px] text-muted font-stk-gerhard mt-1 uppercase">Telah Dinilai</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SubmissionList;
