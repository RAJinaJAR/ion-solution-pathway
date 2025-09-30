export type Role = 'Trader / Portfolio Manager' | 'Risk Manager' | 'C-Suite / CFO / Treasurer' | 'Operations / IT';

export type Industry =
  | 'Agriculture and CPG'
  | 'Coal mining and production'
  | 'Crude oil, refined products, and NGLs'
  | 'Environmental credits and certificates'
  | 'Manufacturing and procurement'
  | 'Merchant trading'
  | 'Metals and mining'
  | 'Natural gas and LNG'
  | 'Petrochemicals'
  | 'Transportation and shipping'
  | 'Utilities, power, and renewables'
  | 'Banking & Financial Institutions';

export type Profile = 'Basic (< 10 users)' | 'Standard (10-100 users)' | 'Advanced (100+ users)';
export type DeliveryMethod = 'On-premise' | 'SaaS' | 'ION Cloud';
export type ProductType = 'CTRM' | 'Complementary';

export interface Product {
  productName: string;
  description: string;
  role: Role[];
  industries: Industry[];
  profile: Profile[];
  deliveryMethod: DeliveryMethod[];
  productType: ProductType;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  options?: string[];
  optionsAnswered?: boolean;
}

// FIX: Added missing DynamicQuestion interface based on its usage in DynamicQuestions.tsx.
export interface DynamicQuestion {
  questionText: string;
  options: string[];
}
