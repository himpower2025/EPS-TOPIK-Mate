// LegalModal component for displaying Terms of Service and Privacy Policy
import React from 'react';
import { X, Shield, FileText } from 'lucide-react';

interface LegalModalProps {
  type: 'terms' | 'privacy';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  const isTerms = type === 'terms';

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-[85vh] animate-slide-up">
        {/* Header */}
        <div className="p-8 pb-4 border-b border-gray-100 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isTerms ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>
            {isTerms ? <FileText className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
          </div>
          <div className="text-left">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              {isTerms ? 'Terms of Service' : 'Privacy Policy'}
            </h2>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
              EPS Mate • Himpower Pvt. Ltd.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="ml-auto text-gray-400 hover:text-gray-900 p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-6 text-sm text-gray-600 leading-relaxed font-medium text-left">
          {isTerms ? (
            <>
              <div>
                <h3 className="font-black text-gray-950 text-sm uppercase tracking-wider mb-2">1. Agreement to Terms</h3>
                <p>
                  Welcome to EPS Mate. By accessing or using our application, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree, please do not use the service.
                </p>
              </div>

              <div>
                <h3 className="font-black text-gray-950 text-sm uppercase tracking-wider mb-2">2. Service Provider</h3>
                <p>
                  EPS Mate is developed, owned, and operated by <strong>Himpower Pvt. Ltd.</strong> (Contact: himpower2025@gmail.com).
                </p>
              </div>

              <div>
                <h3 className="font-black text-gray-950 text-sm uppercase tracking-wider mb-2">3. Intellectual Property</h3>
                <p>
                  All educational content, design structures, and AI-generated workflows within EPS Mate are the intellectual property of Himpower Pvt. Ltd. Users may not copy, distribute, scrape, or commercially exploit any part of our service.
                </p>
              </div>

              <div>
                <h3 className="font-black text-gray-950 text-sm uppercase tracking-wider mb-2">4. User Account & Subscriptions</h3>
                <p>
                  Users signing up for a premium tier or accessing free examinations must provide valid credentials. Subscription purchases are non-refundable except where required by law. Free accounts are limited to standard exam configurations.
                </p>
              </div>

              <div>
                <h3 className="font-black text-gray-950 text-sm uppercase tracking-wider mb-2">5. Disclaimer & Limitation of Liability</h3>
                <p>
                  EPS Mate is an auxiliary educational practice tool. We do not guarantee or warrant passing scores in the official EPS-TOPIK examination. In no event shall Himpower Pvt. Ltd. be liable for any direct or indirect damages arising out of the use of this service.
                </p>
              </div>

              <div>
                <h3 className="font-black text-gray-950 text-sm uppercase tracking-wider mb-2">6. Changes to Terms</h3>
                <p>
                  We reserve the right to amend these Terms of Service at any time. Continued usage of EPS Mate after modifications signifies full agreement to the updated terms.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="font-black text-gray-950 text-sm uppercase tracking-wider mb-2">1. Information We Collect</h3>
                <p>We collect basic details necessary to customize your learning journey:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Account Info:</strong> Name, Email Address, and Avatar URL when authenticated via Google Sign-In or Email registration.</li>
                  <li><strong>Exam Logs:</strong> Historical score statistics, selected options, progress charts, and subscription levels stored securely in Firebase Firestore.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-black text-gray-950 text-sm uppercase tracking-wider mb-2">2. How We Use Your Data</h3>
                <p>Your collected metrics are used solely to:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Enable access control, premium plans, and continuous practice runs.</li>
                  <li>Perform weak-point and strength diagnostics to generate AI performance feedback.</li>
                  <li>Maintain user progress across devices securely.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-black text-gray-950 text-sm uppercase tracking-wider mb-2">3. Third-Party Integrations</h3>
                <p>
                  We utilize secure enterprise partners for specialized tasks:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Google Firebase:</strong> Secures authentication and hosts the Firestore database securely.</li>
                  <li><strong>Google Gemini API:</strong> Generates dynamic workplace mock exam items and voice outputs. No personal identifier data (email, name) is transmitted to the AI engine.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-black text-gray-950 text-sm uppercase tracking-wider mb-2">4. Storage & Security</h3>
                <p>
                  All critical connection pipelines are protected by SSL. We do not sell, rent, or lease user data to third-party marketing companies under any circumstances.
                </p>
              </div>

              <div>
                <h3 className="font-black text-gray-950 text-sm uppercase tracking-wider mb-2">5. User Control & Data Deletion</h3>
                <p>
                  You retain complete authority over your data. You may request deletion of your account and all associated exam history logs at any time by contacting our support desk.
                </p>
              </div>

              <div>
                <h3 className="font-black text-gray-950 text-sm uppercase tracking-wider mb-2">6. Contact Support</h3>
                <p>
                  For privacy inquiries or technical questions, please contact Himpower Pvt. Ltd. at: <strong className="text-indigo-600 font-bold">himpower2025@gmail.com</strong>.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
