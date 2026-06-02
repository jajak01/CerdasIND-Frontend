import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { LogOut, BookOpen, History, LayoutDashboard, CheckSquare, Users, Calendar, FileText, NotebookPen, Menu, X } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false);
  };

  if (!isAuthenticated) return null;

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="container nav-content">
        <Link to="/" className="nav-brand group" onClick={closeMenu}>
          Cerdas<span className="text-onyx-black group-hover:underline decoration-lemon-zest decoration-4">IND</span>
        </Link>

        <button className="mobile-menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        <div className={`nav-links-container ${isMenuOpen ? 'active' : ''}`}>
          <div className="nav-links">
            {user?.role === 'peserta' ? (
              <>
                <Link to="/" className="nav-link" onClick={closeMenu}>
                  <BookOpen size={16} />
                  <span className="uppercase tracking-widest text-[11px] font-bold">Ujian</span>
                </Link>
                <Link to="/history" className="nav-link" onClick={closeMenu}>
                  <History size={16} />
                  <span className="uppercase tracking-widest text-[11px] font-bold">Riwayat</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/admin/dashboard" className="nav-link" onClick={closeMenu}>
                  <LayoutDashboard size={16} />
                  <span className="uppercase tracking-widest text-[11px] font-bold">Dashboard</span>
                </Link>
                <Link to="/admin/students" className="nav-link" onClick={closeMenu}>
                  <Users size={16} />
                  <span className="uppercase tracking-widest text-[11px] font-bold">Siswa</span>
                </Link>
                <Link to="/admin/sessions" className="nav-link" onClick={closeMenu}>
                  <Calendar size={16} />
                  <span className="uppercase tracking-widest text-[11px] font-bold">Sesi</span>
                </Link>
                <Link to="/admin/koreksi" className="nav-link" onClick={closeMenu}>
                  <CheckSquare size={16} />
                  <span className="uppercase tracking-widest text-[11px] font-bold">Koreksi</span>
                </Link>
                <Link to="/admin/invoice" className="nav-link" onClick={closeMenu}>
                  <FileText size={16} />
                  <span className="uppercase tracking-widest text-[11px] font-bold">Invoice</span>
                </Link>
                <Link to="/admin/report" className="nav-link" onClick={closeMenu}>
                  <NotebookPen size={16} />
                  <span className="uppercase tracking-widest text-[11px] font-bold">Report</span>
                </Link>
              </>
            )}
          </div>
          
          <div className="nav-user">
            <span className="username-badge font-stk-gerhard text-xs font-bold bg-white px-3 py-1 rounded-full border border-onyx-black/10">
              {user?.username}
            </span>
            <button onClick={handleLogout} className="logout-btn hover:scale-110 transition-transform">
              <LogOut size={18} />
              <span className="logout-text">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
