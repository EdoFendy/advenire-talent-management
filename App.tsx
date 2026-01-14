
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase, Wallet, Bell, Search,
  Menu, X, LogOut, ChevronRight, Calendar as CalendarIcon,
  Settings, User, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Pages
import Dashboard from './pages/Dashboard';
import Roster from './pages/Roster';
import TalentProfile from './pages/TalentProfile';
import Campaigns from './pages/Campaigns';
import Finance from './pages/Finance';
import TalentDashboard from './pages/TalentDashboard';
import TalentCalendar from './pages/TalentCalendar';
import Login from './pages/Login';
import Brands from './pages/Brands';

// Context & Types
import { AppProvider, useApp } from './context/AppContext';
import { Role } from './types';

// Components
// Removed external toaster for custom implementation compatible with Context

const ToastContainer = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className={`pointer-events-auto flex items-center p-4 rounded-xl shadow-2xl border backdrop-blur-md w-80 ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
              toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                'bg-blue-500/10 border-blue-500/20 text-blue-500'
              }`}
          >
            <div className={`w-2 h-2 rounded-full mr-3 ${toast.type === 'success' ? 'bg-emerald-500' :
              toast.type === 'error' ? 'bg-red-500' :
                'bg-blue-500'
              }`} />
            <p className="text-xs font-black uppercase tracking-wide flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="ml-2 hover:opacity-70"><X size={14} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, path, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-6 py-4 rounded-2xl transition-all duration-300 group ${active
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
      : 'text-zinc-500 hover:bg-white/5 hover:text-white'
      }`}
  >
    <Icon size={20} className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
    <span className="font-black uppercase text-xs tracking-widest">{label}</span>
    {active && <ChevronRight size={14} className="ml-auto animate-pulse" />}
  </button>
);

const AppContent: React.FC = () => {
  const {
    auth, logout,
    talents, campaigns, collaborations, appointments, income, extraCosts, brands,
    addTalent, addCampaign, addCollaboration, updateCollaboration, importTalentsCSV,
    addIncome, updateIncome, deleteIncome,
    addBrand, updateBrand, deleteBrand,
    isLoading, isOnline, notifications
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-500 text-xs font-black uppercase tracking-widest animate-pulse">Caricamento in corso...</p>
        </div>
      </div>
    );
  }

  // Auth Guard
  if (!auth.user) {
    return <Login />;
  }

  const isTalent = auth.user.role === 'talent';
  const currentTalent = isTalent ? talents.find(t => t.id === auth.user.talentId) : null;

  const navItems = isTalent ? [
    { icon: LayoutDashboard, label: 'Hub Personale', path: '/my-dashboard' },
    { icon: CalendarIcon, label: 'Il Mio Calendario', path: '/my-calendar' },
    { icon: Wallet, label: 'I Miei Guadagni', path: '/my-finance' },
  ] : [
    { icon: LayoutDashboard, label: 'Dashboard Operativa', path: '/' },
    { icon: Users, label: 'Roster Talent', path: '/roster' },
    { icon: Building2, label: 'Brand & Clienti', path: '/brands' },
    { icon: Briefcase, label: 'Campagne', path: '/campaigns' },
    { icon: Wallet, label: 'Finance', path: '/finance' },
  ];

  return (
    <div className="flex min-h-screen bg-black text-zinc-100 font-sans selection:bg-blue-500/30">
      {/* Toast Overlay */}
      <ToastContainer />

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="fixed md:relative z-40 h-screen bg-[#0c0c0c] border-r border-white/5 flex flex-col overflow-hidden"
      >
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black italic text-white">A</div>
            <span className="text-lg font-black tracking-tighter uppercase">Advenire</span>
          </div>
        </div>

        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <SidebarItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              active={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
            />
          ))}
        </div>

        <div className="p-4 border-t border-white/5 space-y-2">
          <div className="px-4 py-3 bg-zinc-900/50 rounded-xl mb-2">
            <div className="flex items-center space-x-3">
              {isTalent && currentTalent?.photoUrl ? (
                <img src={currentTalent.photoUrl} className="w-8 h-8 rounded-full object-cover border border-white/10" alt="" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-black uppercase">
                  {auth.user.name.substring(0, 2)}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-xs font-black text-white truncate">{auth.user.name}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{auth.user.role}</p>
              </div>
            </div>
          </div>
          <SidebarItem
            icon={LogOut}
            label="Esci"
            path="#"
            active={false}
            onClick={logout}
          />
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen relative">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-zinc-800 rounded-xl transition-all">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Global Search Trigger (Visual Only for now, or opens modal) */}
            {/* Notifications */}
            <button className="relative p-2 hover:bg-zinc-800 rounded-xl transition-all group">
              <Bell size={20} className="text-zinc-500 group-hover:text-white" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border border-black" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-[1600px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <Routes>
              {/* Admin Routes */}
              <Route path="/" element={
                isTalent ? <Navigate to="/my-dashboard" /> :
                  <Dashboard
                    appointments={appointments}
                    talents={talents}
                    collaborations={collaborations}
                  />
              } />
              <Route path="/roster" element={
                isTalent ? <Navigate to="/my-dashboard" /> :
                  <Roster talents={talents} addTalent={addTalent} importTalentsCSV={importTalentsCSV} />
              } />
              <Route path="/brands" element={
                isTalent ? <Navigate to="/my-dashboard" /> :
                  <Brands brands={brands} addBrand={addBrand} updateBrand={updateBrand} deleteBrand={deleteBrand} />
              } />
              <Route path="/roster/:id" element={
                isTalent ? <Navigate to="/my-dashboard" /> :
                  <TalentProfile
                    talents={talents}
                    collaborations={collaborations}
                    appointments={appointments}
                    campaigns={campaigns}
                    addCollaboration={addCollaboration}
                    role={auth.user.role}
                  />
              } />
              <Route path="/campaigns" element={
                isTalent ? <Navigate to="/my-dashboard" /> :
                  <Campaigns
                    campaigns={campaigns}
                    brands={brands}
                    addCampaign={addCampaign}
                    addCollaboration={addCollaboration}
                    updateCollaboration={updateCollaboration}
                    income={income}
                    addIncome={addIncome}
                    updateIncome={updateIncome}
                    deleteIncome={deleteIncome}
                    collaborations={collaborations}
                    talents={talents}
                  />
              } />
              <Route path="/finance" element={
                isTalent ? <Navigate to="/my-finance" /> :
                  <Finance
                    campaigns={campaigns}
                    collaborations={collaborations}
                    extraCosts={extraCosts}
                    income={income}
                    role={auth.user.role}
                    talents={talents}
                  />
              } />

              {/* Talent Routes */}
              <Route path="/my-dashboard" element={
                !isTalent ? <Navigate to="/" /> :
                  <TalentDashboard
                    talentId={auth.user.talentId || ''}
                    talents={talents}
                    appointments={appointments}
                    collaborations={collaborations}
                    campaigns={campaigns}
                  />
              } />
              <Route path="/my-calendar" element={
                !isTalent ? <Navigate to="/" /> :
                  <TalentCalendar
                    talentId={auth.user.talentId || ''}
                    appointments={appointments}
                    collaborations={collaborations}
                    campaigns={campaigns}
                  />
              } />
              <Route path="/my-finance" element={
                !isTalent ? <Navigate to="/" /> :
                  <Finance
                    campaigns={campaigns}
                    collaborations={collaborations}
                    extraCosts={[]}
                    income={[]}
                    role={auth.user.role}
                    talentId={auth.user.talentId || ''}
                    talents={talents}
                  />
              } />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  constructor(props: { children: React.ReactNode }) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-10 text-center">
          <div>
            <h1 className="text-4xl font-black text-white mb-4">Qualcosa è andato storto.</h1>
            <p className="text-zinc-500 mb-8">Si è verificato un errore imprevisto. Prova a ricaricare la pagina.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700transition-all"
            >
              Ricarica Pagina
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <HashRouter>
      <ErrorBoundary>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ErrorBoundary>
    </HashRouter>
  );
};

export default App;
