"use client";

import { useState, useSyncExternalStore } from "react";

type OnboardingStep = {
  title: string;
  description: string;
  icon: string;
};

const steps: OnboardingStep[] = [
  {
    title: "Scan your bills",
    description: "Point your camera at any invoice or bill. Our AI reads it instantly and extracts all the key data.",
    icon: "📸",
  },
  {
    title: "Verify & save",
    description: "Review what the AI found, make any corrections, and save. It takes seconds, not minutes.",
    icon: "✓",
  },
  {
    title: "Track everything",
    description: "See all your income and expenses in one place. Filter, search, and export anytime.",
    icon: "📊",
  },
];

const STORAGE_KEY = "byebills-onboarding-done";

const subscribeNoop = () => () => {};

export default function OnboardingOverlay({ hasBusiness = false }: { hasBusiness?: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  // Reads localStorage without a setState-in-effect; the server snapshot is
  // "done" so nothing renders during SSR/hydration.
  const alreadyDone = useSyncExternalStore(
    subscribeNoop,
    () => localStorage.getItem(STORAGE_KEY) !== null,
    () => true
  );
  // Skip for users who already have a business (not first-timers)
  const visible = !hasBusiness && !alreadyDone && !dismissed;

  function handleNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }

  if (!visible) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
        {/* Skip button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={handleDismiss}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            Skip
          </button>
        </div>

        {/* Icon */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/10 text-3xl">
            {step.icon}
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">{step.title}</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">{step.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep
                  ? "w-6 bg-brand"
                  : i < currentStep
                  ? "w-1.5 bg-brand/40"
                  : "w-1.5 bg-zinc-200"
              }`}
            />
          ))}
        </div>

        {/* Action */}
        <button
          onClick={handleNext}
          className="w-full rounded-xl bg-brand py-3 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
        >
          {isLast ? "Get started" : "Next"}
        </button>
      </div>
    </div>
  );
}
