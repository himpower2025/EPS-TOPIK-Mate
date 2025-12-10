import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export const InstallPwa: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // If iOS, show prompt immediately (custom banner)
    if (isIosDevice) {
      // Check if user dismissed it previously in this session
      if (!sessionStorage.getItem('install_dismissed')) {
        setShowPrompt(true);
      }
    }

    // Android/Desktop: Capture beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('install_dismissed')) {
        setShowPrompt(true);
      }
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('install_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="bg-indigo-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-4 border border-indigo-700/50 max-w-md mx-auto relative">
        <button 
          onClick={handleDismiss} 
          className="absolute top-2 right-2 text-indigo-300 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex gap-4 items-start">
          <div className="bg-white rounded-xl p-2 shrink-0">
             {/* Simple Logo Placeholder */}
             <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center font-bold text-white text-xs">
               EPS
             </div>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg leading-tight mb-1">Install App</h3>
            <p className="text-indigo-200 text-sm mb-3">
              {isIOS 
                ? "Install this web app on your iPhone for the best fullscreen experience."
                : "Install for offline access and fullscreen mode."}
            </p>

            {isIOS ? (
              <div className="text-sm bg-indigo-800/50 rounded-lg p-3 space-y-2 border border-indigo-500/30">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-gray-700 rounded flex items-center justify-center text-[10px]"><Share className="w-3 h-3 text-blue-400"/></span>
                  <span>1. Tap <strong>Share</strong> button</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="w-5 h-5 bg-gray-700 rounded flex items-center justify-center text-[10px]"><PlusSquare className="w-3 h-3 text-gray-200"/></span>
                   <span>2. Select <strong>Add to Home Screen</strong></span>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleInstall}
                className="bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Install App
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
