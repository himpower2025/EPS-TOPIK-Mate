import React, { useState } from 'react';
import { Crown, X, Smartphone, Info, Zap, CheckCircle2, ArrowRight } from 'lucide-react';
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
      plan: selectedPlan,
      status: 'pending',
      amount: currentPlan.price,
      createdAt: serverTimestamp()
    });

    const isSuccess = await verifyPaymentWithServer(requestId);
    if (isSuccess) {
      setStep('SUCCESS');
    } else {
      alert("Payment verification failed. Please scan again and ensure payment is done.");
      setStep('PAYMENT');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-900 to-black p-8 text-white text-center shrink-0">
          {step !== 'VERIFYING' && <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-20"><X className="w-6 h-6"/></button>}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-3 border border-white/20">
              <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-widest">Premium Pass</h2>
            <p className="text-indigo-300 text-[10px] font-bold mt-1 opacity-80 uppercase">Ultimate AI Exam Center</p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto bg-gray-50 flex-1 hide-scrollbar">
          {step === 'PLANS' && (
            <div className="space-y-4">
               <div className="flex items-center gap-2 text-indigo-900 font-black text-[10px] uppercase tracking-wider mb-2 px-1">
                 <Zap className="w-3 h-3 fill-current" /> Select your success plan
               </div>
               
               {(Object.keys(plans) as Array<keyof typeof plans>).map((key) => {
                 const plan = plans[key];
                 const isSelected = selectedPlan === key;
                 return (
                   <div key={key} onClick={() => setSelectedPlan(key)} className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${isSelected ? 'border-indigo-600 bg-white shadow-xl ring-4 ring-indigo-600/5' : 'border-gray-200'}`}>
                     {key === '3m' && <div className="absolute -top-3 left-6 bg-indigo-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase shadow-lg">Most Popular</div>}
                     <div>
                       <h3 className={`font-black text-lg ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>{plan.period}</h3>
                       <span className="text-[10px] text-gray-500 font-bold uppercase">{plan.label}</span>
                     </div>
                     <div className="text-right">
                        <div className="font-black text-xl text-indigo-700 tracking-tighter">{plan.price}</div>
                        <div className="text-[9px] text-gray-400 font-bold">Auto Activation</div>
                     </div>
                   </div>
                 );
               })}

               <button onClick={() => setStep('PAYMENT')} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl text-lg mt-4 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                 Proceed to Pay <ArrowRight className="w-5 h-5"/>
               </button>
            </div>
          )}

          {step === 'PAYMENT' && (
            <div className="flex flex-col items-center animate-fade-in">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 mb-6 w-full max-w-[280px] text-center">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Scan QR with Fonepay App</p>
                 <div className="aspect-square bg-white rounded-2xl overflow-hidden flex items-center justify-center relative border-4 border-gray-50 p-2 mb-4">
                    <img 
                      src="./fonepay-qr.png" 
                      alt="Merchant QR" 
                      className="w-full h-full object-contain" 
                      onError={(e) => {
                        console.error("Fonepay QR image failed to load.");
                        (e.target as any).src = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=fonepay-merchant-payment';
                      }} 
                    />
                 </div>
                 <div className="bg-indigo-900 p-4 rounded-2xl text-white shadow-lg flex justify-between items-center w-full">
                    <div className="text-left">
                       <div className="text-[9px] opacity-60 font-black uppercase tracking-widest">Pay Amount</div>
                       <div className="text-2xl font-black tracking-tighter">{currentPlan.price}</div>
                    </div>
                    <Smartphone className="w-6 h-6" />
                 </div>
              </div>

              <div className="w-full bg-amber-50 border border-amber-100 p-4 rounded-xl mb-6 text-left">
                 <div className="flex items-center gap-2 text-amber-800 font-black text-[10px] uppercase mb-1"><Info className="w-4 h-4"/> Notice</div>
                 <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                   Scan and pay exactly <strong>{currentPlan.price}</strong> using your Fonepay app. After successful payment, click the button below to verify.
                 </p>
              </div>

              <button onClick={handleStartVerifying} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <CheckCircle2 className="w-6 h-6" /> Verify Payment
              </button>
            </div>
          )}

          {step === 'VERIFYING' && (
            <div className="flex flex-col items-center text-center py-12 animate-fade-in">
               <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-8"></div>
               <h3 className="text-2xl font-black text-gray-900 mb-2">Verifying Payment...</h3>
               <p className="text-gray-500 text-sm max-w-[200px] font-medium leading-relaxed">Connecting to Secure Fonepay API for Instant Activation</p>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="flex flex-col items-center text-center py-10 animate-slide-up">
               <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-100">
                  <CheckCircle2 className="w-14 h-14 text-green-600" />
               </div>
               <h3 className="text-2xl font-black text-gray-900 mb-2">Success!</h3>
               <p className="text-gray-500 text-sm mb-8 font-medium">Your Premium Pass is now active. <br/>Unlimited practice awaits you.</p>
               <button onClick={onClose} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-lg">Start Practicing Now</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};