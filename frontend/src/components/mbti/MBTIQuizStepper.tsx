'use client';

import React, { useState } from 'react';
import { ChevronLeft, RotateCcw, Sparkles } from 'lucide-react';
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
      className={`w-full max-w-2xl mx-auto flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden ${className}`}
    >
      {/* Stepper Header & Progress Bar */}
      <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handlePrev}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="이전 질문으로 이동"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{currentStep === 0 ? '처음으로' : '이전 질문'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold text-xs border border-orange-200/60 dark:border-orange-900/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Q{currentQuestion.id} / {totalQuestions}</span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="다시 시작"
            aria-label="테스트 초기화"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Question Body */}
      <div className="p-6 sm:p-8 flex flex-col items-center text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-100/60 dark:bg-orange-950/40 px-3 py-1 rounded-full mb-3">
          {currentQuestion.theme}
        </span>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug mb-2 max-w-xl">
          {currentQuestion.title}
        </h2>

        {currentQuestion.description && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-8">
            {currentQuestion.description}
          </p>
        )}

        {/* 2-Option Stack */}
        <div className="w-full flex flex-col gap-4 mt-2">
          {/* Option A */}
          <button
            type="button"
            data-testid="quiz-option-a"
            onClick={() => handleSelectOption('A')}
            className={`group w-full text-left p-5 sm:p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer relative overflow-hidden active:scale-[0.98] ${
              selectedAnim === 'A'
                ? 'border-orange-500 bg-orange-500/10 shadow-md ring-2 ring-orange-400'
                : 'border-slate-200 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500/70 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-orange-50/30 dark:hover:bg-orange-950/20 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm shrink-0 bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                A
              </span>
              <div className="flex flex-col">
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {currentQuestion.optionA.label}
                </p>
                {currentQuestion.optionA.subtext && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
                ? 'border-orange-500 bg-orange-500/10 shadow-md ring-2 ring-orange-400'
                : 'border-slate-200 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500/70 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-orange-50/30 dark:hover:bg-orange-950/20 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm shrink-0 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                B
              </span>
              <div className="flex flex-col">
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {currentQuestion.optionB.label}
                </p>
                {currentQuestion.optionB.subtext && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
