'use client';

import React from 'react';
import Logo from './components/Logo';

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      {/* Container principale centrato */}
      <div className="flex flex-col items-center space-y-8">
        
        {/* Logo Calcettinho */}
        <div className="animate-fade-in">
          <Logo 
            type="logo-completo" 
            width={280} 
            height={120} 
            className="w-70 h-auto drop-shadow-2xl"
          />
        </div>

        {/* Barra di caricamento */}
        <div className="w-80 max-w-sm animate-fade-in-delay">
          <div className="bg-gray-800/50 rounded-full h-2 overflow-hidden backdrop-blur-sm border border-gray-700/50">
            <div className="h-full bg-gradient-to-r from-green-400 via-green-500 to-green-600 rounded-full animate-loading-progress shadow-lg shadow-green-500/25" />
          </div>
          <p className="text-gray-400 text-sm text-center mt-4 font-medium animate-pulse">
            Caricamento...
          </p>
        </div>
      </div>

      {/* Stili CSS ottimizzati */}
      <style jsx>{`
        @keyframes fade-in {
          from { 
            opacity: 0; 
            transform: translateY(20px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        
        @keyframes fade-in-delay {
          0%, 20% { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes loading-progress {
          0% { 
            width: 0%; 
            transform: translateX(-100%);
          }
          50% { 
            width: 60%; 
            transform: translateX(0%);
          }
          100% { 
            width: 100%; 
            transform: translateX(0%);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
        
        .animate-fade-in-delay {
          animation: fade-in-delay 1.5s ease-out forwards;
        }
        
        .animate-loading-progress {
          animation: loading-progress 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
} 