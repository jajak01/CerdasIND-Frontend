import React, { useEffect, useState } from 'react';
import { adminService, type Session, type Student } from '../../services/admin.service';

const SessionManagement: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentSession, setCurrentSession] = useState<Partial<Session>>({
    status: 'scheduled',
    payment_status: 'pending'
  });

  const fetchData = async () => {
    try {
      const studentsData = await adminService.getStudents();
      setStudents(studentsData);
      
      const sessionsData = await adminService.getSessions();
      setSessions(sessionsData);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.createSession(currentSession as Omit<Session, 'id'>);
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal membuat sesi');
    }
  };

  if (loading) return <div className="container py-8">Loading...</div>;

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-display">Jadwal Les & Sesi</h1>
        <button className="btn btn-primary shadow-sm" onClick={() => {
          setCurrentSession({
            status: 'scheduled',
            payment_status: 'pending'
          });
          setShowModal(true);
        }}>
          Tambah Sesi
        </button>
      </div>

      <div className="card-elevated overflow-x-auto bg-white border-ash-grey shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-onyx-black/10 bg-cloud-grey">
              <th className="p-4 font-bold uppercase tracking-widest text-xs">Siswa</th>
              <th className="p-4 font-bold uppercase tracking-widest text-xs">Mata Pelajaran</th>
              <th className="p-4 font-bold uppercase tracking-widest text-xs">Waktu</th>
              <th className="p-4 font-bold uppercase tracking-widest text-xs">Harga</th>
              <th className="p-4 font-bold uppercase tracking-widest text-xs">Status</th>
              <th className="p-4 font-bold uppercase tracking-widest text-xs">Pembayaran</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id} className="border-b border-ash-grey hover:bg-paper-white transition-colors">
                <td className="p-4 font-bold text-body">{s.student_name}</td>
                <td className="p-4">
                  <span className="badge-pill bg-lavender-haze">{s.subject}</span>
                </td>
                <td className="p-4">
                  <div className="font-bold text-body">{s.date}</div>
                  <div className="text-xs text-muted font-stk-gerhard tracking-tight">{s.time}</div>
                </td>
                <td className="p-4 font-bold text-body">Rp {s.price.toLocaleString()}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    s.status === 'completed' ? 'bg-jade-green text-onyx-black' : 
                    s.status === 'scheduled' ? 'bg-dusk-blue text-onyx-black' : 
                    'bg-error/20 text-error'
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    s.payment_status === 'paid' ? 'bg-jade-green text-onyx-black' : 
                    s.payment_status === 'pending' ? 'bg-lemon-zest text-onyx-black border border-onyx-black/20' : 
                    'bg-error/20 text-error'
                  }`}>
                    {s.payment_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-onyx-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-elevated bg-white w-full max-w-md border-none shadow-2xl">
            <h2 className="text-heading-sm mb-6">Buat Sesi Baru</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="uppercase tracking-widest text-xs font-bold mb-2">Pilih Siswa</label>
                <select 
                  className="bg-cloud-grey focus:bg-white transition-colors"
                  value={currentSession.student_id || ''}
                  onChange={e => setCurrentSession({...currentSession, student_id: parseInt(e.target.value)})}
                  required
                >
                  <option value="">Pilih Siswa</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="uppercase tracking-widest text-xs font-bold mb-2">Mata Pelajaran</label>
                <input 
                  type="text" 
                  className="bg-cloud-grey focus:bg-white transition-colors"
                  value={currentSession.subject || ''}
                  onChange={e => setCurrentSession({...currentSession, subject: e.target.value})}
                  placeholder="Contoh: Matematika"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="uppercase tracking-widest text-xs font-bold mb-2">Tanggal</label>
                  <input 
                    type="date" 
                    className="bg-cloud-grey focus:bg-white transition-colors"
                    value={currentSession.date || ''}
                    onChange={e => setCurrentSession({...currentSession, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="uppercase tracking-widest text-xs font-bold mb-2">Waktu</label>
                  <input 
                    type="time" 
                    className="bg-cloud-grey focus:bg-white transition-colors"
                    value={currentSession.time || ''}
                    onChange={e => setCurrentSession({...currentSession, time: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="uppercase tracking-widest text-xs font-bold mb-2">Harga Sesi (Rp)</label>
                <input 
                  type="number" 
                  className="bg-cloud-grey focus:bg-white transition-colors"
                  value={currentSession.price || ''}
                  onChange={e => setCurrentSession({...currentSession, price: parseInt(e.target.value)})}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Sesi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManagement;
