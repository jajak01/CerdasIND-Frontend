import React, { useCallback, useEffect, useRef, useState } from 'react';
import { adminService, type Student } from '../../services/admin.service';
import toast from 'react-hot-toast';

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
  const closeTimerRef = useRef<number | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      const data = await adminService.getStudents();
      setStudents(data);
    } catch (err) {
      console.error('Failed to fetch students', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const data = await adminService.getStudents();
        if (isMounted) {
          setStudents(data);
        }
      } catch (err) {
        console.error('Failed to fetch students', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const closeModal = useCallback(() => {
    if (!showModal || isClosingModal) {
      return;
    }

    setIsClosingModal(true);
    closeTimerRef.current = window.setTimeout(() => {
      setShowModal(false);
      setIsClosingModal(false);
      closeTimerRef.current = null;
    }, 220);
  }, [isClosingModal, showModal]);

  const openModal = useCallback((student: Partial<Student>) => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setCurrentStudent({
      name: '',
      school: '',
      grade: '',
      contact: '',
      address: '',
      is_active: true,
      ...student,
    });
    setIsClosingModal(false);
    setShowModal(true);
  }, []);

  useEffect(() => {
    if (!showModal && !isClosingModal) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeModal, isClosingModal, showModal]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentStudent.id) {
        await adminService.updateStudent(currentStudent.id, currentStudent);
        toast.success('Data siswa berhasil diperbarui');
      } else {
        await adminService.createStudent(currentStudent as Omit<Student, 'id'>);
        toast.success('Siswa baru berhasil ditambahkan');
      }
      closeModal();
      loadStudents();
    } catch {
      toast.error('Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Yakin ingin menghapus siswa ini?')) {
      try {
        await adminService.deleteStudent(id);
        toast.success('Data siswa berhasil dihapus');
        loadStudents();
      } catch {
        toast.error('Gagal menghapus data');
      }
    }
  };

  if (loading) return <div className="container py-8">Loading...</div>;

  const activeStudents = students.filter((student) => student.is_active).length;

  return (
    <div className="container py-8 students-page">
      <div className="students-hero mb-8">
        <div>
          <p className="students-kicker">Admin Panel</p>
          <h1 className="text-display">Manajemen Siswa</h1>
          <p className="students-subtitle">
            Kelola data siswa dengan tampilan tabel yang lebih rapi dan form edit yang muncul sebagai layer terpisah.
          </p>
        </div>
        <div className="students-hero-actions">
          <div className="students-stat">
            <span className="students-stat-label">Total</span>
            <span className="students-stat-value">{students.length}</span>
          </div>
          <div className="students-stat">
            <span className="students-stat-label">Aktif</span>
            <span className="students-stat-value">{activeStudents}</span>
          </div>
          <button
            className="btn btn-primary shadow-sm"
            onClick={() => openModal({ is_active: true })}
          >
            Tambah Siswa
          </button>
        </div>
      </div>

      <div className="students-table-shell card-elevated bg-white border-ash-grey shadow-sm">
        <div className="students-table-toolbar">
          <div>
            <h2 className="students-table-title">Daftar Siswa</h2>
            <p className="students-table-caption">Gunakan aksi edit untuk membuka form pop-out tanpa mengganggu fokus pada tabel.</p>
          </div>
          <div className="students-table-pill">
            {students.length} data ditampilkan
          </div>
        </div>

        <div className="students-table-scroll">
          <table className="students-table w-full text-left border-collapse">
          <thead>
            <tr className="students-table-head">
              <th className="students-th students-col-name">Nama</th>
              <th className="students-th students-col-school">Sekolah</th>
              <th className="students-th students-col-grade">Kelas</th>
              <th className="students-th students-col-status">Status</th>
              <th className="students-th students-col-contact">Kontak</th>
              <th className="students-th students-col-actions">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td className="students-empty-state" colSpan={6}>
                  Belum ada data siswa.
                </td>
              </tr>
            ) : (
              students.map((s) => (
              <tr key={s.id} className="students-row">
                <td className="students-td students-cell-strong">{s.name}</td>
                <td className="students-td">{s.school}</td>
                <td className="students-td">
                  <span className="badge-pill bg-lavender-haze">{s.grade}</span>
                </td>
                <td className="students-td">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    s.is_active ? 'bg-jade-green text-onyx-black' : 'bg-stone-grey/20 text-stone-grey'
                  }`}>
                    {s.is_active ? 'Aktif' : 'Non Aktif'}
                  </span>
                </td>
                <td className="students-td font-stk-gerhard text-sm tracking-tighter">{s.contact}</td>
                <td className="students-td">
                  <div className="students-actions">
                    <button 
                      className="students-action-edit"
                      onClick={() => {
                        openModal(s);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="students-action-delete"
                      onClick={() => handleDelete(s.id)}
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))
            )}
          </tbody>
          </table>
        </div>
      </div>

      {(showModal || isClosingModal) && (
        <div
          className={`students-modal-overlay ${isClosingModal ? 'is-closing' : 'is-open'}`}
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="students-modal-panel card-elevated bg-white w-full max-w-md border-none shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="students-modal-header">
              <div>
                <p className="students-kicker">Form Siswa</p>
                <h2 id="student-modal-title" className="text-heading-sm">
                  {currentStudent.id ? 'Edit Siswa' : 'Tambah Siswa'}
                </h2>
              </div>
              <button type="button" className="students-modal-close" onClick={closeModal}>
                Tutup
              </button>
            </div>

            <form onSubmit={handleSubmit} className="students-form space-y-6">
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
              <div>
                <label className="uppercase tracking-widest text-xs font-bold mb-2">Status Siswa</label>
                <select
                  className="bg-cloud-grey focus:bg-white transition-colors"
                  value={currentStudent.is_active === false ? 'false' : 'true'}
                  onChange={e => setCurrentStudent({...currentStudent, is_active: e.target.value === 'true'})}
                >
                  <option value="true">Aktif</option>
                  <option value="false">Non Aktif</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" className="btn btn-outline" onClick={closeModal}>Batal</button>
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
