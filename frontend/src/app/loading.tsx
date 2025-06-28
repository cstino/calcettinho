'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      {/* Background animato */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-green-900/20" />
      
      {/* Particelle animate di background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-400/30 rounded-full animate-ping" 
             style={{ animationDelay: '0s', animationDuration: '3s' }} />
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-green-300/20 rounded-full animate-ping" 
             style={{ animationDelay: '1s', animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-green-500/25 rounded-full animate-ping" 
             style={{ animationDelay: '2s', animationDuration: '3.5s' }} />
      </div>

      {/* Container principale */}
      <div className="relative z-10 flex flex-col items-center space-y-8 px-8">
        
        {/* Logo e branding */}
        <div className="flex flex-col items-center space-y-4">
          {/* Logo principale */}
          <div className="relative">
            {/* Cerchio esterno animato */}
            <div className="w-24 h-24 border-4 border-green-500/30 rounded-full animate-spin" 
                 style={{ animationDuration: '3s' }} />
            
            {/* Cerchio interno */}
            <div className="absolute inset-2 w-20 h-20 border-2 border-green-400/50 rounded-full animate-pulse" />
            
            {/* Icona calcio centrale */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-2xl">⚽</span>
              </div>
            </div>
          </div>

          {/* Titolo */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2 animate-fade-in">
              Calcettinho
            </h1>
            <p className="text-green-400 text-lg font-medium animate-fade-in-delay">
              La tua app di calcetto
            </p>
          </div>
        </div>

        {/* Barra di caricamento animata */}
        <div className="w-64 max-w-full">
          <div className="bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-loading-bar" />
          </div>
          <p className="text-gray-400 text-sm text-center mt-3 animate-pulse">
            Caricamento in corso...
          </p>
        </div>

        {/* Features highlights */}
        <div className="grid grid-cols-3 gap-6 mt-8 text-center">
          <div className="flex flex-col items-center space-y-2 animate-fade-in-up" 
               style={{ animationDelay: '0.5s' }}>
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <span className="text-green-400">🏆</span>
            </div>
            <span className="text-gray-300 text-xs font-medium">Statistiche</span>
          </div>
          
          <div className="flex flex-col items-center space-y-2 animate-fade-in-up" 
               style={{ animationDelay: '0.7s' }}>
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <span className="text-green-400">🗳️</span>
            </div>
            <span className="text-gray-300 text-xs font-medium">Votazioni</span>
          </div>
          
          <div className="flex flex-col items-center space-y-2 animate-fade-in-up" 
               style={{ animationDelay: '0.9s' }}>
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <span className="text-green-400">🎴</span>
            </div>
            <span className="text-gray-300 text-xs font-medium">Carte</span>
          </div>
        </div>

        {/* Versione e stato PWA */}
        <div className="text-center text-gray-500 text-xs mt-8">
          <p>v2.1 - PWA Ready</p>
          <p className="mt-1 flex items-center justify-center space-x-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>Sistema avanzato</span>
          </p>
        </div>
      </div>

      {/* Stili CSS personalizzati */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-delay {
          0%, 30% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        
        .animate-fade-in-delay {
          animation: fade-in-delay 1.2s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
        
        .animate-loading-bar {
          animation: loading-bar 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
} 