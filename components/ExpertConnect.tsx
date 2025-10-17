import React, { useState } from 'react';
import { UserIcon, XIcon, CheckCircleIcon } from './icons';
 
export const ExpertConnect: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        email: '',
        phone: '',
        message: '',
    });
 
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
 
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Expert Connect Request:', formData);
        setIsSubmitted(true);
    };
    const handleClose = () => {
        setIsOpen(false);
        // Reset form after a short delay to allow for the closing animation
        setTimeout(() => {
            setIsSubmitted(false);
            setFormData({ name: '', company: '', email: '', phone: '', message: '' });
        }, 300);
    };
 
    const isFormValid = formData.name && formData.company && formData.email && formData.message;
 
    return (
<>
<button
                onClick={() => setIsOpen(!isOpen)}
                className={`group fixed bottom-28 right-6 bg-green-600 text-white rounded-full p-4 shadow-lg hover:bg-green-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 z-50 ${isOpen ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`}
                aria-label="Speak to an expert"
>
<UserIcon className="w-8 h-8"/>
<span className="absolute bottom-1/2 translate-y-1/2 right-full mr-4 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Speak to an Expert
</span>
</button>
 
            <div className={`fixed bottom-6 right-6 w-[calc(100%-3rem)] max-w-md h-auto max-h-[80vh] flex flex-col bg-white rounded-2xl shadow-2xl transition-all duration-300 ease-in-out z-50 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                {/* Header */}
<header className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex-shrink-0">
<div className="flex items-center gap-3">
<div className="bg-green-600 p-2 rounded-full">
<UserIcon className="w-5 h-5 text-white" />
</div>
<h3 className="font-bold text-slate-800">Connect with an Expert</h3>
</div>
<button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
<XIcon className="w-6 h-6"/>
</button>
</header>
 
                {/* Form Content */}
<div className="flex-1 overflow-y-auto p-6">
                    {isSubmitted ? (
<div className="text-center py-8">
<CheckCircleIcon />
<h3 className="text-xl font-semibold text-green-800">Request Sent!</h3>
<p className="text-green-700 mt-2">Thank you for your interest. An ION expert will be in touch with you shortly.</p>
</div>
                    ) : (
<form onSubmit={handleSubmit} className="space-y-4">
<div>
<label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
<input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-sm" />
</div>
<div>
<label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
<input type="text" name="company" id="company" value={formData.company} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-sm" />
</div>
<div>
<label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Work Email</label>
<input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-sm" />
</div>
<div>
<label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Phone Number <span className="text-slate-400">(Optional)</span></label>
<input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-sm" />
</div>
<div>
<label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">How can we help you?</label>
<textarea name="message" id="message" rows={4} value={formData.message} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-sm resize-none"></textarea>
</div>
<div>
<button
                                    type="submit"
                                    disabled={!isFormValid}
                                    className="w-full bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
>
                                    Submit Request
</button>
</div>
</form>
                    )}
</div>
</div>
</>
    );
};
