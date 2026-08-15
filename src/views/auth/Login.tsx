import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { authService } from '../../services/auth.service';
import { LogIn } from 'lucide-react';

type LocationState = {
  from?: {
    pathname?: string;
  };
};

const getLoginErrorMessage = (err: unknown) => {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return null;
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);
      login(response.data.token, {
        user_id: response.data.user_id,
        username: response.data.username,
        role: response.data.role,
      });

      const fromPath = (location.state as LocationState | null)?.from?.pathname;
      if (response.data.role === 'admin') {
        navigate(fromPath && fromPath.startsWith('/admin') ? fromPath : '/admin/dashboard', { replace: true });
      } else {
        navigate(fromPath && !fromPath.startsWith('/admin') ? fromPath : '/', { replace: true });
      }
    } catch (err: unknown) {
      setError(getLoginErrorMessage(err) || 'Login gagal. Periksa email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-vh-100 bg-buttermilk-yellow p-8" style={{ minHeight: '100vh' }}>
      <div className="card-elevated bg-white w-full max-w-md shadow-2xl p-12 border-none">
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-lemon-zest rounded-full mb-6 shadow-sm">
            <LogIn size={32} className="text-onyx-black" />
          </div>
          <h1 className="text-display text-4xl mb-3">Selamat Datang</h1>
          <p className="text-stone-grey font-medium text-sm">Masuk ke Dashboard CerdasIND</p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl text-xs font-bold uppercase tracking-widest mb-8 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="uppercase tracking-[0.2em] text-[10px] font-bold text-stone-grey mb-3 block">Alamat Email</label>
            <input
              type="email"
              className="bg-cloud-grey border-none focus:bg-white focus:ring-4 focus:ring-lemon-zest/30 transition-all p-4 rounded-xl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@cerdasind.id"
            />
          </div>

          <div>
            <label className="uppercase tracking-[0.2em] text-[10px] font-bold text-stone-grey mb-3 block">Kata Sandi</label>
            <input
              type="password"
              className="bg-cloud-grey border-none focus:bg-white focus:ring-4 focus:ring-lemon-zest/30 transition-all p-4 rounded-xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block py-5 text-lg shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all" 
            disabled={loading}
          >
            {loading ? 'Mengotentikasi...' : 'Masuk Sekarang'}
          </button>
        </form>

        <div className="text-center mt-12 pt-8 border-t border-ash-grey">
          <p className="text-xs text-stone-grey font-bold uppercase tracking-widest">
            Butuh bantuan akses? <Link to="/register" className="text-onyx-black underline decoration-lemon-zest decoration-4 underline-offset-4">Hubungi Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
