import React, { useState } from 'react';
import { Crown, X, Smartphone, Info, ShieldCheck, Zap, CheckCircle2, ArrowRight } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '../types';
import { verifyPaymentWithServer } from '../services/paymentService';

interface PaywallModalProps {
  user: User;
  onClose: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ user, onClose }) => {
  const [step, setStep] = useState<'PLANS' | 'PAYMENT' | 'VERIFYING' | 'SUCCESS'>('PLANS');
  const [selectedPlan, setSelectedPlan] = useState<'1m' | '3m' | '6m'>('3m');

  const plans = {
    '1m': { price: 'Rs. 290', period: '1 Month', label: 'Starter' },
    '3m': { price: 'Rs. 690', period: '3 Months', label: 'Best Value' },
    '6m': { price: 'Rs. 1190', period: '6 Months', label: 'Master' }
  };

  const currentPlan = plans[selectedPlan];

  const handleStartVerifying = async () => {
    setStep('VERIFYING');
    
    const requestId = `PAY_${user.id}_${Date.now()}`;
    await setDoc(doc(db, 'paymentAttempts', requestId), {
      userId: user.id,
      userName: user.name,
      plan: selectedPlan,
      status: 'waiting_for_api',
      amount: currentPlan.price,
      createdAt: serverTimestamp()
    });

    const isSuccess = await verifyPaymentWithServer(requestId);
    
    if (isSuccess) {
      setStep('SUCCESS');
    } else {
      alert("Payment verification failed. Please contact support.");
      setStep('PAYMENT');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] border border-white/20">
        
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-900 to-black p-8 text-white text-center shrink-0">
          {step !== 'VERIFYING' && step !== 'SUCCESS' && (
            <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-20 transition-colors">
              <X className="w-6 h-6"/>
            </button>
          )}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-3 backdrop-blur-md border border-white/20">
              <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            </div>
            <h2 className="text-xl font-black tracking-tight uppercase tracking-widest">Premium Pass</h2>
            <p className="text-indigo-300 text-[10px] font-bold mt-1 opacity-80">Unlimited EPS-TOPIK Success</p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto bg-gray-50 flex-1 hide-scrollbar">
          
          {step === 'PLANS' && (
            <div className="space-y-4 animate-slide-up">
               <div className="flex items-center gap-2 text-indigo-900 font-black text-[10px] uppercase tracking-wider mb-2 px-1">
                 <Zap className="w-3 h-3 fill-current" /> Select your success plan
               </div>
               
               {(Object.keys(plans) as Array<keyof typeof plans>).map((key) => {
                 const plan = plans[key];
                 const isSelected = selectedPlan === key;
                 return (
                   <div 
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${isSelected ? 'border-indigo-600 bg-white shadow-xl ring-4 ring-indigo-600/5' : 'border-gray-200 bg-white/50 hover:border-indigo-200'}`}
                   >
                     {key === '3m' && <div className="absolute -top-3 left-6 bg-indigo-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase shadow-lg">Most Popular</div>}
                     <div className="flex flex-col">
                       <h3 className={`font-black text-lg ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>{plan.period}</h3>
                       <span className="text-[10px] text-gray-500 font-bold uppercase">{plan.label}</span>
                     </div>
                     <div className="text-right">
                        <div className="font-black text-xl text-indigo-700 tracking-tighter">{plan.price}</div>
                        <div className="text-[9px] text-gray-400 font-bold">Automatic Setup</div>
                     </div>
                   </div>
                 );
               })}

               <div className="pt-4">
                  <button 
                    onClick={() => setStep('PAYMENT')}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all text-lg flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    <span>Proceed to Pay {currentPlan.price}</span>
                    <ArrowRight className="w-6 h-6" />
                  </button>
               </div>
            </div>
          )}

          {step === 'PAYMENT' && (
            <div className="flex flex-col items-center animate-fade-in">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 mb-6 w-full max-w-[280px] text-center">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Scan QR with Bank App</p>
                 <div className="aspect-square bg-white rounded-2xl overflow-hidden flex items-center justify-center relative border-4 border-gray-50 p-2 mb-4">
                    {/* 루트 폴더의 fonepay-qr.png를 정확히 참조합니다 */}
                    <img 
                      src="./fonepay-qr.png" 
                      alt="Fonepay Merchant QR" 
                      className="w-full h-full object-contain" 
                      onError={(e) => {
                        console.error("Fonepay QR image failed to load from local root.");
                        (e.target as any).src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=fonepay-fallback-${selectedPlan}`;
                      }} 
                    />
                 </div>
                 <div className="bg-indigo-900 p-4 rounded-2xl text-white shadow-lg flex justify-between items-center w-full">
                    <div className="text-left">
                       <div className="text-[9px] opacity-60 font-black uppercase tracking-widest">Pay Amount</div>
                       <div className="text-2xl font-black tracking-tighter">{currentPlan.price}</div>
                    </div>
                    <div className="flex flex-col items-end"><Smartphone className="w-6 h-6 mb-1" /><span className="text-[8px] font-bold opacity-60 uppercase">Fonepay API</span></div>
                 </div>
              </div>

              <div className="w-full bg-amber-50 border border-amber-100 p-5 rounded-2xl mb-6 text-left">
                 <div className="flex items-center gap-2 text-amber-800 font-black text-[10px] uppercase mb-2"><Info className="w-4 h-4"/> Notice</div>
                 <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                   1. Scan and pay exactly <strong>{currentPlan.price}</strong>.<br/>
                   2. After payment, click <strong>"Verify Payment"</strong>.<br/>
                   3. Your premium access will be activated <strong>automatically</strong>.
                 </p>
              </div>

              <button 
                onClick={handleStartVerifying}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all text-lg flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <CheckCircle2 className="w-6 h-6" /> 
                <span>Verify Payment</span>
              </button>
              
              <button onClick={() => setStep('PLANS')} className="mt-4 text-xs text-gray-400 font-bold uppercase tracking-widest hover:text-indigo-600">Change My Plan</button>
            </div>
          )}

          {step === 'VERIFYING' && (
            <div className="flex flex-col items-center text-center py-12 animate-fade-in">
               <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <ShieldCheck className="w-10 h-10 text-indigo-600" />
                  </div>
               </div>
               <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Verifying with Fonepay</h3>
               <p className="text-gray-500 text-sm leading-relaxed max-w-[240px] font-medium">
                 Our system is checking the transaction status with the bank API.
                 <br/><br/>
                 <span className="text-indigo-600 font-black text-[10px] bg-indigo-50 px-3 py-1 rounded-full uppercase animate-pulse">Waiting for Webhook Response</span>
               </p>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="flex flex-col items-center text-center py-10 animate-slide-up">
               <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-100">
                  <CheckCircle2 className="w-14 h-14 text-green-600" />
               </div>
               <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Success! Welcome to Premium</h3>
               <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                 Your payment has been verified. <br/>
                 <span className="font-bold text-indigo-600">Your {currentPlan.price} access is now active!</span>
               </p>
               
               <button onClick={onClose} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all text-lg">Start Practicing Now</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};