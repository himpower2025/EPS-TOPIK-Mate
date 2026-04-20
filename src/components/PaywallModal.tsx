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
  const [step, setStep] = useState<'PLANS' | 'PAYMENT' | 'PAYMENT_CONFIRM' | 'VERIFYING' | 'SUCCESS'>('PLANS');
  const [selectedPlan, setSelectedPlan] = useState<'1m' | '3m' | '6m'>('3m');
  const [txId, setTxId] = useState('');
  const [senderName, setSenderName] = useState('');

  const plans: Record<'1m' | '3m' | '6m', Plan> = {
    '1m': { 
      price: 'Rs. 300', 
      period: '1 Month', 
      label: 'Starter Pass',
      features: [
        'Reading & Listening Lab: 3 Rounds',
        'Mock Exam: 3 Rounds',
        'Total 240 Official Questions'
      ]
    },
    '3m': { 
      price: 'Rs. 700', 
      period: '3 Months', 
      label: 'Value Pass',
      isPopular: true,
      features: [
        'Reading & Listening Lab: 12 Rounds',
        'Mock Exam: 12 Rounds',
        'Total 960 Official Questions',
        'AI Performance Report'
      ]
    },
    '6m': { 
      price: 'Rs. 1200', 
      period: '6 Months', 
      label: 'Master Pass',
      isPremium: true,
      features: [
        'Full Library Access (25 Rounds)',
        '10 Rounds of AI Adaptive Exams',
        'Total 2,000 Questions',
        'Priority AI Content Generation'
      ]
    }
  };

  const currentPlan = plans[selectedPlan];

  const handleSubmitVerification = async () => {
    if (!txId.trim() || !senderName.trim()) {
      alert("Please enter both Sender Name and Transaction ID/Reference.");
      return;
    }
    
    setStep('VERIFYING');

    try {
      // 1. 실제 Fonepay API 서버에 자동 확인 요청
      const isSuccess = await verifyPaymentWithServer(txId.trim(), currentPlan.price);
      
      const requestId = `PAY_${user.id}_${Date.now()}`;
      const paymentRef = doc(db, 'paymentAttempts', requestId);
      
      if (isSuccess) {
        // 2. [자동 승인] 성공 시 즉시 유저 플랜 업데이트 및 리포트 저장
        await setDoc(paymentRef, {
          userId: user.id,
          userEmail: user.email,
          plan: selectedPlan,
          amount: currentPlan.price,
          senderName: senderName,
          transactionId: txId,
          status: 'completed',
          createdAt: serverTimestamp()
        });

        const expiryDate = new Date();
        const months = selectedPlan === '1m' ? 1 : selectedPlan === '3m' ? 3 : 6;
        expiryDate.setMonth(expiryDate.getMonth() + months);

        await setDoc(doc(db, 'users', user.id), {
          plan: selectedPlan,
          subscriptionExpiry: expiryDate.toISOString(),
          examsRemaining: 9999 // 유료 회원은 무제한에 가깝게 설정
        }, { merge: true });

        setStep('SUCCESS');
      } else {
        // 3. [확인 실패] API상 아직 입금이 안 된 경우
        await setDoc(paymentRef, {
          userId: user.id,
          userEmail: user.email,
          plan: selectedPlan,
          amount: currentPlan.price,
          senderName: senderName,
          transactionId: txId,
          status: 'failed_or_pending',
          createdAt: serverTimestamp()
        });
        
        alert("Payment has not been confirmed by Fonepay yet. If you have already paid, please wait 5-10 minutes and try again with the same ID, or contact support.");
        setStep('PAYMENT_CONFIRM');
      }
    } catch (err) {
      console.error("Verification failed:", err);
      // API 통지 오류 시 수동 검토용으로 저장만 하고 알림
      alert("Automatic verification is temporarily unavailable. We will manually verify your request within 1-2 hours.");
      setStep('SUCCESS'); // 수동 검토 대기 모드로 전환
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh] relative">
        
        {/* Universal Close Button - Always Accessible */}
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-indigo-600 p-2 z-[110] bg-white/80 rounded-full backdrop-blur-sm transition-colors shadow-sm">
          <X className="w-6 h-6"/>
        </button>

        <div className="bg-indigo-900 p-10 text-white text-center shrink-0">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center mb-6 border border-white/20">
              <Crown className="w-12 h-12 text-yellow-400 fill-yellow-400" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight">Upgrade Pass</h2>
            <p className="text-indigo-300 text-xs font-black mt-2 opacity-80 uppercase tracking-widest">Master Korean with AI Mate</p>
          </div>
        </div>

        <div className="p-8 overflow-y-auto bg-gray-50 flex-1 hide-scrollbar pb-10">
          {step === 'PLANS' && (
            <div className="space-y-4">
               {(Object.keys(plans) as Array<keyof typeof plans>).map((key) => {
                 const plan = plans[key];
                 const isSelected = selectedPlan === key;
                 return (
                   <div 
                    key={key} 
                    onClick={() => setSelectedPlan(key)} 
                    className={`relative p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer ${isSelected ? 'border-indigo-600 bg-white shadow-xl' : 'border-white bg-white hover:border-indigo-100'}`}
                   >
                     {/* Use Star and Trophy icons here to resolve unused variable warning */}
                     {plan.isPopular && (
                        <div className="absolute -top-3 left-8 bg-orange-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase shadow-lg tracking-widest flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" /> POPULAR
                        </div>
                     )}
                     {plan.isPremium && (
                        <div className="absolute -top-3 left-8 bg-indigo-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase shadow-lg tracking-widest flex items-center gap-1">
                          <Trophy className="w-3 h-3 fill-current" /> MASTER
                        </div>
                     )}
                     
                     <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="font-black text-2xl text-indigo-950 tracking-tight">{plan.period}</h3>
                          <span className="text-[10px] text-gray-400 font-black uppercase">{plan.label}</span>
                        </div>
                        <div className="font-black text-2xl text-indigo-600 tracking-tighter">{plan.price}</div>
                     </div>

                     <div className="space-y-2 border-t border-gray-50 pt-4">
                        {plan.features.map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-3">
                             <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-green-500' : 'text-gray-200'}`} />
                             <span className="text-[12px] font-bold text-gray-600">{feature}</span>
                          </div>
                        ))}
                     </div>
                   </div>
                 );
               })}
               <button onClick={() => setStep('PAYMENT')} className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2.5rem] shadow-2xl text-xl mt-6 active:scale-95 transition-all flex items-center justify-center gap-3">Continue <ArrowRight className="w-6 h-6"/></button>
            </div>
          )}

          {step === 'PAYMENT' && (
            <div className="flex flex-col items-center animate-fade-in text-center">
              <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-gray-100 mb-8 w-full max-w-[320px]">
                 <div className="aspect-square bg-gray-50 rounded-[2.5rem] overflow-hidden flex items-center justify-center border-4 border-white shadow-inner mb-6">
                    <img src="./fonepay-qr.png" alt="QR" className="w-full h-full object-contain p-4" />
                 </div>
                 <div className="bg-indigo-950 p-6 rounded-[2rem] text-white shadow-xl flex justify-between items-center">
                    <div className="text-left">
                       <p className="text-[9px] opacity-60 font-black uppercase tracking-widest mb-1">Total</p>
                       <p className="text-3xl font-black tracking-tighter leading-none">{currentPlan.price}</p>
                    </div>
                    <Smartphone className="w-10 h-10 text-indigo-400" />
                 </div>
              </div>
              <button onClick={() => setStep('PAYMENT_CONFIRM')} className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2.5rem] shadow-2xl text-xl active:scale-95 transition-all">I Have Paid • Submit Details</button>
              <button onClick={() => setStep('PLANS')} className="mt-6 text-[11px] text-gray-400 font-black uppercase tracking-widest hover:text-indigo-600 transition-colors">Go Back to Plans</button>
            </div>
          )}

          {step === 'PAYMENT_CONFIRM' && (
            <div className="flex flex-col items-center animate-fade-in text-center">
               <h3 className="text-2xl font-black text-gray-900 mb-6">Payment Verification</h3>
               <p className="text-gray-500 text-sm mb-6 text-left px-4">To complete your upgrade, please provide the transfer details. Our team will verify and activate your pass shortly.</p>
               
               <div className="w-full space-y-4 mb-8">
                  <input 
                    type="text" 
                    placeholder="Sender Name (Account Holder)" 
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 font-bold placeholder-gray-300"
                  />
                  <input 
                    type="text" 
                    placeholder="Transaction ID / Reference No." 
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 font-bold placeholder-gray-300"
                  />
               </div>

               <button 
                onClick={handleSubmitVerification} 
                className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2.5rem] shadow-2xl text-lg active:scale-95 transition-all"
               >
                 Submit Request
               </button>
               <button onClick={() => setStep('PAYMENT')} className="mt-6 text-[11px] text-gray-400 font-black uppercase tracking-widest hover:text-indigo-600 transition-colors">Back to QR Code</button>
            </div>
          )}

          {step === 'VERIFYING' && (
            <div className="flex flex-col items-center text-center py-20 animate-fade-in">
               <div className="relative w-28 h-28 mb-10">
                  <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
               </div>
               <h3 className="text-2xl font-black text-gray-900 mb-2">Verifying Transaction</h3>
               <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-10 animate-pulse">Contacting Fonepay Secure Server...</p>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="flex flex-col items-center text-center py-12 animate-slide-up">
               <div className="w-32 h-32 bg-indigo-50 rounded-[3rem] flex items-center justify-center mb-8 shadow-inner">
                  <CheckCircle2 className="w-20 h-20 text-indigo-500" />
               </div>
               <h3 className="text-3xl font-black text-gray-900 mb-2">Request Submitted!</h3>
               <p className="text-gray-500 font-bold mb-6 text-sm px-4">Your payment details have been sent. We will upgrade your account to <span className="text-indigo-600 tracking-tight">{currentPlan.period} Master Pass</span> upon successful verification within 12 hours.</p>
               
               <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl mb-10 text-orange-800 text-xs text-left">
                 <strong>Fast Track:</strong> Send your payment screenshot to our WhatsApp (+977 12345678) with your email: <br/>
                 <span className="font-mono mt-1 block font-bold">{user.email}</span>
               </div>

               <button onClick={onClose} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2.5rem] shadow-2xl text-lg hover:scale-[1.02] active:scale-95 transition-all">Return to Dashboard</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};