import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Role, Industry, Profile, DeliveryMethod, ProductType, Product, DynamicQuestion } from './types';
import { ROLES, INDUSTRIES, PROFILES, DELIVERY_METHODS, PRODUCT_TYPES, PRODUCTS } from './constants';
import { generateDynamicQuestions } from './services/geminiService';
import { QuestionGroup } from './components/QuestionGroup';
import { ProductList } from './components/ProductList';
import { LeadCapture } from './components/LeadCapture';
import { DynamicQuestions } from './components/DynamicQuestions';
import { ResetIcon } from './components/icons';

const App: React.FC = () => {
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [selectedDelivery, setSelectedDelivery] = useState<DeliveryMethod | null>(null);
    const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);

    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    
    const handleClearFilters = useCallback(() => {
        setSelectedRole(null);
        setSelectedIndustry(null);
        setSelectedProfile(null);
        setSelectedDelivery(null);
        setSelectedProductType(null);
        setEmail('');
        setIsSubmitted(false);
        setDynamicQuestions([]);
        setIsLoadingQuestions(false);
    }, []);

    const filteredProducts = useMemo(() => {
        // Start with all products if no filters are selected
        if (!selectedRole && !selectedIndustry && !selectedProfile && !selectedDelivery && !selectedProductType) {
            return PRODUCTS;
        }

        return PRODUCTS.filter(p => {
            const roleMatch = selectedRole ? p.role.includes(selectedRole) : true;
            const industryMatch = selectedIndustry ? p.industries.includes(selectedIndustry) : true;
            const profileMatch = selectedProfile ? p.profile.includes(selectedProfile) : true;
            const deliveryMatch = selectedDelivery ? p.deliveryMethod.includes(selectedDelivery) : true;
            const productTypeMatch = selectedProductType ? p.productType === selectedProductType : true;
            
            return roleMatch && industryMatch && profileMatch && deliveryMatch && productTypeMatch;
        });
    }, [selectedRole, selectedIndustry, selectedProfile, selectedDelivery, selectedProductType]);
    
    const anyFilterActive = useMemo(() => 
        selectedRole || selectedIndustry || selectedProfile || selectedDelivery || selectedProductType,
        [selectedRole, selectedIndustry, selectedProfile, selectedDelivery, selectedProductType]
    );

    useEffect(() => {
        // If no relevant filters are active, clear questions and do nothing.
        if (!anyFilterActive || (!selectedRole && !selectedIndustry)) {
            setDynamicQuestions([]);
            setIsLoadingQuestions(false); // Ensure loading is off
            return;
        }
        
        // Show loading state as soon as a change is detected
        setIsLoadingQuestions(true);

        // Set up a timer to delay the API call.
        const debounceTimer = setTimeout(() => {
            const fetchQuestions = async () => {
                const filters = {
                    role: selectedRole,
                    industry: selectedIndustry,
                    profile: selectedProfile,
                    deliveryMethod: selectedDelivery,
                    productType: selectedProductType
                };
                try {
                    const questions = await generateDynamicQuestions(filters, filteredProducts);
                    setDynamicQuestions(questions);
                } catch (error) {
                    // The error from the user prompt suggests this is where it fails.
                    // Logging it is good.
                    console.error("Failed to generate dynamic questions:", error);
                    setDynamicQuestions([]); // Clear questions on error to avoid showing stale data.
                } finally {
                    // Hide loading state once the API call is complete (or has failed).
                    setIsLoadingQuestions(false);
                }
            };

            fetchQuestions();
        }, 500); // 500ms delay

        // This cleanup function will run every time the dependencies change,
        // which cancels the previous timer. This is the core of debouncing.
        return () => {
            clearTimeout(debounceTimer);
        };
        
    // The dependencies are correct. When any filter changes, this effect re-runs,
    // clearing the old timer and setting a new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anyFilterActive, selectedRole, selectedIndustry, selectedProfile, selectedDelivery, selectedProductType]);


    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Lead captured:", { 
            email, 
            filters: {
                role: selectedRole,
                industry: selectedIndustry,
                profile: selectedProfile,
                deliveryMethod: selectedDelivery,
                productType: selectedProductType,
            },
            products: filteredProducts.map(p => p.productName) 
        });
        setIsSubmitted(true);
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-800">Explore ION Commodity Solutions</h1>
                    <p className="text-slate-500 mt-3 max-w-2xl mx-auto">
                        Browse our full suite of products or use the filters to find the perfect solution for your business needs.
                    </p>
                    <a
                      href="https://recommendation-dev.onrender.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-block bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow hover:shadow-md"
                    >
                      Find a Product That Suits Your Needs
                    </a>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* --- Filters Sidebar --- */}
                    <aside className="lg:col-span-1 bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-8">
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Filters</h2>
                            {anyFilterActive && (
                               <button 
                                  onClick={handleClearFilters} 
                                  className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200"
                              >
                                  <ResetIcon />
                                  Clear All
                              </button>
                            )}
                        </div>
                        <QuestionGroup title="Your Role" options={ROLES} onSelect={option => setSelectedRole(option)} selectedValue={selectedRole} />
                        <QuestionGroup title="Your Industry" options={INDUSTRIES} onSelect={option => setSelectedIndustry(option)} selectedValue={selectedIndustry} />
                        <QuestionGroup title="Company Profile" options={PROFILES} onSelect={option => setSelectedProfile(option)} selectedValue={selectedProfile} />
                        <QuestionGroup title="Delivery Method" options={DELIVERY_METHODS} onSelect={option => setSelectedDelivery(option)} selectedValue={selectedDelivery} />
                        <QuestionGroup title="Product Type" options={PRODUCT_TYPES} onSelect={option => setSelectedProductType(option)} selectedValue={selectedProductType} />
                    </aside>

                    {/* --- Main Content --- */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                            <ProductList products={filteredProducts} />
                        </div>
                        
                        {anyFilterActive && (
                            <div className="space-y-8 mt-8">
                                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                                    <LeadCapture
                                        email={email}
                                        setEmail={setEmail}
                                        onSubmit={handleEmailSubmit}
                                        isSubmitted={isSubmitted}
                                    />
                                </div>
                                {!isSubmitted && (selectedRole || selectedIndustry) && (
                                     <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                                        <DynamicQuestions questions={dynamicQuestions} isLoading={isLoadingQuestions} />
                                     </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <footer className="text-center mt-12 py-4">
                    <p className="text-xs text-slate-400">
                      &copy; {new Date().getFullYear()} ION. All Rights Reserved.
                    </p>
                </footer>
            </div>
        </main>
    );
};

export default App;