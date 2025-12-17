
import React, { useState } from 'react';
import { X } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onLogin: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLogin }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleBtnClick = () => {
    setIsLoggingIn(true);
    onLogin(); // App.tsx에 있는 handleLogin 함수를 실행합니다.
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative animate-slide-up">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <div className="relative w-10 h-10">
                <div className="absolute top-0 left-0 bg-indigo-600 rounded-md text-white text-[12px] font-bold w-6 h-6 flex items-center justify-center border-2 border-white z-10 shadow-sm">가</div>
                <div className="absolute bottom-0 right-0 bg-purple-500 rounded-md text-white text-[12px] font-bold w-6 h-6 flex items-center justify-center border-2 border-white shadow-sm">A</div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Mate!</h2>
          <p className="text-gray-500 mb-8 text-sm">Sign in with Google to start your EPS-TOPIK preparation.</p>

          <button
            onClick={handleBtnClick}
            disabled={isLoggingIn}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isLoggingIn ? (
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <p className="mt-8 text-[10px] text-gray-400 leading-relaxed uppercase tracking-widest font-bold">
            Secure Access • Cloud Sync
          </p>
        </div>
      </div>
    </div>
  );
};
