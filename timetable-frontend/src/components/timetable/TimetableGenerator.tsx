import { useState } from 'react';
import { TimetableFormData, INITIAL_FORM_DATA, ResultsData } from '@/types/timetable';
import { Stepper } from './Stepper';
import { StepNavigation } from './StepNavigation';
import { Step1Welcome } from './steps/Step1Welcome';
import { Step2Timing } from './steps/Step2Timing';
import { Step3Curriculum } from './steps/Step3Curriculum';
import { Step4Infrastructure } from './steps/Step4Infrastructure';
import { Step5Faculty } from './steps/Step5Faculty';
import { Step6Workload } from './steps/Step6Workload';
import { Step7Constraints } from './steps/Step7Constraints';
import { Step8Generation } from './steps/Step8Generation';
import { Step9Results } from './steps/Step9Results';

const STEPS = [
  { number: 1, title: 'Welcome', subtitle: 'Department Setup' },
  { number: 2, title: 'Timing', subtitle: 'Grid Config' },
  { number: 3, title: 'Curriculum', subtitle: 'Subjects & Labs' },
  { number: 4, title: 'Infrastructure', subtitle: 'Rooms Setup' },
  { number: 5, title: 'Faculty', subtitle: 'Directory' },
  { number: 6, title: 'Workload', subtitle: 'Allocations' },
  { number: 7, title: 'Constraints', subtitle: 'Preferences' },
  { number: 8, title: 'Generate', subtitle: 'Process' },
  { number: 9, title: 'Results', subtitle: 'Download' },
];

export const TimetableGenerator = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<TimetableFormData>(INITIAL_FORM_DATA);

  const updateFormData = <K extends keyof TimetableFormData>(
    key: K,
    value: TimetableFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const goToNextStep = () => {
    if (currentStep < 9) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
  };

  const handleGenerate = () => {
    goToNextStep();
  };

  const handleResultsUpdate = (results: ResultsData) => {
    updateFormData('results', results);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Welcome data={formData.welcome} onUpdate={(data) => updateFormData('welcome', data)} />;
      case 2:
        return <Step2Timing data={formData.timing} onUpdate={(data) => updateFormData('timing', data)} />;
      case 3:
        return <Step3Curriculum data={formData.curriculum} onUpdate={(data) => updateFormData('curriculum', data)} />;
      case 4:
        return <Step4Infrastructure data={formData.infrastructure} labSubjects={formData.curriculum.labSubjects} onUpdate={(data) => updateFormData('infrastructure', data)} />;
      case 5:
        return <Step5Faculty data={formData.faculty} onUpdate={(data) => updateFormData('faculty', data)} />;
      case 6:
        return (
          <Step6Workload 
            data={formData.workload} 
            faculty={formData.faculty.faculty} 
            curriculum={formData.curriculum}
            welcomeData={formData.welcome} 
            onUpdate={(data) => updateFormData('workload', data)} 
          />
        );
      case 7:
        return <Step7Constraints data={formData.constraints} welcomeData={formData.welcome} labSubjects={formData.curriculum.labSubjects} infrastructure={formData.infrastructure} onUpdate={(data) => updateFormData('constraints', data)} />;
      case 8:
        return (
          <Step8Generation
            data={formData.generation}
            formData={formData}
            onUpdate={(data) => updateFormData('generation', data)}
            onResultsUpdate={handleResultsUpdate}
            onGenerate={handleGenerate}
          />
        );
      case 9:
        // FIX: Passing 'faculty' and 'infrastructure' solves the TS error and White Screen
        return (
          <Step9Results 
            data={formData.results} 
            timingData={formData.timing} 
            welcomeData={formData.welcome} 
            faculty={formData.faculty.faculty}
            infrastructure={formData.infrastructure}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-navy text-primary-foreground py-6 px-4 shadow-lg">
        <div className="container max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Academic Timetable Generator</h1>
              <p className="text-primary-foreground/80 text-sm mt-1">Engineering College Scheduling System</p>
            </div>
            <div className="hidden md:block">
              <span className="text-gold font-display font-semibold">{formData.welcome.academicYear}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-7xl mx-auto px-4">
        <div className="bg-card rounded-b-xl shadow-md border border-t-0 border-border">
          <Stepper steps={STEPS} currentStep={currentStep} onStepClick={handleStepClick} />
        </div>
      </div>

      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="elegant-card overflow-hidden">
          {renderStep()}
          {currentStep < 9 && (
            <div className="px-8 pb-8">
              <StepNavigation
                currentStep={currentStep}
                totalSteps={9}
                onPrevious={goToPreviousStep}
                onNext={goToNextStep}
                nextLabel={currentStep === 8 ? 'View Results' : 'Continue'}
              />
            </div>
          )}
        </div>
      </main>
      
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>Designed with precision for academic excellence</p>
      </footer>
    </div>
  );
};