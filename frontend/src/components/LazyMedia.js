import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const LazyMedia = ({ type, src, alt, className, onClick, ...props }) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Load images 200px before they appear in viewport
        threshold: 0.1,
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, []);

  const fullSrc = type === 'image' 
    ? `${API_BASE_URL}/images/${encodeURIComponent(src)}`
    : `${API_BASE_URL}/videos/${encodeURIComponent(src)}`;

  if (!isVisible) {
    return (
      <div 
        ref={elementRef} 
        className={`${className} bg-gray-200 animate-pulse`} 
        style={{ minHeight: '100px' }} // Minimum height to prevent layout shift
        {...props}
      />
    );
  }

  if (type === 'image') {
    return (
      <img
        src={fullSrc}
        alt={alt}
        className={`${className} transition-opacity duration-500 opacity-100`}
        onClick={onClick}
        {...props}
      />
    );
  } else {
    return (
      <video
        src={`${fullSrc}#t=0.1`}
        className={className}
        onClick={onClick}
        preload="metadata"
        {...props}
      />
    );
  }
};

export default LazyMedia;
