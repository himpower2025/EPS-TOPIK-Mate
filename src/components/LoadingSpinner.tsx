import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading Content..." }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
    </div>
    <p className="text-indigo-900 font-black text-xs uppercase tracking-widest text-center max-w-[200px] animate-pulse">
      {message}
    </p>
  </div>
);

export default LoadingSpinner;