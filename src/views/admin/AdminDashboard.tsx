import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, Calendar, PenSquare, Download, Upload, FileText, Loader2 } from 'lucide-react';
import { adminService, type Bundle, type DashboardStats } from '../../services/admin.service';

const AdminDashboard: React.FC = () => {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<number | null>(null);
  
  // Date filters
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  const fetchData = useCallback(async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const [bundlesData, statsData] = await Promise.all([
        adminService.getBundles(),
        adminService.getStats(start, end)
      ]);
      setBundles(bundlesData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(startDate, endDate);
  }, [fetchData]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(startDate, endDate);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: Ideally, capture these details via a modal form instead of hardcoding
    const formData = new FormData();
    formData.append('file', file);
    formData.append('nama_bundle', 'Paket Baru'); 
    formData.append('waktu_menit', '60');
    formData.append('mapel_id', '1');

    try {
      await adminService.uploadBundle(formData);
      toast.success('Paket soal berhasil diunggah');
      
      // Refresh bundles after successful upload
      const updatedBundles = await adminService.getBundles();
      setBundles(updatedBundles);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Gagal mengunggah paket soal');
    } finally {
      // Reset input value to allow uploading the same file again if needed
      e.target.value = '';
    }
  };

  const handleExport = async (bundleId: number, bundleName: string) => {
    setIsExporting(bundleId);
    try {
      const blob = await adminService.exportBundle(bundleId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${bundleName.replace(/\s+/g, '_')}_export.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Gagal mengekspor data');
    } finally {
      setIsExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="container min-h-screen flex flex-col items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted font-medium">Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-display text-3xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="text-muted mt-2">Ringkasan aktivitas dan manajemen sistem.</p>
      </header>
      
      {/* Segmented Summary Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-ash-grey overflow-hidden mb-8 p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Segment 1: Date Filters */}
          <form onSubmit={handleFilter} className="flex-1 p-6 bg-paper-white/50 rounded-xl border border-ash-grey flex flex-col justify-center">
            <h3 className="text-xs uppercase font-bold text-muted mb-4 tracking-widest text-center">Filter Laporan Pendapatan</h3>
            <div className="flex flex-col sm:flex-row items-end justify-center gap-4 w-full">
              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-[10px] uppercase font-bold text-muted/80 mb-1 ml-1">Dari Tanggal</label>
                <input 
                  type="date" 
                  className="input input-sm bg-white border-ash-grey focus:ring-primary w-full" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                />
              </div>
              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-[10px] uppercase font-bold text-muted/80 mb-1 ml-1">Sampai Tanggal</label>
                <input 
                  type="date" 
                  className="input input-sm bg-white border-ash-grey focus:ring-primary w-full" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm px-6 w-full sm:w-auto transition-transform active:scale-95">
                Terapkan
              </button>
            </div>
          </form>

          {stats && (
            <div className="flex-1 grid grid-cols-2 gap-4">
              {/* Operational Stats */}
              <div className="p-6 flex flex-col justify-center items-center border border-ash-grey rounded-xl hover:shadow-md transition-shadow bg-white">
                <p className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Total Siswa</p>
                <p className="text-display text-4xl font-semibold text-gray-800">{stats.total_students}</p>
              </div>
              <div className="p-6 flex flex-col justify-center items-center border border-ash-grey rounded-xl hover:shadow-md transition-shadow bg-white">
                <p className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Sesi Terjadwal</p>
                <p className="text-display text-4xl font-semibold text-gray-800">{stats.today_sessions}</p>
              </div>

              {/* Revenue Stats */}
              <div className="p-6 flex flex-col justify-center items-center border border-ash-grey rounded-xl bg-success/5 hover:bg-success/10 transition-colors">
                <p className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Pendapatan Selesai</p>
                <p className="text-display text-2xl font-semibold text-success">
                  Rp {stats.pendapatan_selesai.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-6 flex flex-col justify-center items-center border border-ash-grey rounded-xl bg-warning/5 hover:bg-warning/10 transition-colors">
                <p className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Pendapatan Pending</p>
                <p className="text-display text-2xl font-semibold text-warning">
                  Rp {stats.pendapatan_pending.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bundle Management */}
        <section className="bg-white rounded-2xl shadow-sm border border-ash-grey p-6">
          <div className="flex justify-between items-center mb-6 border-b border-ash-grey pb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Paket Soal (CBT)
            </h2>
            <label className="btn btn-primary btn-sm cursor-pointer shadow-sm flex items-center gap-2 transition-transform active:scale-95">
              <Upload className="w-4 h-4" />
              Upload Paket
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
            </label>
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {bundles.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-muted font-medium">Belum ada paket soal.</p>
                <p className="text-xs text-gray-400 mt-1">Silakan upload paket soal baru.</p>
              </div>
            ) : (
              bundles.map(b => (
                <div key={b.id} className="flex justify-between items-center p-4 border border-ash-grey rounded-xl bg-white hover:border-primary/50 hover:shadow-sm transition-all group">
                  <div>
                    <h3 className="font-bold text-gray-800">{b.nama_bundle}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge-pill bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md font-medium">
                        {b.waktu_menit} menit
                      </span>
                    </div>
                  </div>
                  <button 
                    className="btn btn-outline btn-sm flex items-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={() => handleExport(b.id, b.nama_bundle)}
                    disabled={isExporting === b.id}
                  >
                    {isExporting === b.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {isExporting === b.id ? 'Mengekspor...' : 'Export'}
                    </span>
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="bg-white rounded-2xl shadow-sm border border-ash-grey p-6">
          <h2 className="text-lg font-bold mb-6 border-b border-ash-grey pb-4">Akses Cepat</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/admin/students" className="group flex flex-col items-center justify-center p-8 rounded-xl border border-ash-grey hover:bg-primary/5 hover:border-primary/30 transition-all duration-300">
              <div className="p-4 bg-gray-50 rounded-full group-hover:bg-primary/10 transition-colors mb-4">
                <Users className="w-8 h-8 text-gray-600 group-hover:text-primary transition-colors" />
              </div>
              <span className="font-bold uppercase tracking-wider text-xs text-gray-700 group-hover:text-primary">Manajemen Siswa</span>
            </Link>
            
            <Link to="/admin/sessions" className="group flex flex-col items-center justify-center p-8 rounded-xl border border-ash-grey hover:bg-primary/5 hover:border-primary/30 transition-all duration-300">
              <div className="p-4 bg-gray-50 rounded-full group-hover:bg-primary/10 transition-colors mb-4">
                <Calendar className="w-8 h-8 text-gray-600 group-hover:text-primary transition-colors" />
              </div>
              <span className="font-bold uppercase tracking-wider text-xs text-gray-700 group-hover:text-primary">Jadwal Les</span>
            </Link>
            
            <Link to="/admin/koreksi" className="group flex flex-col items-center justify-center p-8 rounded-xl border border-ash-grey hover:bg-primary/5 hover:border-primary/30 transition-all duration-300">
              <div className="p-4 bg-gray-50 rounded-full group-hover:bg-primary/10 transition-colors mb-4">
                <PenSquare className="w-8 h-8 text-gray-600 group-hover:text-primary transition-colors" />
              </div>
              <span className="font-bold uppercase tracking-wider text-xs text-gray-700 group-hover:text-primary">Antrean Koreksi</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;