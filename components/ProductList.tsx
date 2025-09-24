import React from 'react';
import type { Product } from '../types';
import { PRODUCTS } from '../constants';

interface ProductCardProps {
    product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => (
    <div className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between h-full">
        <div>
            <h3 className="font-bold text-blue-700 text-lg">{product.productName}</h3>
            <p className="text-sm text-slate-600 mt-1 mb-4">{product.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs items-center mt-auto pt-2 border-t border-slate-100">
            <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-semibold">{product.productType}</span>
            {product.deliveryMethod.map(method => (
                <span key={method} className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full font-medium">{method}</span>
            ))}
        </div>
    </div>
);

interface ProductListProps {
    products: Product[];
}

export const ProductList: React.FC<ProductListProps> = ({ products }) => {
    return (
        <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
                Showing {products.length} of {PRODUCTS.length} Solutions
            </h2>
            {products.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-100 rounded-lg">
                    <h3 className="text-lg font-semibold text-slate-700">No products match your selection.</h3>
                    <p className="text-slate-500 mt-2">Please adjust your filters or clear them to see all solutions.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map(product => (
                        <ProductCard key={product.productName} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
};