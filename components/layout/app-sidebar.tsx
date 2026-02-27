import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Briefcase, Wallet, Bell,
  LogOut, Calendar as CalendarIcon, Building2, Settings, Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/' },
  { icon: Users, label: 'Roster', path: '/roster' },
  { icon: Building2, label: 'Clienti', path: '/clients' },
  { icon: Briefcase, label: 'Campagne', path: '/campaigns' },
  { icon: Tag, label: 'Brand', path: '/brands' },
  { icon: Wallet, label: 'Finanze', path: '/finance' },
  { icon: Settings, label: 'Impostazioni', path: '/settings' },
];

const talentNavItems = [
  { icon: LayoutDashboard, label: 'Hub Personale', path: '/my-dashboard' },
  { icon: CalendarIcon, label: 'Il Mio Calendario', path: '/my-calendar' },
  { icon: Wallet, label: 'I Miei Guadagni', path: '/my-finance' },
];

function NavItem({ icon: Icon, label, active, onClick }: {
  icon: any; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 group relative',
        active
          ? 'text-white bg-white/[0.08] border border-white/[0.1]'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
      )}
    >
      {active && (
        <motion.div
          layoutId="nav-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full"
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      )}
      <Icon size={18} className={cn(
        'transition-all duration-200',
        active ? 'text-primary' : 'group-hover:text-foreground'
      )} />
      <span>{label}</span>
    </button>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { auth, logout, talents } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const isTalent = auth.user?.role === 'talent';
  const currentTalent = isTalent ? talents.find(t => t.id === auth.user?.talentId) : null;
  const navItems = isTalent ? talentNavItems : adminNavItems;

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-blue-400 rounded-xl flex items-center justify-center font-black italic text-white text-sm shadow-lg shadow-primary/20">
            A
          </div>
          <span className="text-base font-bold tracking-tight">Advenire</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            active={
              location.pathname === item.path ||
              (item.path !== '/' && item.path !== '/my-dashboard' && location.pathname.startsWith(item.path))
            }
            onClick={() => handleNav(item.path)}
          />
        ))}
      </nav>

      {/* User */}
      <div className="p-3 mt-auto">
        <Separator className="mb-3" />
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] mb-2">
          <Avatar className="h-8 w-8">
            {isTalent && currentTalent?.photoUrl ? (
              <AvatarImage src={currentTalent.photoUrl} alt={auth.user?.name} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-tr from-primary to-purple-500 text-white text-[10px] font-bold">
              {auth.user?.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{auth.user?.name}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{auth.user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-200"
        >
          <LogOut size={18} />
          <span>Esci</span>
        </button>
      </div>
    </div>
  );
}

// Desktop sidebar
export function DesktopSidebar() {
  return (
    <aside className="hidden md:flex w-[260px] shrink-0 h-screen sticky top-0 flex-col bg-[#0a0a0a]/80 backdrop-blur-2xl border-r border-white/[0.06]">
      <SidebarContent />
    </aside>
  );
}

// Mobile sidebar (Sheet)
export function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 bg-[#0a0a0a]/95 backdrop-blur-2xl border-r border-white/[0.06]">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarContent onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
