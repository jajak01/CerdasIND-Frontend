import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { participantService, type ReviewItem } from '../../services/participant.service';
import KaTeXParser from '../../components/common/KaTeXParser';
import { ArrowLeft, CheckCircle, XCircle, Info } from 'lucide-react';

const Review: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [reviewData, setReviewData] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReview = async () => {
      if (!id) return;
      try {
        const data = await participantService.getReview(parseInt(id));
        setReviewData(data);
      } catch (err) {
        console.error('Failed to fetch review', err);
        navigate('/history');
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [id, navigate]);

  if (loading) return <div className="container p-8">Loading pembahasan...</div>;

  return (
    <div className="container py-8">
      <button onClick={() => navigate('/history')} className="btn-back mb-8">
        <ArrowLeft size={18} />
        <span>Kembali ke Riwayat</span>
      </button>

      <div className="welcome-section mb-8">
        <h1>Pembahasan Soal</h1>
        <p className="text-muted">Pelajari jawaban yang benar dan pembahasan setiap soal.</p>
      </div>

      <div className="review-list">
        {reviewData.map((s, index) => {
          return (
            <div key={s.id} className="card review-card">
              <div className="review-header">
                <span className="badge">Soal {index + 1}</span>
                {s.tipe_soal === 'pilihan_ganda' ? (
                  s.is_benar ? (
                    <span className="status-badge selesai">
                      <CheckCircle size={14} className="mr-2" /> Sudah Benar
                    </span>
                  ) : (
                    <span className="status-badge error">
                      <XCircle size={14} className="mr-2" /> Salah
                    </span>
                  )
                ) : (
                  <span className="status-badge berlangsung">
                    <Info size={14} className="mr-2" /> Isian
                  </span>
                )}
              </div>

              <div className="soal-text my-4">
                <KaTeXParser text={s.teks_soal} />
              </div>

              {s.image_url && (
                <div className="soal-image-wrapper">
                  <img
                    src={s.image_url}
                    alt="Gambar soal"
                    className="soal-image"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="review-answers grid-2">
                <div className="answer-box user-answer">
                  <p className="label">Jawaban Anda:</p>
                  <div className={`value ${s.is_benar ? 'text-success' : 'text-danger'}`}>
                    {s.jawaban_peserta || '(Kosong)'}
                  </div>
                </div>
                {!s.is_benar && (
                  <div className="answer-box correct-answer">
                    <p className="label">Kunci Jawaban:</p>
                    <div className="value text-success">
                      {s.kunci_jawaban}
                    </div>
                  </div>
                )}
              </div>

              {!s.is_benar && s.pembahasan && (
                <div className="pembahasan-section mt-4">
                  <h4>Pembahasan:</h4>
                  <div className="pembahasan-text">
                    <KaTeXParser text={s.pembahasan} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Review;
