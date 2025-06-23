'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DynamicCard from './DynamicCard';

interface SmartCardImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

const SmartCardImage: React.FC<SmartCardImageProps> = ({ 
  src, 
  alt, 
  className = "w-full h-auto",
  loading = 'lazy' 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [cardData, setCardData] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isJsonResponse, setIsJsonResponse] = useState(false);

  useEffect(() => {
    const loadCard = async () => {
      if (!src) return;
      
      try {
        setIsLoading(true);
        setIsError(false);
        
        const response = await fetch(src);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          // Risposta JSON da Netlify functions
          const data = await response.json();
          setCardData(data);
          setIsJsonResponse(true);
        } else {
          // Risposta immagine PNG da backend Next.js
          setImageUrl(src);
          setIsJsonResponse(false);
        }
        
        setIsLoading(false);
        
      } catch (error) {
        console.error(`❌ Error loading card: ${error}`);
        setIsLoading(false);
        setIsError(true);
      }
    };

    loadCard();
  }, [src]);

  // Callback per quando DynamicCard genera l'immagine
  const handleDynamicCardImageReady = useCallback((generatedImageUrl: string) => {
    setImageUrl(generatedImageUrl);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={`${className} aspect-[5/7] bg-gray-700 rounded animate-pulse flex items-center justify-center`}>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className={`${className} aspect-[5/7] bg-gray-800 rounded flex items-center justify-center`}>
        <div className="text-gray-500 text-sm text-center">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
          </svg>
          Error
        </div>
      </div>
    );
  }

  // JSON response → Use DynamicCard
  if (isJsonResponse && cardData) {
    return (
      <DynamicCard 
        cardData={cardData}
        className={className}
        onImageReady={handleDynamicCardImageReady}
      />
    );
  }

  // PNG response → Use regular img
  if (!isJsonResponse && imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={className}
        loading={loading}
      />
    );
  }

  return null;
};

export default SmartCardImage; 