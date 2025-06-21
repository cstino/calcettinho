'use client';

import { NavBar } from "../../components/ui/tubelight-navbar";
import { 
  Home, 
  Users, 
  Calendar, 
  Trophy, 
  LogOut,
  User,
  UserCircle,
  Shield,
  BarChart3
} from "lucide-react";
import Logo from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

export default function Navigation() {
  const { userEmail, logout } = useAuth();
  const { hasUnseenEvolutions, evolutionCount } = useNotifications();
  const pathname = usePathname();
  const [showMobileNav, setShowMobileNav] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Gestione scroll per mostrare/nascondere navigation mobile
  useEffect(() => {
    const handleScroll = () => {
      // Mostra la navigation quando si scrolla
      setShowMobileNav(true);
      
      // Cancella il timeout precedente se esiste
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Imposta un nuovo timeout per nascondere la navigation dopo 2 secondi di inattività
      scrollTimeoutRef.current = setTimeout(() => {
        setShowMobileNav(false);
      }, 2000);
    };

    // Aggiungi listener per scroll solo su mobile
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      
      // Nascondi inizialmente dopo 3 secondi
      scrollTimeoutRef.current = setTimeout(() => {
        setShowMobileNav(false);
      }, 3000);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []); // Nessuna dipendenza per evitare loop

  const navItems = [
    {
      name: "Home",
      url: "/",
      icon: Home
    },
    {
      name: "Cards", 
      url: "/players",
      icon: Shield
    },
    {
      name: "Match",
      url: "/matches", 
      icon: Calendar
    },
    {
      name: "Stats",
      url: "/stats",
      icon: BarChart3
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

  // Funzione per gestire il click e il timeout
  const handleNavClick = () => {
    setShowMobileNav(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setShowMobileNav(false);
    }, 2000);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:block">
        <NavBar items={navItems} logo={logoComponent} userComponent={userComponent} />
      </div>

      {/* Mobile Bottom Navigation */}
      <AnimatePresence>
        {showMobileNav && (
          <motion.div 
            className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-4"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="mx-4">
              <motion.div 
                className="bg-black neon-border rounded-full px-6 py-4 shadow-2xl relative overflow-hidden backdrop-blur-xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Effetti glow interni */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-green-500/5 rounded-full"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/3 to-transparent rounded-full"></div>
                <div className="flex items-center justify-between relative z-10">
                  {navItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.url;
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.url}
                        className="relative flex items-center justify-center transition-all duration-300"
                        onClick={handleNavClick}
                      >
                        <motion.div
                          className={`relative flex items-center gap-2 transition-all duration-300 ${
                            isActive 
                              ? 'bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 px-4 py-2 rounded-full shadow-lg neon-glow' 
                              : 'p-2 hover:bg-white/5 rounded-full'
                          }`}
                          animate={{
                            scale: isActive ? 1.05 : 1,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30
                          }}
                          whileHover={{ scale: isActive ? 1.05 : 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Icon 
                            size={isActive ? 22 : 20} 
                            className={`transition-all duration-300 ${
                              isActive ? 'text-white drop-shadow-lg' : 'text-purple-200/80 hover:text-purple-300'
                            }`} 
                          />
                          
                          {/* Nome - appare solo se attivo */}
                          <AnimatePresence>
                            {isActive && (
                              <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ 
                                  duration: 0.2,
                                  delay: 0.1 
                                }}
                                className="text-sm font-semibold text-white font-runtime whitespace-nowrap overflow-hidden"
                              >
                                {item.name}
                              </motion.span>
                            )}
                          </AnimatePresence>
                          
                          {/* Badge notifiche */}
                          {item.badge && item.badge > 0 && (
                            <motion.div
                              className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                              <span className="text-xs font-bold text-white">
                                {item.badge > 9 ? '9+' : item.badge}
                              </span>
                            </motion.div>
                          )}
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer per il contenuto sopra la bottom navigation mobile */}
      <div className="lg:hidden h-0"></div>
    </>
  );
} 