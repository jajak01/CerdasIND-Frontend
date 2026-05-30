import React, { useEffect, useState } from 'react';
import { adminService, type Student } from '../../services/admin.service';

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});

  const fetchStudents = async () => {
    try {
      const data = await adminService.getStudents();
      setStudents(data);
    } catch (err) {
      console.error('Failed to fetch students', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentStudent.id) {
        await adminService.updateStudent(currentStudent.id, currentStudent);
      } else {
        await adminService.createStudent(currentStudent as Omit<Student, 'id'>);
      }
      setShowModal(false);
      fetchStudents();
    } catch (err) {
      alert('Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Yakin ingin menghapus siswa ini?')) {
      try {
        await adminService.deleteStudent(id);
        fetchStudents();
      } catch (err) {
        alert('Gagal menghapus data');
      }
    }
  };

  if (loading) return <div className="container py-8">Loading...</div>;

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-display">Manajemen Siswa</h1>
        <button className="btn btn-primary shadow-sm" onClick={() => {
          setCurrentStudent({});
          setShowModal(true);
        }}>
          Tambah Siswa
        </button>
      </div>

      <div className="card-elevated overflow-x-auto bg-white border-ash-grey shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-onyx-black/10 bg-cloud-grey">
              <th className="p-4 font-bold uppercase tracking-widest text-xs">Nama</th>
              <th className="p-4 font-bold uppercase tracking-widest text-xs">Sekolah</th>
              <th className="p-4 font-bold uppercase tracking-widest text-xs">Kelas</th>
              <th className="p-4 font-bold uppercase tracking-widest text-xs">Kontak</th>
              <th className="p-4 font-bold uppercase tracking-widest text-xs">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id} className="border-b border-ash-grey hover:bg-paper-white transition-colors">
                <td className="p-4 font-bold text-body">{s.name}</td>
                <td className="p-4 text-body">{s.school}</td>
                <td className="p-4">
                  <span className="badge-pill bg-lavender-haze">{s.grade}</span>
                </td>
                <td className="p-4 font-stk-gerhard text-sm tracking-tighter">{s.contact}</td>
                <td className="p-4">
                  <div className="flex gap-4">
                    <button 
                      className="text-onyx-black font-bold hover:underline text-xs uppercase tracking-widest"
                      onClick={() => {
                        setCurrentStudent(s);
                        setShowModal(true);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="text-error font-bold hover:underline text-xs uppercase tracking-widest"
                      onClick={() => handleDelete(s.id)}
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-onyx-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-elevated bg-white w-full max-w-md border-none shadow-2xl">
            <h2 className="text-heading-sm mb-6">{currentStudent.id ? 'Edit Siswa' : 'Tambah Siswa'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="uppercase tracking-widest text-xs font-bold mb-2">Nama Lengkap</label>
                <input 
                  type="text" 
                  className="bg-cloud-grey focus:bg-white transition-colors"
                  value={currentStudent.name || ''}
                  onChange={e => setCurrentStudent({...currentStudent, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="uppercase tracking-widest text-xs font-bold mb-2">Sekolah</label>
                <input 
                  type="text" 
                  className="bg-cloud-grey focus:bg-white transition-colors"
                  value={currentStudent.school || ''}
                  onChange={e => setCurrentStudent({...currentStudent, school: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="uppercase tracking-widest text-xs font-bold mb-2">Kelas</label>
                  <input 
                    type="text" 
                    className="bg-cloud-grey focus:bg-white transition-colors"
                    value={currentStudent.grade || ''}
                    onChange={e => setCurrentStudent({...currentStudent, grade: e.target.value})}
                  />
                </div>
                <div>
                  <label className="uppercase tracking-widest text-xs font-bold mb-2">Kontak</label>
                  <input 
                    type="text" 
                    className="bg-cloud-grey focus:bg-white transition-colors font-stk-gerhard"
                    value={currentStudent.contact || ''}
                    onChange={e => setCurrentStudent({...currentStudent, contact: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="uppercase tracking-widest text-xs font-bold mb-2">Alamat</label>
                <textarea 
                  className="bg-cloud-grey focus:bg-white transition-colors h-24"
                  value={currentStudent.address || ''}
                  onChange={e => setCurrentStudent({...currentStudent, address: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
