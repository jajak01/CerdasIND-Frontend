import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { participantService, type Mapel } from '../../services/participant.service';
import { ChevronRight, ArrowLeft } from 'lucide-react';

const MapelList: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [mapels, setMapels] = useState<Mapel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMapel = async () => {
      if (!id) return;
      try {
        const data = await participantService.getMapel(parseInt(id));
        setMapels(data);
      } catch (err) {
        console.error('Failed to fetch mapel', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMapel();
  }, [id]);

  if (loading) return <div className="container p-4">Loading...</div>;

  return (
    <div className="container py-8">
      <button onClick={() => navigate('/')} className="btn-back mb-8">
        <ArrowLeft size={18} />
        <span>Kembali ke Jenjang</span>
      </button>

      <div className="welcome-section mb-8">
        <h1>Pilih Mata Pelajaran</h1>
        <p className="text-muted">Daftar mata pelajaran yang tersedia untuk jenjang ini.</p>
      </div>

      <div className="list-container">
        {mapels.length > 0 ? (
          mapels.map((m) => (
            <div 
              key={m.id} 
              className="item-card pointer"
              onClick={() => navigate(`/mapel/${m.id}/bundles`)}
            >
              <div className="item-info">
                <h3>{m.nama}</h3>
              </div>
              <ChevronRight size={20} className="text-muted" />
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted">Tidak ada mata pelajaran tersedia.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapelList;
