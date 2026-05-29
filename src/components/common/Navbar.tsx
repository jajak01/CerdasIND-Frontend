import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { LogOut, BookOpen, History, LayoutDashboard, CheckSquare } from 'lucide-react';

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
        <Link to="/" className="nav-brand">
          CerdasIND
        </Link>
        
        <div className="nav-links">
          {user?.role === 'peserta' ? (
            <>
              <Link to="/" className="nav-link">
                <BookOpen size={18} />
                <span>Ujian</span>
              </Link>
              <Link to="/history" className="nav-link">
                <History size={18} />
                <span>Riwayat</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/admin/dashboard" className="nav-link">
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>
              <Link to="/admin/koreksi" className="nav-link">
                <CheckSquare size={18} />
                <span>Koreksi</span>
              </Link>
            </>
          )}
          
          <div className="nav-user">
            <span className="username">{user?.username}</span>
            <button onClick={handleLogout} className="logout-btn">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
