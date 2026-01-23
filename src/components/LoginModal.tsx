import React, { useState } from 'react';
import { X, Mail, Lock, UserPlus, LogIn, Chrome } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onLogin: () => void; // Google Login
  onEmailAuth: (email: string, pass: string, isSignUp: boolean) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLogin, onEmailAuth }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length !== 6 || !/^\d+$/.test(password)) {
      setError("비밀번호는 숫자 6자여야 합니다.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      // ID가 이메일 형식이 아니면 내부적으로 처리
      const finalEmail = id.includes('@') ? id : `${id}@epsmate.local`;
      await onEmailAuth(finalEmail, password, isSignUp);
    } catch (err: any) {
      setError(err.message || "인증에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden relative flex flex-col max-h-[90vh]">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 z-20"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8 pb-4 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-inner">
             <div className="relative w-8 h-8">
                <div className="absolute top-0 left-0 bg-indigo-600 rounded-md text-white text-[10px] font-black w-5 h-5 flex items-center justify-center border border-white z-10">가</div>
                <div className="absolute bottom-0 right-0 bg-purple-500 rounded-md text-white text-[10px] font-black w-5 h-5 flex items-center justify-center border border-white">A</div>
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{isSignUp ? 'Join Mate' : 'Welcome Back'}</h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">EPS-TOPIK Success Partner</p>
        </div>

        <div className="p-8 pt-2 overflow-y-auto hide-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">ID / Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input 
                  type="text"
                  required
                  placeholder="Enter your ID"
                  className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">6-Digit Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input 
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  placeholder="● ● ● ● ● ●"
                  className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-gray-900 tracking-[0.5em] transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-[10px] font-bold text-center bg-red-50 py-2 rounded-xl border border-red-100">{error}</p>}

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${isSignUp ? 'bg-purple-600 shadow-purple-200' : 'bg-indigo-600 shadow-indigo-200'}`}
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                isSignUp ? <><UserPlus className="w-5 h-5"/> Create Account</> : <><LogIn className="w-5 h-5"/> Sign In</>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-gray-300 bg-white px-4">Social Login</div>
          </div>

          <button 
            onClick={onLogin}
            className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm"
          >
            <Chrome className="w-5 h-5 text-red-500" />
            <span>Continue with Google</span>
          </button>

          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full mt-6 text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create One"}
          </button>
        </div>
      </div>
    </div>
  );
};