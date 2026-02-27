
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Pages
import Dashboard from './pages/Dashboard';
import Roster from './pages/Roster';
import TalentProfile from './pages/TalentProfile';
import Campaigns from './pages/Campaigns';
import Finance from './pages/Finance';
import TalentDashboard from './pages/TalentDashboard';
import TalentCalendar from './pages/TalentCalendar';
import Login from './pages/Login';
import Clients from './pages/Clients';
import CompanySettings from './pages/CompanySettings';
import Brands from './pages/Brands';

// Layout & Context
import { AppProvider, useApp } from './context/AppContext';
import { DesktopSidebar, MobileSidebar } from './components/layout/app-sidebar';
import { AppHeader } from './components/layout/app-header';
import { ToastContainer } from './components/layout/toast-container';
import { Button } from './components/ui/button';

const AppContent: React.FC = () => {
  const {
    auth, talents, campaigns, campaignTalents, appointments, income, extraCosts,
    isLoading
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-[3px] border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest animate-pulse">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return <Login />;
  }

  const isTalent = auth.user.role === 'talent';

  const collaborationsCompat = campaignTalents.map(ct => {
    const campaign = campaigns.find(c => c.id === ct.campaign_id);
    return {
      id: ct.id,
      talentId: ct.talent_id,
      brand: campaign?.brand || campaign?.name || '',
      campaignId: ct.campaign_id,
      type: campaign?.tipo || '',
      fee: ct.compenso_lordo,
      status: ct.stato === 'confermato' ? 'Confermata'
            : ct.stato === 'consegnato' || ct.stato === 'pagato' ? 'Completata'
            : ct.stato === 'rifiutato' ? 'Cancellata' : 'Bozza',
      paymentStatus: ct.stato === 'pagato' ? 'Saldato' : 'Non Saldato',
      paidAmount: ct.stato === 'pagato' ? ct.compenso_lordo : 0,
      notes: ct.note || '',
      deadline: ct.deadline || campaign?.deadline,
    };
  });

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <ToastContainer />
      <DesktopSidebar />
      <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <AppHeader onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 p-4 md:p-8 lg:p-10 max-w-[1600px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={
                isTalent ? <Navigate to="/my-dashboard" /> : <Dashboard />
              } />
              <Route path="/roster" element={isTalent ? <Navigate to="/my-dashboard" /> : <Roster />} />
              <Route path="/clients" element={isTalent ? <Navigate to="/my-dashboard" /> : <Clients />} />
              <Route path="/roster/:id" element={
                isTalent ? <Navigate to="/my-dashboard" /> :
                  <TalentProfile talents={talents} appointments={appointments} campaigns={campaigns} role={auth.user.role} />
              } />
              <Route path="/campaigns" element={isTalent ? <Navigate to="/my-dashboard" /> : <Campaigns />} />
              <Route path="/finance" element={
                isTalent ? <Navigate to="/my-finance" /> :
                  <Finance campaigns={campaigns} collaborations={collaborationsCompat as any} extraCosts={extraCosts} income={income} role={auth.user.role} talents={talents} />
              } />
              <Route path="/brands" element={isTalent ? <Navigate to="/my-dashboard" /> : <Brands />} />
              <Route path="/settings" element={isTalent ? <Navigate to="/my-dashboard" /> : <CompanySettings />} />

              <Route path="/my-dashboard" element={
                !isTalent ? <Navigate to="/" /> :
                  <TalentDashboard talentId={auth.user.talentId || ''} talents={talents} appointments={appointments} campaigns={campaigns} />
              } />
              <Route path="/my-calendar" element={
                !isTalent ? <Navigate to="/" /> :
                  <TalentCalendar talentId={auth.user.talentId || ''} />
              } />
              <Route path="/my-finance" element={
                !isTalent ? <Navigate to="/" /> :
                  <Finance campaigns={campaigns} collaborations={collaborationsCompat as any} extraCosts={[]} income={[]} role={auth.user.role} talentId={auth.user.talentId || ''} talents={talents} />
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
  constructor(props: { children: React.ReactNode }) { super(props); }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Uncaught error:", error, errorInfo); }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-10 text-center">
          <div className="max-w-md">
            <h1 className="text-3xl font-bold text-foreground mb-4">Qualcosa è andato storto</h1>
            <p className="text-muted-foreground mb-8 text-sm">Si è verificato un errore imprevisto. Prova a ricaricare la pagina.</p>
            <Button onClick={() => window.location.reload()} size="lg">Ricarica Pagina</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => (
  <HashRouter>
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  </HashRouter>
);

export default App;
