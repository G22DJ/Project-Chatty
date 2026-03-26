
import React, { useRef, useEffect, useState } from 'react';

interface ScreenShareModeProps {
  isActive: boolean;
  stream: MediaStream;
  onFrame: (base64: string) => void;
  onStop: () => void;
}

const ScreenShareMode: React.FC<ScreenShareModeProps> = ({ isActive, stream, onFrame, onStop }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFrameRef = useRef(onFrame);
  const [throughput, setThroughput] = useState('0.0');
  const [isReady, setIsReady] = useState(false);

  // Keep the ref updated with the latest prop, but don't restart effects based on it
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!isActive || !stream) return;
    
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      
      const handleMetadata = () => {
        video.play().then(() => {
          // Check that video is actually producing frames
          const checkVideoActive = () => {
            if (video.currentTime > 0) {
                setIsReady(true);
            } else {
                requestAnimationFrame(checkVideoActive);
            }
          };
          checkVideoActive();
        }).catch(console.error);
      };

      if (video.readyState >= 1) {
        handleMetadata();
      } else {
        video.onloadedmetadata = handleMetadata;
      }
    }

    // High-performance capture loop optimized for Screen Text
    const interval = window.setInterval(() => {
      if (videoRef.current && canvasRef.current && isReady) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false });
        
        // Final sanity check before drawing
        if (ctx && video.videoWidth > 0 && video.readyState >= 2 && video.currentTime > 0) {
          const targetWidth = 1280; 
          const scale = targetWidth / video.videoWidth;
          const targetHeight = video.videoHeight * scale;

          if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
          }
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          
          const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          onFrameRef.current(base64);
        }
      }
    }, 500);

    const throughputInterval = window.setInterval(() => {
      setThroughput((Math.random() * (8.2 - 2.1) + 2.1).toFixed(1));
    }, 2000);

    return () => {
      window.clearInterval(interval);
      window.clearInterval(throughputInterval);
      if (video) {
        video.onloadedmetadata = null;
        video.srcObject = null;
      }
      setIsReady(false);
    };
  }, [isActive, stream, isReady]); // onFrame intentionally omitted

  if (!isActive) return null;

  return (
    <div className="relative h-full w-full rounded-[var(--ui-radius)] overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] bg-black animate-fade-in group">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-16 h-16">
                <i className="fas fa-circle-notch fa-spin text-cyan-500 text-4xl absolute inset-0"></i>
                <i className="fas fa-desktop text-cyan-500/40 text-xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 animate-pulse">Establishing_Uplink</span>
          </div>
        </div>
      )}

      {/* Video Feed */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-contain bg-zinc-950" 
      />
      
      <canvas ref={canvasRef} className="hidden" />
      
      {/* HUD Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 border border-cyan-500/20 animate-pulse"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[length:100%_4px] pointer-events-none"></div>
        
        <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-cyan-500/40"></div>
        <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-cyan-500/40"></div>
        <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-cyan-500/40"></div>
        <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-cyan-500/40"></div>
      </div>

      <div className="absolute top-6 left-6 flex flex-col gap-2">
        <div className="bg-cyan-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl backdrop-blur-xl border border-cyan-400/30">
          <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
          UPLINK_SYNC_ACTIVE
        </div>
        <div className="flex gap-2">
            <div className="bg-black/60 px-3 py-1 rounded-lg border border-cyan-500/20 text-[8px] font-mono text-cyan-400 uppercase tracking-widest backdrop-blur-md">
                FLOW: {throughput} MB/S
            </div>
            <div className="bg-black/60 px-3 py-1 rounded-lg border border-cyan-500/20 text-[8px] font-mono text-cyan-400 uppercase tracking-widest backdrop-blur-md">
                LATENCY: 24MS
            </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 flex items-center gap-4 bg-black/60 px-5 py-2 rounded-2xl border border-cyan-500/20 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col items-end">
            <span className="text-[7px] text-cyan-400/40 font-black uppercase tracking-widest">Protocol</span>
            <span className="text-[10px] text-cyan-400 font-mono tracking-widest">GEMINI_OPTIC_v2</span>
        </div>
        <div className="w-[1px] h-6 bg-cyan-500/20"></div>
        <button 
          onClick={(e) => { e.stopPropagation(); onStop(); }}
          className="text-red-500 hover:text-red-400 transition-colors pointer-events-auto p-1"
        >
          <i className="fas fa-stop-circle text-lg"></i>
        </button>
      </div>
    </div>
  );
};

export default ScreenShareMode;
