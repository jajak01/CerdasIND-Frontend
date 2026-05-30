import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService, type SubmissionDetail } from '../../services/admin.service';
import KaTeXParser from '../../components/common/KaTeXParser';

const GradeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SubmissionDetail | null>(null);
  const [skor, setSkor] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    adminService.getSubmissionDetail(parseInt(id)).then(setData);
  }, [id]);

  const handleGrade = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const penilaian = Object.entries(skor).map(([soal_id, skor_diberikan]) => ({
        soal_id: parseInt(soal_id),
        skor_diberikan
      }));
      await adminService.gradeSubmission(parseInt(id), penilaian);
      navigate('/admin/koreksi');
    } catch (err) {
      alert('Gagal menyimpan nilai');
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <div className="container py-8 text-center">Loading...</div>;

  const unansweredCount = data.detail_jawaban.filter(j => !j.is_dinilai).length;

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex justify-between items-end mb-12 border-b border-onyx-black/10 pb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-stone-grey mb-2 block">Penilaian Manual</span>
          <h1 className="text-display">Koreksi: {data.username}</h1>
          <p className="font-stk-gerhard text-xs text-muted mt-2 uppercase tracking-tighter">History Session ID: #{data.history_id}</p>
        </div>
        <button 
          className="btn btn-primary px-10 shadow-lg group" 
          onClick={handleGrade}
          disabled={saving || (unansweredCount > 0 && Object.keys(skor).length === 0)}
        >
          {saving ? 'Menyimpan...' : (
            <span className="flex items-center gap-2">
              Simpan Semua Nilai <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          )}
        </button>
      </div>

      <div className="space-y-12">
        {data.detail_jawaban.map((j, index) => (
          <div key={j.soal_id} className={`p-0 bg-transparent`}>
            <div className="flex justify-between items-center mb-6">
              <span className="font-stk-gerhard text-sm font-bold bg-onyx-black text-white px-4 py-1 rounded-sm">SOAL #{index + 1}</span>
              {j.is_dinilai && (
                <span className="badge-pill bg-jade-green flex items-center gap-1">
                  <span className="text-lg">✓</span> TERVERIFIKASI
                </span>
              )}
            </div>
            
            <div className="card-elevated bg-paper-white border-none mb-8 shadow-inner-sm">
              <div className="text-lg leading-relaxed text-onyx-black">
                <KaTeXParser text={j.teks_soal} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-stone-grey uppercase tracking-[0.2em]">Jawaban Peserta</label>
                <div className="p-6 bg-white border border-ash-grey rounded-2xl font-medium text-onyx-black shadow-sm min-h-[100px] flex items-center">
                  {j.jawaban_peserta || <span className="text-earl-gray italic">Tidak ada jawaban yang disubmit</span>}
                </div>
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-stone-grey uppercase tracking-[0.2em]">Pemberian Skor</label>
                <div className="card bg-cloud-grey border-ash-grey flex flex-col justify-center gap-4">
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      className="w-32 bg-white border-onyx-black focus:ring-4 focus:ring-lemon-zest/30 text-2xl font-bold p-4 text-center rounded-xl"
                      placeholder="0.0"
                      defaultValue={j.skor_didapat}
                      onChange={(e) => setSkor({...skor, [j.soal_id]: parseFloat(e.target.value)})}
                      disabled={j.is_dinilai}
                    />
                    <div className="text-xs font-medium text-charcoal-grey leading-tight">
                      Batas skor sesuai<br/>bobot tingkat kesulitan
                    </div>
                  </div>
                  <div className="h-2 bg-ash-grey rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-lemon-zest transition-all duration-500" 
                      style={{ width: `${(skor[j.soal_id] || j.skor_didapat || 0) > 0 ? '100%' : '0%'}` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 pt-12 border-t border-ash-grey flex flex-col items-center gap-6">
        <p className="text-stone-grey text-sm font-medium italic">Pastikan seluruh jawaban esai telah ditinjau sebelum menyelesaikan.</p>
        <button 
          className="btn btn-primary px-20 py-5 text-xl shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all" 
          onClick={handleGrade}
          disabled={saving || (unansweredCount > 0 && Object.keys(skor).length === 0)}
        >
          {saving ? 'Sedang Memproses...' : 'Selesaikan Penilaian'}
        </button>
      </div>
    </div>
  );
};

export default GradeDetail;
