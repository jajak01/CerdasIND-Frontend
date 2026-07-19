import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { participantService, type Soal } from '../../services/participant.service';
import KaTeXParser from '../../components/common/KaTeXParser';
import Timer from '../../components/participant/Timer';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';

const CBTWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [soals, setSoals] = useState<Soal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jawaban, setJawaban] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bundleInfo, setBundleInfo] = useState<{ nama: string; waktu: number } | null>(null);

  const navigate = useNavigate();

  // Load soals and bundle info
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        // In a real app, we might need another endpoint for bundle metadata
        // but for now we'll assume the first soal gives us the bundle context or we fetch it separately
        const soalData = await participantService.getSoal(parseInt(id));
        setSoals(soalData);
        
        // Mock bundle info for now (should ideally come from backend)
        setBundleInfo({ nama: 'Ujian', waktu: 60 });

        // Load saved answers from localStorage
        const saved = localStorage.getItem(`ujian_ans_${id}`);
        if (saved) {
          setJawaban(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // Auto-save to localStorage
  useEffect(() => {
    if (id && Object.keys(jawaban).length > 0) {
      localStorage.setItem(`ujian_ans_${id}`, JSON.stringify(jawaban));
    }
  }, [jawaban, id]);

  const handleAnswerChange = (soalId: number, value: string) => {
    setJawaban(prev => ({ ...prev, [soalId]: value }));
  };

  const handleSubmit = useCallback(async () => {
    if (!id || submitting) return;
    
    if (!window.confirm('Apakah Anda yakin ingin mengakhiri ujian ini?')) return;

    setSubmitting(true);
    try {
      const payload = Object.entries(jawaban).map(([soalId, jawaban_peserta]) => ({
        soal_id: parseInt(soalId),
        jawaban_peserta,
      }));

      await participantService.submitJawaban(parseInt(id), payload);
      localStorage.removeItem(`ujian_ans_${id}`);
      navigate('/history');
    } catch (err) {
      console.error('Failed to submit', err);
      alert('Gagal mengirim jawaban. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }, [id, jawaban, navigate, submitting]);

  const onTimeUp = useCallback(() => {
    alert('Waktu ujian telah habis! Jawaban Anda akan dikirim otomatis.');
    handleSubmit();
  }, [handleSubmit]);

  if (loading) return <div className="container p-8">Loading Soal...</div>;
  if (soals.length === 0) return <div className="container p-8">Soal tidak ditemukan.</div>;

  const currentSoal = soals[currentIndex];

  return (
    <div className="cbt-container">
      <header className="cbt-header">
        <div className="container header-content">
          <div className="bundle-meta">
            <h2>{bundleInfo?.nama}</h2>
            <span className="badge">Soal {currentIndex + 1} / {soals.length}</span>
          </div>
          <Timer initialMinutes={bundleInfo?.waktu || 60} onTimeUp={onTimeUp} />
        </div>
      </header>

      <div className="container cbt-main">
        <div className="cbt-content">
          <div className="card soal-card">
            <div className="soal-text">
              <KaTeXParser text={currentSoal.teks_soal} />
            </div>

            {currentSoal.image_url && (
              <div className="soal-image-wrapper">
                <img
                  src={currentSoal.image_url}
                  alt="Gambar soal"
                  className="soal-image"
                  loading="lazy"
                />
              </div>
            )}

            <div className="jawaban-area">
              {currentSoal.tipe_soal === 'pilihan_ganda' ? (
                <div className="options-grid">
                  {currentSoal.pilihan_jawaban?.map((opt) => (
                    <label 
                      key={opt.opsi} 
                      className={`option-item ${jawaban[currentSoal.id] === opt.opsi ? 'selected' : ''}`}
                    >
                      <input 
                        type="radio" 
                        name={`soal-${currentSoal.id}`}
                        value={opt.opsi}
                        checked={jawaban[currentSoal.id] === opt.opsi}
                        onChange={() => handleAnswerChange(currentSoal.id, opt.opsi)}
                      />
                      <span className="option-label">{opt.opsi}.</span>
                      <div className="option-text">
                        <KaTeXParser text={opt.teks} />
                        {opt.image_url && (
                          <img
                            src={opt.image_url}
                            alt={`Gambar opsi ${opt.opsi}`}
                            className="option-image"
                            loading="lazy"
                          />
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="isian-area">
                  <p>Jawaban Anda:</p>
                  <input 
                    type="text" 
                    className="input-isian"
                    value={jawaban[currentSoal.id] || ''}
                    onChange={(e) => handleAnswerChange(currentSoal.id, e.target.value)}
                    placeholder="Ketik jawaban di sini..."
                  />
                </div>
              )}
            </div>
          </div>

          <div className="cbt-navigation">
            <button 
              className="btn btn-outline"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
            >
              <ChevronLeft size={20} />
              Sebelumnya
            </button>

            {currentIndex === soals.length - 1 ? (
              <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>
                <Send size={18} className="mr-2" />
                {submitting ? 'Mengirim...' : 'Selesai Ujian'}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setCurrentIndex(prev => prev + 1)}>
                Selanjutnya
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>

        <aside className="cbt-sidebar">
          <div className="card sidebar-card">
            <h3>Navigasi Soal</h3>
            <div className="soal-grid">
              {soals.map((s, index) => (
                <button
                  key={s.id}
                  className={`grid-item ${currentIndex === index ? 'active' : ''} ${jawaban[s.id] ? 'answered' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <div className="grid-legend">
              <div className="legend-item"><span className="dot answered"></span> Terjawab</div>
              <div className="legend-item"><span className="dot"></span> Belum</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CBTWorkspace;
