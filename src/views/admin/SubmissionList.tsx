import React, { useEffect, useState } from 'react';
import { adminService, type Submission } from '../../services/admin.service';

const SubmissionList: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const data = await adminService.getSubmissions('menunggu_koreksi');
        setSubmissions(data);
      } catch (err) {
        console.error('Failed to fetch submissions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  if (loading) return <div className="container p-8">Loading data...</div>;

  return (
    <div className="container py-8">
      <h1>Antrean Koreksi</h1>
      <div className="list-container">
        {(submissions || []).length === 0 ? (
          <p className="text-muted">Tidak ada ujian yang menunggu koreksi.</p>
        ) : (
          (submissions || []).map(s => (
            <div key={s.history_id} className="item-card">
              <div>
                <h3>{s.username} - {s.nama_bundle}</h3>
                <p className="text-muted">Disubmit pada: {new Date(s.tanggal_submit).toLocaleString()}</p>
              </div>
              <a href={`/admin/koreksi/${s.history_id}`} className="btn btn-primary">Periksa</a>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SubmissionList;
