import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { participantService, type HistoryItem } from '../../services/participant.service';
import { ClipboardList, ExternalLink } from 'lucide-react';

const History: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await participantService.getHistory();
        setHistory(data);
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) return <div className="container p-8">Loading riwayat...</div>;

  return (
    <div className="container py-8">
      <div className="welcome-section mb-8">
        <h1>Riwayat Ujian</h1>
        <p className="text-muted">Pantau perkembangan belajar Anda di sini.</p>
      </div>

      <div className="list-container">
        {history.length > 0 ? (
          history.map((h) => (
            <div key={h.history_id} className="item-card">
              <div className="item-info">
                <h3>{h.nama_bundle}</h3>
                <div className="meta-info">
                  <span>{formatDate(h.waktu_mulai)}</span>
                </div>
                <div className="status-badge-container mt-2">
                  <span className={`status-badge ${h.status}`}>
                    {h.status === 'selesai' ? 'Selesai' : 
                     h.status === 'menunggu_koreksi' ? 'Menunggu Koreksi Admin' : 'Berlangsung'}
                  </span>
                </div>
              </div>
              <div className="score-section">
                <div className="score-display">
                  <span className="score-label">Skor</span>
                  <span className="score-value">{h.status === 'selesai' ? h.skor_akhir : '--'}</span>
                </div>
                {h.status === 'selesai' && (
                  <button 
                    className="btn btn-outline btn-sm mt-2"
                    onClick={() => navigate(`/review/${h.history_id}`)}
                  >
                    <ExternalLink size={14} className="mr-2" />
                    Review
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-8">
            <ClipboardList size={48} className="text-muted mb-4 mx-auto" />
            <p className="text-muted">Anda belum pernah mengikuti ujian.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
