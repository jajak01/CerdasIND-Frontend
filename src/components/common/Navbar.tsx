import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { LogOut, BookOpen, History, LayoutDashboard, CheckSquare, Users, Calendar } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  return (
    <nav className="navbar">
      <div className="container nav-content">
        <Link to="/" className="nav-brand group">
          Cerdas<span className="text-onyx-black group-hover:underline decoration-lemon-zest decoration-4">IND</span>
        </Link>
        
        <div className="nav-links">
          {user?.role === 'peserta' ? (
            <>
              <Link to="/" className="nav-link">
                <BookOpen size={16} />
                <span className="uppercase tracking-widest text-[11px] font-bold">Ujian</span>
              </Link>
              <Link to="/history" className="nav-link">
                <History size={16} />
                <span className="uppercase tracking-widest text-[11px] font-bold">Riwayat</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/admin/dashboard" className="nav-link">
                <LayoutDashboard size={16} />
                <span className="uppercase tracking-widest text-[11px] font-bold">Dashboard</span>
              </Link>
              <Link to="/admin/students" className="nav-link">
                <Users size={16} />
                <span className="uppercase tracking-widest text-[11px] font-bold">Siswa</span>
              </Link>
              <Link to="/admin/sessions" className="nav-link">
                <Calendar size={16} />
                <span className="uppercase tracking-widest text-[11px] font-bold">Sesi</span>
              </Link>
              <Link to="/admin/koreksi" className="nav-link">
                <CheckSquare size={16} />
                <span className="uppercase tracking-widest text-[11px] font-bold">Koreksi</span>
              </Link>
            </>
          )}
          
          <div className="nav-user">
            <span className="font-stk-gerhard text-xs font-bold bg-white px-3 py-1 rounded-full border border-onyx-black/10">
              {user?.username}
            </span>
            <button onClick={handleLogout} className="logout-btn hover:scale-110 transition-transform">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
