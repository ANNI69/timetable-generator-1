import { WelcomeData } from '@/types/timetable';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { GraduationCap } from 'lucide-react';

interface Step1WelcomeProps {
  data: WelcomeData;
  onUpdate: (data: WelcomeData) => void;
}

const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Electronics & Telecommunication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
];

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26'];

export const Step1Welcome = ({ data, onUpdate }: Step1WelcomeProps) => {
  const handleClassToggle = (className: string, checked: boolean) => {
    const updatedClasses = data.classes.map((c) =>
      c.name === className ? { ...c, selected: checked } : c
    );
    onUpdate({ ...data, classes: updatedClasses });
  };

  const handleDivisionChange = (className: string, divisions: number) => {
    const updatedClasses = data.classes.map((c) =>
      c.name === className ? { ...c, divisions } : c
    );
    onUpdate({ ...data, classes: updatedClasses });
  };

  return (
    <div className="form-section animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full gradient-navy flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-gold" />
        </div>
        <div>
          <h2 className="section-title mb-0">Welcome & Scope</h2>
          <p className="text-muted-foreground text-sm">Define your department and class structure</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="input-label">Department</Label>
          <Select
            value={data.department}
            onValueChange={(value) => onUpdate({ ...data, department: value })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="input-label">Academic Year</Label>
          <Select
            value={data.academicYear}
            onValueChange={(value) => onUpdate({ ...data, academicYear: value })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select Academic Year" />
            </SelectTrigger>
            <SelectContent>
              {ACADEMIC_YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8">
        <Label className="input-label mb-4 block">Class Selection & Division Count</Label>
        <div className="grid gap-4 md:grid-cols-3">
          {data.classes.map((classItem) => (
            <div
              key={classItem.name}
              className={`
                p-5 rounded-lg border-2 transition-all duration-300
                ${classItem.selected 
                  ? 'border-accent bg-accent/5 shadow-md' 
                  : 'border-border bg-card hover:border-accent/50'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-4">
                <Checkbox
                  id={classItem.name}
                  checked={classItem.selected}
                  onCheckedChange={(checked) => handleClassToggle(classItem.name, checked as boolean)}
                />
                <label
                  htmlFor={classItem.name}
                  className="text-lg font-display font-semibold cursor-pointer"
                >
                  {classItem.name}
                </label>
              </div>
              
              {classItem.selected && (
                <div className="animate-fade-in">
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Number of Divisions
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={classItem.divisions}
                    onChange={(e) => handleDivisionChange(classItem.name, parseInt(e.target.value) || 1)}
                    className="h-10"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
