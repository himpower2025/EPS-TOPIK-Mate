import React from 'react';
import { User } from '../types';
import { X, User as UserIcon, Calendar, Crown, LogOut, ChevronDown, Download } from 'lucide-react';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  onRenew: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onLogout, onRenew }) => {
  const isPremium = user.plan !== 'free';
  
  const getDaysRemaining = () => {
    if (!user.subscriptionExpiry) return 0;
    const end = new Date(user.subscriptionExpiry);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const daysRemaining = getDaysRemaining();

  // Function to draw the logo on canvas and download it
  const generateAndDownloadLogo = () => {
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Clear background (Transparent)
    ctx.clearRect(0, 0, size, size);

    // Settings
    const boxSize = 280;
    const offset = 100; // Shift for the second box
    const radius = 60; // Rounded corner radius

    // Helper for custom rounded corners
    const drawCustomRect = (x: number, y: number, w: number, h: number, r: number, corners: {tl: boolean, tr: boolean, br: boolean, bl: boolean}, color: string, text: string) => {
      ctx.beginPath();
      ctx.fillStyle = color;
      
      // Top Left
      if (corners.tl) ctx.moveTo(x + r, y); else ctx.moveTo(x, y);
      
      // Top Right
      if (corners.tr) {
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      } else {
        ctx.lineTo(x + w, y);
      }

      // Bottom Right
      if (corners.br) {
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      } else {
        ctx.lineTo(x + w, y + h);
      }

      // Bottom Left
      if (corners.bl) {
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      } else {
        ctx.lineTo(x, y + h);
      }

      // Close Top Left
      if (corners.tl) {
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      } else {
        ctx.lineTo(x, y);
      }

      ctx.closePath();
      
      // Shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      ctx.fill();
      
      // Reset Shadow for text
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Text
      ctx.fillStyle = "white";
      ctx.font = "bold 180px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Adjust text position slightly for visual centering
      ctx.fillText(text, x + w/2, y + h/2 + 10);
      
      // Border (Stroke) similar to the UI border-2 border-white
      ctx.lineWidth = 8;
      ctx.strokeStyle = "white";
      ctx.stroke();
    };

    // --- DRAWING ORDER: Back to Front ---

    // 1. Draw Bottom-Right Box (Purple) - "A" (Draw FIRST so it is behind)
    // Matches CSS: rounded-tr-md rounded-br-md rounded-bl-md
    drawCustomRect(
      40 + 150, 40 + 150, // Offset position
      boxSize, boxSize, 
      radius, 
      { tl: false, tr: true, br: true, bl: true }, 
      "#a855f7", // Purple 500
      "A"
    );

    // 2. Draw Top-Left Box (Indigo) - "가" (Draw SECOND so it is in front)
    // Rounded: TL, TR, BL. Sharp: BR (to allow the overlap feel or just match design)
    // Matches CSS: rounded-tl-md rounded-tr-md rounded-bl-md
    drawCustomRect(
      40, 40, 
      boxSize, boxSize, 
      radius, 
      { tl: true, tr: true, br: false, bl: true }, 
      "#4f46e5", // Indigo 600
      "가"
    );

    // Trigger Download
    const link = document.createElement('a');
    link.download = 'eps-topik-mate-icon.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
      ></div>

      {/* Modal Content - Bottom Sheet on Mobile, Sidebar on Desktop */}
      <div className="relative w-full md:w-80 bg-white shadow-2xl rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none p-6 animate-slide-up md:animate-slide-in-right flex flex-col max-h-[85vh] md:h-full">
        
        {/* Handle Bar for mobile feel */}
        <div className="md:hidden w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">My Account</h2>
          <button 
            onClick={onClose} 
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
          >
            {/* Show ChevronDown on mobile to signify 'closing down', X on desktop */}
            <div className="md:hidden"><ChevronDown className="w-5 h-5" /></div>
            <div className="hidden md:block"><X className="w-5 h-5" /></div>
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-4 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full border-2 border-indigo-200" />
          ) : (
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <UserIcon className="w-6 h-6" />
            </div>
          )}
          <div className="overflow-hidden">
            <div className="font-bold text-gray-900 truncate">{user.name}</div>
            <div className="text-xs text-gray-500 truncate">{user.email}</div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className={`rounded-2xl p-5 mb-6 text-white relative overflow-hidden shadow-lg ${isPremium ? 'bg-gradient-to-br from-indigo-600 to-purple-700' : 'bg-gray-800'}`}>
           <div className="relative z-10">
             <div className="flex justify-between items-start mb-4">
               <div>
                 <div className="text-[10px] opacity-80 uppercase tracking-wide mb-1 font-semibold">Current Plan</div>
                 <div className="font-bold text-lg flex items-center gap-2">
                   {isPremium ? (
                     <>
                        <Crown className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span>Premium</span>
                     </>
                   ) : (
                     <span>Free Starter</span>
                   )}
                 </div>
               </div>
             </div>

             {isPremium ? (
               <div className="space-y-1">
                 <div className="flex items-center gap-2 text-sm opacity-90">
                   <Calendar className="w-4 h-4" />
                   <span>Ends: {new Date(user.subscriptionExpiry!).toLocaleDateString()}</span>
                 </div>
                 {daysRemaining <= 5 && (
                   <div className="text-yellow-300 text-xs font-bold mt-2 animate-pulse bg-white/10 px-2 py-1 rounded inline-block">
                     ⚠️ {daysRemaining} days left
                   </div>
                 )}
               </div>
             ) : (
               <div className="text-sm opacity-80 border-t border-white/20 pt-2 mt-2">
                 Free daily exam limit applied.
               </div>
             )}
           </div>
           
           {/* Decor */}
           <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
           <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>

        <button 
          onClick={onRenew}
          className="w-full py-3.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl border-2 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-all active:scale-95 mb-auto"
        >
          {isPremium ? 'Extend Subscription' : 'Upgrade to Premium'}
        </button>

        {/* Download Icon Button */}
        <button 
          onClick={generateAndDownloadLogo}
          className="flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 transition-all p-4 rounded-xl mt-4 border border-gray-100"
        >
          <Download className="w-5 h-5" />
          <span className="font-medium text-sm">Download App Icon</span>
        </button>

        {/* Bottom Actions */}
        <button 
          onClick={onLogout}
          className="flex items-center justify-center gap-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all p-4 rounded-xl mt-2 border border-transparent hover:border-red-100"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Sign Out</span>
        </button>

        {/* Safe Area for Mobile */}
        <div className="h-4 md:h-0"></div>

      </div>
    </div>
  );
};