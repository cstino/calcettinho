'use client';

import { NavBar } from "../../components/ui/tubelight-navbar";
import { 
  Home, 
  Users, 
  Calendar, 
  Trophy, 
  LogOut,
  User,
  UserCircle
} from "lucide-react";
import Logo from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

export default function Navigation() {
  const { userEmail, logout } = useAuth();
  const { hasUnseenEvolutions, evolutionCount } = useNotifications();

  const navItems = [
    {
      name: "Home",
      url: "/",
      icon: Home
    },
    {
      name: "Giocatori", 
      url: "/players",
      icon: Users
    },
    {
      name: "Partite",
      url: "/matches", 
      icon: Calendar
    },
    {
      name: "Statistiche",
      url: "/stats",
      icon: Trophy
    },
    ...(userEmail ? [{
      name: "Profilo",
      url: `/profile/${encodeURIComponent(userEmail)}`,
      icon: UserCircle,
      badge: hasUnseenEvolutions ? evolutionCount : undefined,
      badgeColor: 'bg-red-500'
    }] : [])
  ];

  const logoComponent = (
    <Logo
      type="simbolo"
      width={24}
      height={24}
      className="w-6 h-6"
    />
  );

  // Componente per l'area utente
  const userComponent = userEmail ? (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <User className="w-4 h-4" />
        <span className="hidden sm:inline">{userEmail}</span>
      </div>
      {hasUnseenEvolutions && (
        <div className="relative">
          <div className="flex items-center gap-2 px-2 py-1 bg-red-600/90 text-white rounded-full text-xs font-bold animate-pulse">
            <span>🏆</span>
            <span>{evolutionCount} Evoluzion{evolutionCount === 1 ? 'e' : 'i'}</span>
          </div>
        </div>
      )}
      <button
        onClick={logout}
        className="flex items-center gap-2 px-3 py-1 bg-red-600/80 hover:bg-red-700/80 text-white rounded-lg transition-colors text-sm"
        title="Logout"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Esci</span>
      </button>
    </div>
  ) : null;

  return <NavBar items={navItems} logo={logoComponent} userComponent={userComponent} />;
} 