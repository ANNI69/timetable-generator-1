import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  nextLabel?: string;
  isNextDisabled?: boolean;
}

export const StepNavigation = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  nextLabel = 'Continue',
  isNextDisabled = false,
}: StepNavigationProps) => {
  return (
    <div className="flex items-center justify-between pt-8 border-t border-border mt-8">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentStep === 1}
        className="gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </Button>
      
      <span className="text-sm text-muted-foreground">
        Step {currentStep} of {totalSteps}
      </span>
      
      <Button
        onClick={onNext}
        disabled={isNextDisabled}
        className="gap-2 bg-primary hover:bg-primary/90"
      >
        {nextLabel}
        {currentStep < totalSteps && <ChevronRight className="w-4 h-4" />}
      </Button>
    </div>
  );
};
