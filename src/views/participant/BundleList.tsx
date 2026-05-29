import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { participantService, type Bundle } from '../../services/participant.service';
import { Play, ArrowLeft, Clock } from 'lucide-react';

const BundleList: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBundles = async () => {
      if (!id) return;
      try {
        const data = await participantService.getBundles(parseInt(id));
        setBundles(data);
      } catch (err) {
        console.error('Failed to fetch bundles', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBundles();
  }, [id]);

  if (loading) return <div className="container p-4">Loading...</div>;

  return (
    <div className="container py-8">
      <button onClick={() => navigate(-1)} className="btn-back mb-8">
        <ArrowLeft size={18} />
        <span>Kembali</span>
      </button>

      <div className="welcome-section mb-8">
        <h1>Pilih Paket Soal</h1>
        <p className="text-muted">Pilih paket soal untuk memulai ujian.</p>
      </div>

      <div className="list-container">
        {bundles.length > 0 ? (
          bundles.map((b) => (
            <div key={b.id} className="item-card">
              <div className="item-info">
                <h3>{b.nama_bundle}</h3>
                <div className="meta-info">
                  <Clock size={14} />
                  <span>{b.waktu_menit} Menit</span>
                </div>
                {b.deskripsi && <p>{b.deskripsi}</p>}
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => navigate(`/ujian/${b.id}`)}
              >
                <Play size={16} className="mr-2" />
                Mulai Ujian
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted">Tidak ada paket soal tersedia untuk mata pelajaran ini.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BundleList;
