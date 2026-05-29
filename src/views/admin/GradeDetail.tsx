import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService, type SubmissionDetail } from '../../services/admin.service';
import KaTeXParser from '../../components/common/KaTeXParser';

const GradeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SubmissionDetail | null>(null);
  const [skor, setSkor] = useState<Record<number, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    adminService.getSubmissionDetail(parseInt(id)).then(setData);
  }, [id]);

  const handleGrade = async () => {
    if (!id) return;
    const penilaian = Object.entries(skor).map(([soal_id, skor_diberikan]) => ({
      soal_id: parseInt(soal_id),
      skor_diberikan
    }));
    await adminService.gradeSubmission(parseInt(id), penilaian);
    navigate('/admin/koreksi');
  };

  if (!data) return <div className="container p-8">Loading...</div>;

  return (
    <div className="container py-8">
      <h1>Koreksi {data.username}</h1>
      {data.detail_jawaban.filter(j => !j.is_dinilai).map(j => (
        <div key={j.soal_id} className="card mb-4">
          <KaTeXParser text={j.teks_soal} />
          <p><strong>Jawaban:</strong> {j.jawaban_peserta}</p>
          <input 
            type="number" 
            placeholder="Skor"
            onChange={(e) => setSkor({...skor, [j.soal_id]: parseInt(e.target.value)})}
          />
        </div>
      ))}
      <button className="btn btn-success" onClick={handleGrade}>Simpan Nilai</button>
    </div>
  );
};

export default GradeDetail;
