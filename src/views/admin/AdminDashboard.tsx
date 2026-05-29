import React, { useEffect, useState } from 'react';
import { adminService, type Bundle } from '../../services/admin.service';

const AdminDashboard: React.FC = () => {
  const [bundles, setBundles] = useState<Bundle[]>([]);

  useEffect(() => {
    adminService.getBundles().then((data) => {
      if (Array.isArray(data)) {
        setBundles(data);
      } else {
        setBundles([]);
      }
    });
  }, []);

  return (
    <div className="container py-8">
      <h1>Dashboard Admin</h1>
      <div className="card">
        <h2>Paket Soal</h2>
        <input type="file" onChange={(e) => {
          if (e.target.files) {
            const formData = new FormData();
            formData.append('file', e.target.files[0]);
            formData.append('nama_bundle', 'Paket Baru');
            formData.append('waktu_menit', '60');
            formData.append('mapel_id', '1');
            adminService.uploadBundle(formData).then(() => alert('Upload sukses'));
          }
        }} />
      </div>
      <div className="list-container">
        {bundles?.map(b => (
          <div key={b.id} className="item-card">
            <h3>{b.nama_bundle}</h3>
            <button className="btn btn-outline" onClick={() => adminService.exportBundle(b.id)}>Export</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
