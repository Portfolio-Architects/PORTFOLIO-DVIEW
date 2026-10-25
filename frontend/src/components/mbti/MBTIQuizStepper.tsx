'use client';

import React, { useState } from 'react';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import { QUIZ_QUESTIONS } from '@/lib/utils/mbtiScoring';

export interface MBTIQuizStepperProps {
  onComplete: (answers: Record<number, 'A' | 'B'>) => void;
  onCancel?: () => void;
  className?: string;
}

export function MBTIQuizStepper({ onComplete, onCancel, className = '' }: MBTIQuizStepperProps) {
  const [currentStep, setCurrentStep] = useState(0); // 0 to 6 (7 questions)
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B'>>({});
  const [selectedAnim, setSelectedAnim] = useState<'A' | 'B' | null>(null);

  const totalQuestions = QUIZ_QUESTIONS.length;
  const currentQuestion = QUIZ_QUESTIONS[currentStep];
  const progressPercent = Math.round(((currentStep + 1) / totalQuestions) * 100);

  const handleSelectOption = (choice: 'A' | 'B') => {
    setSelectedAnim(choice);
    const nextAnswers = { ...answers, [currentQuestion.id]: choice };
    setAnswers(nextAnswers);

    // Subtle micro-delay for 60fps tactile feedback
    setTimeout(() => {
      setSelectedAnim(null);
      if (currentStep < totalQuestions - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        onComplete(nextAnswers);
      }
    }, 200);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else if (onCancel) {
      onCancel();
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentStep(0);
  };

  return (
    <div
      data-testid="mbti-quiz-stepper"
      className={`w-full flex flex-col bg-surface rounded-2xl border border-border/80 shadow-xs overflow-hidden ${className}`}
    >
      {/* Stepper Header & Progress Bar */}
      <div className="p-4 sm:p-6 border-b border-border/60 bg-body/60">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handlePrev}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-secondary hover:text-primary transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="이전 질문으로 이동"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{currentStep === 0 ? '처음으로' : '이전 질문'}</span>
          </button>

          <div className="flex items-center px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-500/20">
            <span>Q{currentQuestion.id} / {totalQuestions}</span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-tertiary hover:text-primary p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="다시 시작"
            aria-label="테스트 초기화"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Question Body */}
      <div className="p-6 sm:p-8 lg:p-10 flex flex-col items-center text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-3">
          {currentQuestion.theme}
        </span>

        <h2 className="text-xl sm:text-2xl font-black text-primary leading-snug mb-2 max-w-2xl">
          {currentQuestion.title}
        </h2>

        {currentQuestion.description && (
          <p className="text-xs sm:text-sm text-secondary mb-6">
            {currentQuestion.description}
          </p>
        )}

        {/* 2-Option Responsive Grid */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* Option A */}
          <button
            type="button"
            data-testid="quiz-option-a"
            onClick={() => handleSelectOption('A')}
            className={`group w-full text-left p-5 sm:p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer relative overflow-hidden active:scale-[0.98] ${
              selectedAnim === 'A'
                ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-2 ring-emerald-400'
                : 'border-border/80 hover:border-emerald-500/60 bg-body hover:bg-emerald-500/[0.04] shadow-2xs'
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm shrink-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                A
              </span>
              <div className="flex flex-col">
                <p className="text-sm sm:text-base font-bold text-primary leading-snug">
                  {currentQuestion.optionA.label}
                </p>
                {currentQuestion.optionA.subtext && (
                  <p className="text-xs text-secondary mt-1.5">
                    {currentQuestion.optionA.subtext}
                  </p>
                )}
              </div>
            </div>
          </button>

          {/* Option B */}
          <button
            type="button"
            data-testid="quiz-option-b"
            onClick={() => handleSelectOption('B')}
            className={`group w-full text-left p-5 sm:p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer relative overflow-hidden active:scale-[0.98] ${
              selectedAnim === 'B'
                ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-2 ring-emerald-400'
                : 'border-border/80 hover:border-emerald-500/60 bg-body hover:bg-emerald-500/[0.04] shadow-2xs'
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm shrink-0 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                B
              </span>
              <div className="flex flex-col">
                <p className="text-sm sm:text-base font-bold text-primary leading-snug">
                  {currentQuestion.optionB.label}
                </p>
                {currentQuestion.optionB.subtext && (
                  <p className="text-xs text-secondary mt-1.5">
                    {currentQuestion.optionB.subtext}
                  </p>
                )}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
