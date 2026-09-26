import React from 'react';
import { LogOut, Settings, User, FileText, FolderOpen } from 'lucide-react';
import { User as UserType } from '../types';

interface LayoutProps {
  user: UserType;
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ user, children, currentView, onViewChange, onLogout }) => {
  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: FolderOpen },
    { id: 'admin', name: 'Admin Panel', icon: Settings, adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-slate-900">DocStructor</h1>
              </div>
              
              <nav className="hidden md:flex space-x-1 ml-8">
                {navigation.map((item) => {
                  if (item.adminOnly && user.role !== 'admin') return null;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onViewChange(item.id)}
                      className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                        isActive 
                          ? 'bg-blue-100 text-blue-700 font-medium' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <User className="w-4 h-4" />
                <span className="font-medium">{user.username}</span>
                <span className="px-2 py-1 bg-slate-100 rounded-full text-xs font-medium">
                  {user.role}
                </span>
              </div>
              
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;