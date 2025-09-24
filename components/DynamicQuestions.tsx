
import React, { useState } from 'react';
import type { DynamicQuestion } from '../types';
import { LoadingSpinner } from './icons';

interface DynamicQuestionsProps {
    questions: DynamicQuestion[];
    isLoading: boolean;
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="h-12 bg-slate-200 rounded"></div>
                    <div className="h-12 bg-slate-200 rounded"></div>
                    <div className="h-12 bg-slate-200 rounded"></div>
                    <div className="h-12 bg-slate-200 rounded"></div>
                </div>
            </div>
        ))}
    </div>
);

export const DynamicQuestions: React.FC<DynamicQuestionsProps> = ({ questions, isLoading }) => {
    const [answers, setAnswers] = useState<Record<string, string[]>>({});

    const handleOptionSelect = (questionText: string, option: string) => {
        setAnswers(prev => {
            const currentAnswers = prev[questionText] || [];
            const newAnswers = currentAnswers.includes(option)
                ? currentAnswers.filter(a => a !== option) // Deselect if already selected
                : [...currentAnswers, option]; // Select if not selected
            return { ...prev, [questionText]: newAnswers };
        });
    };

    if (isLoading) {
        return (
            <div className="p-6 bg-white border border-slate-200 rounded-lg">
                <h2 className="text-xl font-semibold text-slate-800 mb-4 text-center">One Moment...</h2>
                <p className="text-center text-slate-600 text-sm mb-6">Crafting some questions to better understand your needs.</p>
                <LoadingSkeleton />
            </div>
        );
    }

    if (questions.length === 0) {
        return null; // Don't render anything if there are no questions
    }

    return (
        <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 text-center">Help Us Understand You Better</h2>
            <p className="text-center text-slate-600 text-sm mb-6">(Optional) Select all that apply. Answering these helps us tailor your guide.</p>
            <div className="space-y-6">
                {questions.map((q, index) => (
                    <div key={index}>
                        <p className="font-medium text-slate-700 mb-2">{q.questionText}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {q.options.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleOptionSelect(q.questionText, opt)}
                                    className={`
                                        px-4 py-2 text-sm rounded-md transition-colors duration-200 text-left
                                        ${answers[q.questionText]?.includes(opt)
                                            ? 'bg-slate-700 text-white'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }
                                    `}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
