
import React, { useState } from 'react';
import { Check, Crown, X, QrCode, Smartphone, Copy, Landmark } from 'lucide-react';

interface PaywallModalProps {
  onClose: () => void;
  onUpgrade: (plan: '1m' | '3m' | '6m') => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ onClose, onUpgrade }) => {
  const [step, setStep] = useState<'PLANS' | 'QR'>('PLANS');
  const [selectedPlan, setSelectedPlan] = useState<'1m' | '3m' | '6m'>('3m');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const plans = {
    '1m': { price: 'Rs. 290', period: '1 Month', label: 'Starter' },
    '3m': { price: 'Rs. 690', period: '3 Months', label: 'Best Value' },
    '6m': { price: 'Rs. 1190', period: '6 Months', label: 'Master' }
  };

  // 은행 정보 (실제 본인 계좌 정보로 수정하세요)
  const bankDetails = {
    bankName: "Sanima Bank",
    accountName: "Himpower Priavte Limited",
    accountNumber: "028010010001433"
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaid = () => {
    setIsProcessing(true);
    // 실제 서비스에서는 관리자가 입금을 확인한 후 수동으로 승인해주는 것이 안전합니다.
    // 여기서는 테스트를 위해 2초 후 성공으로 시뮬레이션합니다.
    setTimeout(() => {
      setIsProcessing(false);
      onUpgrade(selectedPlan);
    }, 2500);
  };

  const currentPlan = plans[selectedPlan];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="relative bg-indigo-900 p-6 text-white text-center shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white p-2">
            <X className="w-6 h-6"/>
          </button>
          <div className="relative z-10">
            <div className="inline-block p-3 bg-white/10 rounded-full mb-3">
              <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold">Premium Pass</h2>
            <p className="text-indigo-200 text-sm mt-1">Unlock Unlimited AI Practice</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-gray-50 flex-1 hide-scrollbar">
          {step === 'PLANS' ? (
            <div className="space-y-4">
               <p className="text-center text-gray-600 text-sm font-medium mb-4">Choose your preparation period</p>
               
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
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95"
               >
                 <span>Proceed to Payment</span>
                 <QrCode className="w-5 h-5" />
               </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* 실제 QR 이미지 섹션 */}
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 mb-6 w-full max-w-[260px] mx-auto">
                 <div className="aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center relative border border-gray-100">
                    {/* [중요] public 폴더에 fonepay-qr.png 라는 이름으로 이미지를 넣어주세요 */}
                    <img 
                      src="./fonepay-qr.png" 
                      alt="Fonepay QR" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=Please_Upload_Your_QR_Image';
                      }}
                    />
                 </div>
                 <div className="mt-3 flex justify-between items-center bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                    <div className="text-left">
                       <div className="text-[10px] text-indigo-500 uppercase font-bold">Total Payable</div>
                       <div className="text-xl font-bold text-indigo-700">{currentPlan.price}</div>
                    </div>
                    <div className="bg-indigo-600 text-white p-2 rounded-lg">
                       <Smartphone className="w-5 h-5" />
                    </div>
                 </div>
              </div>

              {/* 은행 계좌 정보 섹션 (QR이 안될 때 대비) */}
              <div className="w-full bg-white border border-gray-200 rounded-2xl p-4 mb-6 text-left space-y-3">
                 <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b pb-2 mb-2">
                    <Landmark className="w-3 h-3" /> Bank Transfer Details
                 </div>
                 <div>
                    <div className="text-[10px] text-gray-500">Bank Name</div>
                    <div className="text-sm font-bold text-gray-900">{bankDetails.bankName}</div>
                 </div>
                 <div className="flex justify-between items-end">
                    <div>
                        <div className="text-[10px] text-gray-500">A/C Number</div>
                        <div className="text-sm font-bold text-gray-900">{bankDetails.accountNumber}</div>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(bankDetails.accountNumber)}
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md"
                    >
                       <Copy className="w-3 h-3" /> {copied ? 'Copied' : 'Copy'}
                    </button>
                 </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-xl mb-6 text-left border border-orange-100">
                 <h4 className="text-orange-800 font-bold text-xs mb-1">Instruction:</h4>
                 <ol className="text-[11px] text-orange-700 space-y-1 list-decimal ml-4">
                    <li>Scan the QR or transfer manually to the account.</li>
                    <li>Pay exactly <span className="font-bold underline">{currentPlan.price}</span>.</li>
                    <li>Wait 1-2 mins after payment and click the button below.</li>
                 </ol>
              </div>

              <button 
                onClick={handlePaid}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying Transfer...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-6 h-6" />
                    <span className="text-lg">I Have Paid</span>
                  </>
                )}
              </button>
              
              <button onClick={() => setStep('PLANS')} className="mt-4 text-sm text-gray-400 font-medium">
                Change Plan
              </button>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-white border-t border-gray-100 text-[10px] text-center text-gray-400">
           Secure Bank Transfer Payment • Manual Verification
        </div>
      </div>
    </div>
  );
};
