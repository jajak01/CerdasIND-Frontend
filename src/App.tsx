import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './store/authStore';
import AppRouter from './router';
import Navbar from './components/common/Navbar';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <AppRouter />
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
