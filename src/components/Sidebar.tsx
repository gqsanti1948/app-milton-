import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  ClipboardList,
  TrendingUp,
  FileText,
  Settings,
} from 'lucide-react';
import { useClinicConfig } from '../hooks/useClinicConfig';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/sessoes', label: 'Sessões', icon: ClipboardList },
  { to: '/financeiro', label: 'Financeiro', icon: TrendingUp },
  { to: '/recibos', label: 'Recibos', icon: FileText },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const { config } = useClinicConfig();

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 flex flex-col z-40"
      style={{ backgroundColor: '#112233' }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <h1
          className="text-2xl font-bold tracking-wide"
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', color: '#c8784a' }}
        >
          PsiManager
        </h1>
        <p className="text-xs text-white/40 mt-1">Sistema de Gestão</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'text-white border-l-2 pl-[10px]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { borderColor: '#c8784a', backgroundColor: '#1c3352' }
                : {}
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="w-4.5 h-4.5 flex-shrink-0"
                  size={18}
                  style={{ color: isActive ? '#c8784a' : undefined }}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer - Psychiatrist Name */}
      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-xs text-white/40 mb-0.5">Logado como</p>
        <p className="text-sm text-white/80 font-medium truncate">{config.psychiatristName}</p>
        <p className="text-xs text-white/40 truncate">{config.crm}</p>
      </div>
    </aside>
  );
}
