import { TimingData } from '@/types/timetable';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Coffee } from 'lucide-react';

interface Step2TimingProps {
  data: TimingData;
  onUpdate: (data: TimingData) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const Step2Timing = ({ data, onUpdate }: Step2TimingProps) => {
  const handleDayToggle = (day: string, checked: boolean) => {
    const updatedDays = checked
      ? [...data.workingDays, day]
      : data.workingDays.filter((d) => d !== day);
    onUpdate({ ...data, workingDays: updatedDays });
  };

  // Helper to calculate time strings
  const calculateTime = (startStr: string, minutesToAdd: number) => {
    const [h, m] = startStr.split(':').map(Number);
    const totalMins = h * 60 + m + minutesToAdd;
    const newH = Math.floor(totalMins / 60);
    const newM = totalMins % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  };

  return (
    <div className="form-section animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full gradient-navy flex items-center justify-center">
          <Clock className="w-6 h-6 text-gold" />
        </div>
        <div>
          <h2 className="section-title mb-0">Timing & Grid Configuration</h2>
          <p className="text-muted-foreground text-sm">Set up your daily schedule parameters</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* 1. Start Time */}
        <div className="space-y-2">
          <Label className="input-label">College Start Time</Label>
          <Input
            type="time"
            value={data.startTime}
            onChange={(e) => onUpdate({ ...data, startTime: e.target.value })}
            className="h-12"
          />
        </div>

        {/* 2. Slot Duration */}
        <div className="space-y-2">
          <Label className="input-label">Lecture Duration (mins)</Label>
          <Select
            value={data.slotDuration.toString()}
            onValueChange={(value) => onUpdate({ ...data, slotDuration: parseInt(value) })}
          >
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="50">50 minutes</SelectItem>
              <SelectItem value="60">60 minutes</SelectItem>
              <SelectItem value="90">90 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 3. Recess Position (Calculated Time) */}
        <div className="space-y-2">
          <Label className="input-label">Recess Starts After</Label>
          <Select
            value={data.recessAfterSlot.toString()}
            onValueChange={(value) => onUpdate({ ...data, recessAfterSlot: parseInt(value) })}
          >
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((slot) => {
                const timeAtSlot = calculateTime(data.startTime, slot * data.slotDuration);
                return (
                  <SelectItem key={slot} value={slot.toString()}>
                    Slot {slot} (at {timeAtSlot})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* 4. Recess Duration */}
        <div className="space-y-2">
          <Label className="input-label">Recess Duration (mins)</Label>
          <div className="relative">
            <Input
              type="number"
              min={15}
              max={120}
              step={5}
              value={data.recessDuration || 45} // Default to 45 if undefined
              onChange={(e) => onUpdate({ ...data, recessDuration: parseInt(e.target.value) || 45 })}
              className="h-12 pl-10"
            />
            <Coffee className="w-4 h-4 text-muted-foreground absolute left-3 top-4" />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="space-y-2 max-w-[200px]">
          <Label className="input-label">Total Lectures per Day</Label>
          <Input
            type="number"
            min={4}
            max={12}
            value={data.totalSlots}
            onChange={(e) => onUpdate({ ...data, totalSlots: parseInt(e.target.value) || 8 })}
            className="h-12"
          />
        </div>
      </div>

      <div className="mt-8">
        <Label className="input-label mb-4 block">Working Days</Label>
        <div className="flex flex-wrap gap-3">
          {DAYS.map((day) => (
            <label
              key={day}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all
                ${data.workingDays.includes(day)
                  ? 'border-accent bg-accent/10 text-foreground'
                  : 'border-border bg-card hover:border-accent/50 text-muted-foreground'
                }
              `}
            >
              <Checkbox
                checked={data.workingDays.includes(day)}
                onCheckedChange={(checked) => handleDayToggle(day, checked as boolean)}
              />
              <span className="font-medium">{day}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Dynamic Schedule Preview */}
      <div className="mt-8 p-4 rounded-lg bg-accent/10 border border-accent/30">
        <h4 className="font-display font-semibold text-sm mb-2">Schedule Preview</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            • College Starts: <span className="gold-accent font-mono">{data.startTime}</span>
          </p>
          <p>
            • Lectures: <span className="gold-accent">{data.totalSlots} slots</span> × {data.slotDuration} mins
          </p>
          <p>
            • Recess: <span className="gold-accent">{data.recessDuration} mins</span> (Starts at {calculateTime(data.startTime, data.recessAfterSlot * data.slotDuration)})
          </p>
          <p>
            • College Ends: <span className="gold-accent font-mono">
              {calculateTime(data.startTime, (data.totalSlots * data.slotDuration) + (data.recessDuration || 45))}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};