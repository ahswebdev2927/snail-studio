"use client";

import React, { useRef, useState, useEffect } from "react";
import { getOptimizedVideoUrl, getVideoPosterUrl } from "@/lib/cloudinary/utils";
import { Play, Pause } from "lucide-react";

interface CloudinaryVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string; // publicId or full secure Cloudinary URL
  width?: number;
  height?: number;
  crop?: "scale" | "fill" | "crop";
  posterUrl?: string; // Optional custom poster override
  autoplayOnScroll?: boolean; // Auto plays when scrolled into view
}

export const CloudinaryVideo: React.FC<CloudinaryVideoProps> = ({
  src,
  width,
  height,
  crop = "scale",
  posterUrl,
  autoplayOnScroll = true,
  controls = true,
  loop = true,
  muted = true,
  className = "",
  ...props
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);

  const optimizedVideoUrl = getOptimizedVideoUrl(src, { width, height, crop });
  const autoPosterUrl = posterUrl || getVideoPosterUrl(src, { width, height, crop });

  useEffect(() => {
    if (!autoplayOnScroll || !videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            if (entry.isIntersecting) {
              videoRef.current.play().catch(() => {
                // Autoplay blocked or failed
              });
              setIsPlaying(true);
            } else {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(videoRef.current);
    return () => {
      observer.disconnect();
    };
  }, [autoplayOnScroll]);

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowPlayOverlay(true);
      setTimeout(() => setShowPlayOverlay(false), 800);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setShowPlayOverlay(true);
      setTimeout(() => setShowPlayOverlay(false), 800);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-black rounded-lg group ${className}`}>
      <video
        ref={videoRef}
        src={optimizedVideoUrl}
        poster={autoPosterUrl}
        controls={controls}
        loop={loop}
        muted={muted}
        playsInline
        preload="metadata"
        onClick={handleTogglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-cover cursor-pointer"
        {...props}
      />

      {showPlayOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none transition-all duration-300">
          <div className="p-4 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white animate-ping">
            {isPlaying ? <Play className="w-8 h-8 fill-current" /> : <Pause className="w-8 h-8 fill-current" />}
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudinaryVideo;
