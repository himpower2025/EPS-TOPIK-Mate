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

  const generateAndDownloadLogo = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 512, 512);

    const boxSize = 280;
    const radius = 60;

    const drawRoundedRect = (x: number, y: number, color: string, text: string) => {
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.roundRect(x, y, boxSize, boxSize, radius);
      ctx.fill();
      
      // Text
      ctx.fillStyle = "white";
      ctx.font = "bold 180px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + boxSize/2, y + boxSize/2 + 10);
      
      // Border
      ctx.lineWidth = 8;
      ctx.strokeStyle = "white";
      ctx.stroke();
    };

    drawRoundedRect(190, 190, "#a855f7", "A");
    drawRoundedRect(40, 40, "#4f46e5", "가");

    const link = document.createElement('a');
    link.download = 'eps-topik-mate-icon.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>

      <div className="relative w-full md:w-96 bg-white shadow-2xl rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none p-6 animate-slide-up md:animate-slide-in-right flex flex-col max-h-[90dvh] md:h-full pb-safe">
        
        <div className="md:hidden w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 shrink-0"></div>

        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">My Account</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-600">
            <div className="md:hidden"><ChevronDown className="w-5 h-5" /></div>
            <div className="hidden md:block"><X className="w-5 h-5" /></div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="flex items-center gap-4 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full border-2 border-indigo-200" />
            ) : (
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                <UserIcon className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="font-bold text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
          </div>

          <div className={`rounded-2xl p-5 mb-6 text-white relative overflow-hidden shadow-lg ${isPremium ? 'bg-gradient-to-br from-indigo-600 to-purple-700' : 'bg-gray-800'}`}>
             <div className="relative z-10">
               <div className="text-[10px] opacity-80 uppercase tracking-wide mb-1 font-semibold">Current Plan</div>
               <div className="font-bold text-lg flex items-center gap-2 mb-4">
                 {isPremium ? <><Crown className="w-5 h-5 text-yellow-400 fill-current" /><span>Premium</span></> : <span>Free Starter</span>}
               </div>
               {isPremium ? (
                 <div className="space-y-2">
                   <div className="flex items-center gap-2 text-sm opacity-90"><Calendar className="w-4 h-4" /><span>Ends: {new Date(user.subscriptionExpiry!).toLocaleDateString()}</span></div>
                   {daysRemaining <= 5 && (
                     <div className="text-yellow-300 text-xs font-bold bg-white/10 px-2 py-1 rounded inline-block">
                       ⚠️ {daysRemaining} days left
                     </div>
                   )}
                 </div>
               ) : (
                 <div className="text-sm opacity-80 border-t border-white/20 pt-2 mt-2">Daily limit applied.</div>
               )}
             </div>
             <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          </div>

          <button onClick={onRenew} className="w-full py-3.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl border border-indigo-100 mb-4 active:scale-95 transition-transform">
            {isPremium ? 'Extend Subscription' : 'Upgrade to Premium'}
          </button>

          <button onClick={generateAndDownloadLogo} className="w-full flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 p-4 rounded-xl border border-gray-100 mb-2">
            <Download className="w-5 h-5" />
            <span className="font-medium text-sm">Save Icon</span>
          </button>
        </div>

        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl mt-4 shrink-0 active:scale-95 transition-transform">
          <LogOut className="w-5 h-5" />
          <span className="font-bold text-sm">Sign Out</span>
        </button>

      </div>
    </div>
  );
};