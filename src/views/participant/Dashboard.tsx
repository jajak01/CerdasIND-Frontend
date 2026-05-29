import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { participantService, type Jenjang } from '../../services/participant.service';
import { GraduationCap } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [jenjangs, setJenjangs] = useState<Jenjang[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJenjang = async () => {
      try {
        const data = await participantService.getJenjang();
        setJenjangs(data);
      } catch (err) {
        console.error('Failed to fetch jenjang', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJenjang();
  }, []);

  if (loading) return <div className="container p-4">Loading...</div>;

  return (
    <div className="container py-8">
      <div className="welcome-section mb-8">
        <h1>Pilih Jenjang Pendidikan</h1>
        <p className="text-muted">Silakan pilih jenjang pendidikan Anda untuk memulai latihan soal.</p>
      </div>

      <div className="grid-jenjang">
        {jenjangs.map((j) => (
          <div 
            key={j.id} 
            className="card jenjang-card pointer"
            onClick={() => navigate(`/jenjang/${j.id}/mapel`)}
          >
            <GraduationCap size={48} className="jenjang-icon" />
            <h2>{j.nama}</h2>
            <p>Klik untuk melihat mata pelajaran {j.nama}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
