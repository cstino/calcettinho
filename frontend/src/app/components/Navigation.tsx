'use client';

import { NavBar } from "../../components/ui/tubelight-navbar";
import { 
  Home, 
  Users, 
  Calendar, 
  Trophy, 
  Settings,
  LogOut,
  User 
} from "lucide-react";
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

export default function Navigation() {
  const { userEmail, logout } = useAuth();

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
    {
      name: "Admin",
      url: "/admin",
      icon: Settings
    }
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