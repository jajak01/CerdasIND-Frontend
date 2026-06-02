import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService, type Bundle, type DashboardStats } from '../../services/admin.service';

const AdminDashboard: React.FC = () => {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bundlesData = await adminService.getBundles();
        setBundles(bundlesData);
        
        const statsData = await adminService.getStats();
        setStats(statsData);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      formData.append('nama_bundle', 'Paket Baru');
      formData.append('waktu_menit', '60');
      formData.append('mapel_id', '1');
      try {
        await adminService.uploadBundle(formData);
        toast.success('Upload sukses');
        const updatedBundles = await adminService.getBundles();
        setBundles(updatedBundles);
      } catch (err) {
        toast.error('Upload gagal');
      }
    }
  };

  if (loading) return <div className="container py-8">Loading...</div>;

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-display">Dashboard Admin</h1>
      
      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card-elevated text-center bg-white shadow-sm">
            <p className="text-muted text-xs uppercase tracking-widest font-bold">Total Siswa</p>
            <p className="text-display text-4xl">{stats.total_students}</p>
          </div>
          <div className="card-elevated text-center bg-white shadow-sm">
            <p className="text-muted text-xs uppercase tracking-widest font-bold">Sesi Hari Ini</p>
            <p className="text-display text-4xl">{stats.today_sessions}</p>
          </div>
          <div className="card-elevated text-center bg-white shadow-sm border-lemon-zest">
            <p className="text-muted text-xs uppercase tracking-widest font-bold">Revenue Bulan Ini</p>
            <p className="text-display text-4xl text-success">
              Rp {stats.this_month_revenue.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bundle Management */}
        <section className="card bg-paper-white border-none">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-heading-sm">Paket Soal (CBT)</h2>
            <label className="btn btn-primary cursor-pointer shadow-sm">
              Upload Paket
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
          <div className="space-y-4">
            {bundles.length === 0 ? (
              <p className="text-muted text-center py-8 bg-white/50 rounded-lg">Belum ada paket soal.</p>
            ) : (
              bundles.map(b => (
                <div key={b.id} className="item-card border-ash-grey bg-white hover:border-onyx-black transition-colors">
                  <div>
                    <h3 className="font-bold text-body-lg">{b.nama_bundle}</h3>
                    <div className="badge-pill mt-2 inline-block">{b.waktu_menit} menit</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={async () => {
                        const blob = await adminService.exportBundle(b.id);
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${b.nama_bundle}.xlsx`;
                        a.click();
                      }}
                    >
                      Export
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="card bg-white border-onyx-black/10">
          <h2 className="text-heading-sm mb-6">Akses Cepat</h2>
          <div className="grid grid-cols-2 gap-6">
            <Link to="/admin/students" className="card-elevated hover:bg-lemon-zest transition-all duration-300 block text-center p-8 group border-ash-grey">
              <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">👥</span>
              <span className="font-bold uppercase tracking-wider text-xs">Manajemen Siswa</span>
            </Link>
            <Link to="/admin/sessions" className="card-elevated hover:bg-lemon-zest transition-all duration-300 block text-center p-8 group border-ash-grey">
              <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">📅</span>
              <span className="font-bold uppercase tracking-wider text-xs">Jadwal Les</span>
            </Link>
            <Link to="/admin/koreksi" className="card-elevated hover:bg-lemon-zest transition-all duration-300 block text-center p-8 group border-ash-grey">
              <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">📝</span>
              <span className="font-bold uppercase tracking-wider text-xs">Antrean Koreksi</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
