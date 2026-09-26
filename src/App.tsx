import React, { useState, useEffect } from 'react';
import { User } from './types';
import { saveUser, getUser, clearUser, initializeSampleData } from './utils/storage';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [loginError, setLoginError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize sample data on first load
    initializeSampleData();
    
    // Check for existing user session
    const existingUser = getUser();
    if (existingUser) {
      setUser(existingUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = (username: string, password: string) => {
    setLoginError('');
    
    // Simple authentication logic
    if (username === 'admin' && password === 'admin123') {
      const newUser: User = { username: 'admin', role: 'admin' };
      setUser(newUser);
      saveUser(newUser);
    } else if (username === 'user' && password === 'user123') {
      const newUser: User = { username: 'user', role: 'user' };
      setUser(newUser);
      saveUser(newUser);
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setUser(null);
    clearUser();
    setCurrentView('dashboard');
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading DocStructor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} error={loginError} />;
  }

  return (
    <Layout 
      user={user} 
      currentView={currentView}
      onViewChange={handleViewChange}
      onLogout={handleLogout}
    >
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'admin' && user.role === 'admin' && <AdminPanel />}
    </Layout>
  );
}

export default App;