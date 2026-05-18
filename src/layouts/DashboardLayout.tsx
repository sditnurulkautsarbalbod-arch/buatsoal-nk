import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useDraftStore } from '@/store/useDraftStore';
import { useState, useEffect } from 'react';
import { cloudflareService } from '@/services/cloudflareService';
import {
  FileText,
  Home,
  LogOut,
  Settings,
  BookOpen,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function DashboardLayout() {
  const { isAuthenticated, logout, user } = useAuthStore();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Initialize D1 Schema when dashboard loads
    const initDB = async () => {
      try {
        await cloudflareService.initSchema();
        console.log('D1 Schema initialized successfully');
        // Now fetch drafts
        await useDraftStore.getState().fetchDraftsFromCloudflare();
      } catch (err) {
        console.error('Failed to initialize D1 Schema or fetch drafts:', err);
      }
    };
    initDB();
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { name: 'Dashboard', href: '/', icon: Home, adminOnly: false },
    { name: 'Admin Panel', href: '/admin', icon: Settings, adminOnly: true },
    { name: 'Editor Soal', href: '/editor', icon: FileText, adminOnly: false },
    { name: 'Bank Soal', href: '/bank-soal', icon: BookOpen, adminOnly: false },
    { name: 'Pengaturan', href: '/pengaturan', icon: Settings, adminOnly: false },
  ];

  const filteredNavItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin');

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out relative ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`h-16 flex items-center border-b border-slate-200 gap-3 px-6 ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-8 h-8 shrink-0 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">E</div>
          {!isSidebarCollapsed && (
            <span className="text-xl font-bold text-slate-800 tracking-tight leading-none truncate">EduScript Pro</span>
          )}
        </div>

        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm z-10 transition-colors"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto no-scrollbar">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                title={isSidebarCollapsed ? item.name : ''}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                } ${isSidebarCollapsed ? 'justify-center px-0 mx-auto w-12 h-12' : ''}`}
              >
                <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        <div className={`p-4 border-t border-slate-200 ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-10 h-10 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold uppercase transition-transform hover:scale-105">
                  {user?.nama?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{user?.nama}</p>
                  <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 rounded-xl w-full transition-colors group"
              >
                <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Keluar
              </button>
            </>
          ) : (
            <button
              onClick={logout}
              title="Keluar"
              className="w-12 h-12 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-72 bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">E</div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">EduScript Pro</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 py-6 px-4 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
        <div className="p-6 border-t border-slate-200">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 text-red-600 font-medium hover:bg-red-50 rounded-xl w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header for Mobile & Desktop toggle */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">E</div>
              <span className="text-lg font-bold text-slate-800 tracking-tight">EduScript Pro</span>
            </div>
            
            {/* Context breadcrumb or page title could go here */}
            <div className="hidden md:block">
               <h1 className="text-sm font-medium text-slate-500 capitalize">
                 {location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1).replace('-', ' ')}
               </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Server Online</span>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

