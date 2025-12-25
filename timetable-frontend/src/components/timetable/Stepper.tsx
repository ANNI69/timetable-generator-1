import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  number: number;
  title: string;
  subtitle?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const Stepper = ({ steps, currentStep, onStepClick }: StepperProps) => {
  return (
    <div className="w-full py-6 px-4">
      {/* Progress bar background */}
      <div className="relative mb-8">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-accent transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
        
        {/* Step circles */}
        <div className="relative flex justify-between">
        {steps.map((step) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;
            
            return (
              <button
                key={step.number}
                onClick={() => onStepClick?.(step.number)}
                className="flex flex-col items-center group cursor-pointer"
              >
                <div
                  className={cn(
                    "step-circle relative z-10",
                    isCompleted && "step-circle-completed",
                    isCurrent && "step-circle-active",
                    !isCompleted && !isCurrent && "step-circle-pending"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>
                <div className="mt-3 text-center max-w-[100px]">
                  <p className={cn(
                    "text-xs font-medium transition-colors",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  {step.subtitle && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">
                      {step.subtitle}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
