import React, { useState } from 'react';
import { Crown, X, Smartphone, Star, CheckCircle2, ArrowRight, Trophy } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '../types';
import { verifyPaymentWithServer } from '../services/paymentService';

interface PaywallModalProps {
  user: User;
  onClose: () => void;
}

interface Plan {
  price: string;
  period: string;
  label: string;
  features: string[];
  isPopular?: boolean;
  isPremium?: boolean;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ user, onClose }) => {
  const [step, setStep] = useState<'PLANS' | 'PAYMENT' | 'VERIFYING' | 'SUCCESS'>('PLANS');
  const [selectedPlan, setSelectedPlan] = useState<'1m' | '3m' | '6m'>('3m');

  const plans: Record<'1m' | '3m' | '6m', Plan> = {
    '1m': { 
      price: 'Rs. 400', 
      period: '1 Month', 
      label: 'Starter Pass',
      features: [
        'Reading Lab: 20 Sets (200 Qs)',
        'Listening Lab: 20 Sets (200 Qs)',
        'Mock Exam: 5 Sets (400 Qs total)'
      ]
    },
    '3m': { 
      price: 'Rs. 1000', 
      period: '3 Months', 
      label: 'Best Value',
      isPopular: true,
      features: [
        'Reading Lab: 70 Sets (700 Qs)',
        'Listening Lab: 70 Sets (700 Qs)',
        'Mock Exam: 30 Sets (1200 Qs total)',
        'AI Performance Analysis'
      ]
    },
    '6m': { 
      price: 'Rs. 1500', 
      period: '6 Months', 
      label: 'Master Pass',
      isPremium: true,
      features: [
        'Reading Lab: 150 Sets (1500 Qs)',
        'Listening Lab: 150 Sets (1500 Qs)',
        'Mock Exam: 70 Sets (2800 Qs total)',
        'Unlimited AI Content Engine'
      ]
    }
  };

  const currentPlan = plans[selectedPlan];

  const handleStartVerifying = async () => {
    setStep('VERIFYING');
    const requestId = `PAY_${user.id}_${Date.now()}`;
    await setDoc(doc(db, 'paymentAttempts', requestId), {
      userId: user.id,
      plan: selectedPlan,
      status: 'pending',
      amount: currentPlan.price,
      createdAt: serverTimestamp()
    });

    try {
      const isSuccess = await verifyPaymentWithServer(requestId);
      if (isSuccess) setStep('SUCCESS');
      else {
        alert("Verification failed. Please scan and pay correctly before verifying.");
        setStep('PAYMENT');
      }
    } catch (e) {
      console.error("Verification error", e);
      setStep('PAYMENT');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-900 to-black p-8 text-white text-center relative shrink-0">
          {/* 닫기 버튼을 항상 노출하도록 수정 (X 표시가 없어 무한로딩에 갇히는 문제 해결) */}
          <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-20"><X className="w-6 h-6"/></button>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-4 border border-white/20 shadow-inner">
              <Crown className="w-10 h-10 text-yellow-400 fill-yellow-400" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-widest">Premium Pass</h2>
            <p className="text-indigo-300 text-[10px] font-black mt-2 opacity-80 uppercase tracking-[0.2em]">Unlock Your Korean Dream</p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto bg-gray-50 flex-1 hide-scrollbar">
          {step === 'PLANS' && (
            <div className="space-y-4 pb-4">
               {(Object.keys(plans) as Array<keyof typeof plans>).map((key) => {
                 const plan = plans[key];
                 const isSelected = selectedPlan === key;
                 return (
                   <div 
                    key={key} 
                    onClick={() => setSelectedPlan(key)} 
                    className={`relative p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${isSelected ? 'border-indigo-600 bg-white shadow-xl ring-4 ring-indigo-600/5' : 'border-gray-200 bg-white hover:border-indigo-300'}`}
                   >
                     {plan.isPopular && <div className="absolute -top-3 left-8 bg-orange-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase shadow-lg tracking-widest flex items-center gap-1"><Star className="w-3 h-3 fill-current"/> Most Popular</div>}
                     {plan.isPremium && <div className="absolute -top-3 left-8 bg-indigo-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase shadow-lg tracking-widest flex items-center gap-1"><Trophy className="w-3 h-3 fill-current"/> Best Investment</div>}
                     
                     <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-black text-xl text-indigo-900">{plan.period}</h3>
                          <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{plan.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-2xl text-indigo-600 tracking-tighter">{plan.price}</div>
                        </div>
                     </div>

                     <div className="space-y-2 border-t pt-4">
                        {plan.features.map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2">
                             <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-green-500' : 'text-gray-300'}`} />
                             <span className="text-[11px] font-bold text-gray-600">{feature}</span>
                          </div>
                        ))}
                     </div>
                   </div>
                 );
               })}
               <button onClick={() => setStep('PAYMENT')} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl text-lg mt-6 flex items-center justify-center gap-3 active:scale-95 transition-all">Continue to Payment <ArrowRight className="w-6 h-6"/></button>
            </div>
          )}

          {step === 'PAYMENT' && (
            <div className="flex flex-col items-center animate-fade-in text-center">
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 mb-8 w-full max-w-[300px] relative">
                 <div className="aspect-square bg-white rounded-3xl overflow-hidden flex items-center justify-center relative border-4 border-gray-50 p-4 mb-6 shadow-inner">
                    <img src="./fonepay-qr.png" alt="QR" className="w-full h-full object-contain" />
                 </div>
                 <div className="bg-indigo-900 p-5 rounded-[2rem] text-white shadow-xl flex justify-between items-center w-full">
                    <div className="text-left">
                       <div className="text-[9px] opacity-60 font-black uppercase tracking-widest">Total Amount</div>
                       <div className="text-2xl font-black tracking-tighter">{currentPlan.price}</div>
                    </div>
                    <Smartphone className="w-8 h-8" />
                 </div>
              </div>
              <button onClick={handleStartVerifying} className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-xl text-xl flex items-center justify-center gap-3 active:scale-95 transition-all"><CheckCircle2 className="w-7 h-7" /> Verify My Payment</button>
              <button onClick={() => setStep('PLANS')} className="mt-4 text-[11px] text-gray-400 font-black uppercase tracking-widest hover:text-indigo-600">Change Plan</button>
            </div>
          )}

          {step === 'VERIFYING' && (
            <div className="flex flex-col items-center text-center py-16 animate-fade-in">
               <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-8 shadow-xl"></div>
               <h3 className="text-2xl font-black text-gray-900">Connecting to Server...</h3>
               <p className="text-gray-400 text-sm mt-2 uppercase tracking-widest font-black mb-8">Securing your access</p>
               
               {/* 로딩 중에 사용자가 나갈 수 있도록 취소 버튼 추가 */}
               <button 
                onClick={() => setStep('PAYMENT')} 
                className="px-6 py-2 bg-gray-100 text-gray-500 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-colors"
               >
                 Cancel Verification
               </button>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="flex flex-col items-center text-center py-12 animate-slide-up">
               <div className="w-28 h-28 bg-green-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-green-200">
                  <CheckCircle2 className="w-16 h-16 text-green-600" />
               </div>
               <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Access Granted!</h3>
               <div className="bg-indigo-950 text-white px-6 py-2 rounded-full font-black text-lg uppercase tracking-widest shadow-lg mb-10">{currentPlan.label} Member</div>
               <button onClick={onClose} className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-xl text-xl hover:scale-[1.02] active:scale-95 transition-all">Start Your Journey</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
