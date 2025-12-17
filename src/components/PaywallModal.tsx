
import React, { useState } from 'react';
import { Check, Crown, X, QrCode, Smartphone, Copy } from 'lucide-react';

// Adjusted props to accept the selected plan in the onUpgrade callback
interface PaywallModalProps {
  onClose: () => void;
  onUpgrade: (plan: '1m' | '3m' | '6m') => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ onClose, onUpgrade }) => {
  const [step, setStep] = useState<'PLANS' | 'QR'>('PLANS');
  const [selectedPlan, setSelectedPlan] = useState<'1m' | '3m' | '6m'>('3m');
  const [isProcessing, setIsProcessing] = useState(false);

  // Updated Pricing Strategy
  const plans = {
    '1m': { price: 'Rs. 290', period: '1 Month', label: 'Starter' },
    '3m': { price: 'Rs. 690', period: '3 Months', label: 'Best Value' },
    '6m': { price: 'Rs. 1190', period: '6 Months', label: 'Master' }
  };

  const handlePaid = () => {
    setIsProcessing(true);
    // In a real manual flow, this might send a message to the admin or just unlock locally for trust-based MVP
    setTimeout(() => {
      setIsProcessing(false);
      // Pass the selected plan to the upgrade handler to fix the argument count mismatch
      onUpgrade(selectedPlan);
    }, 2000);
  };

  const currentPlan = plans[selectedPlan];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="relative bg-indigo-900 p-6 text-white text-center overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-indigo-700 rounded-full opacity-50 blur-2xl"></div>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white"><X className="w-6 h-6"/></button>
          
          <div className="relative z-10">
            <div className="inline-block p-3 bg-white/10 rounded-full mb-3 backdrop-blur-sm">
              <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold">Premium Pass</h2>
            <p className="text-indigo-200 text-sm mt-1">Unlimited AI Exams & Listening Practice</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
          
          {step === 'PLANS' ? (
            <div className="space-y-4">
               <p className="text-center text-gray-600 text-sm font-medium mb-4">Select a plan to start preparing</p>
               
               {(Object.keys(plans) as Array<keyof typeof plans>).map((key) => {
                 const plan = plans[key];
                 const isSelected = selectedPlan === key;
                 return (
                   <div 
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                   >
                     {key === '3m' && <div className="absolute -top-2.5 left-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Most Popular</div>}
                     <div>
                       <h3 className="font-bold text-gray-900">{plan.period}</h3>
                       <span className="text-xs text-gray-500">{plan.label}</span>
                     </div>
                     <div className="text-right">
                       <span className={`block font-bold text-lg ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>{plan.price}</span>
                     </div>
                   </div>
                 );
               })}

               <button 
                onClick={() => setStep('QR')}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
               >
                 <span>Pay with Fonepay</span>
                 <QrCode className="w-5 h-5" />
               </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-200 w-full max-w-[240px]">
                 {/* Placeholder for Fonepay QR */}
                 <div className="aspect-square bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden group">
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://example.com/fonepay" 
                      alt="Fonepay QR" 
                      className="w-full h-full object-cover opacity-90"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Smartphone className="w-12 h-12 text-white drop-shadow-lg" />
                    </div>
                 </div>
                 <div className="mt-3 flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <div className="text-left">
                       <div className="text-[10px] text-gray-500 uppercase font-bold">Amount to Pay</div>
                       <div className="text-xl font-bold text-indigo-700">{currentPlan.price}</div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600"><Copy className="w-4 h-4" /></button>
                 </div>
              </div>

              <div className="space-y-2 mb-6 w-full">
                <p className="text-sm text-gray-800 font-bold">1. Scan QR with your Bank App / eSewa</p>
                <p className="text-sm text-gray-800 font-bold">2. Pay exactly <span className="text-indigo-600">{currentPlan.price}</span></p>
                <p className="text-xs text-gray-500">Upon payment, click the button below to activate.</p>
              </div>

              <button 
                onClick={handlePaid}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <span className="animate-pulse">Verifying Payment...</span>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>I Have Paid</span>
                  </>
                )}
              </button>
              
              <button onClick={() => setStep('PLANS')} className="mt-3 text-sm text-gray-400 underline decoration-gray-300">
                Cancel / Change Plan
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
