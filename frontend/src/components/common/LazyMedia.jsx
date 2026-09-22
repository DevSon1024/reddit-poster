import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../api/client';
import { ImageOff, Play } from 'lucide-react';

export default function LazyMedia({
  type = 'image',
  src,
  alt = 'Media preview',
  className = '',
  onClick,
  onPlayClick,
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '250px',
        threshold: 0.05,
      }
    );

    const currentElement = containerRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, []);

  const isImage = type === 'image' || type === 'images';
  const fullSrc = isImage
    ? `${API_BASE_URL}/images/${encodeURIComponent(src)}`
    : `${API_BASE_URL}/videos/${encodeURIComponent(src)}`;

  if (hasError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-xl text-slate-500 p-4 ${className}`}>
        <ImageOff className="w-6 h-6 mb-1 text-slate-600" />
        <span className="text-[11px] truncate max-w-full text-center">{src}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-slate-900 rounded-xl ${className}`}
      onClick={onClick}
    >
      {/* Skeleton until visible and loaded */}
      {(!isVisible || !hasLoaded) && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse" />
      )}

      {isVisible && (
        <>
          {isImage ? (
            <img
              src={fullSrc}
              alt={alt}
              loading="lazy"
              onLoad={() => setHasLoaded(true)}
              onError={() => setHasError(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                hasLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              {...props}
            />
          ) : (
            <div className="relative w-full h-full group">
              <video
                src={`${fullSrc}#t=0.1`}
                preload="metadata"
                onLoadedData={() => setHasLoaded(true)}
                onError={() => setHasError(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  hasLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                {...props}
              />
              <div
                onClick={(e) => {
                  if (onPlayClick) {
                    e.stopPropagation();
                    onPlayClick();
                  }
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 transition-all cursor-pointer"
              >
                <div className="p-3 rounded-full bg-reddit-orange/90 text-white shadow-glow-orange group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-current" />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
