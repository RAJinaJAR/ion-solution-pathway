
import React from 'react';
import { CheckCircleIcon } from './icons';

interface LeadCaptureProps {
  email: string;
  setEmail: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitted: boolean;
}

export const LeadCapture: React.FC<LeadCaptureProps> = ({ email, setEmail, onSubmit, isSubmitted }) => {
  if (isSubmitted) {
    return (
      <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircleIcon />
        <h3 className="text-xl font-semibold text-green-800">Thank You!</h3>
        <p className="text-green-700 mt-2">Your personalized guide is on its way to your inbox.</p>
      </div>
    );
  }

  return (
    <div className="mb-8 p-6 bg-blue-50/50 border border-blue-200/50 rounded-lg">
      <h2 className="text-xl font-semibold text-slate-800 mb-4 text-center">Get Your Personalized Guide</h2>
      <p className="text-center text-slate-600 text-sm mb-4">Enter your email to receive a detailed breakdown of your recommended solutions.</p>
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 justify-center">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@company.com"
          required
          className="w-full sm:w-64 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Send My Guide
        </button>
      </form>
    </div>
  );
};
