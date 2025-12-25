import { ConstraintsData, WelcomeData, LabSubject, InfrastructureData } from '@/types/timetable';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings2, Home, Cpu, Clock } from 'lucide-react';

interface Step7ConstraintsProps {
  data: ConstraintsData;
  welcomeData: WelcomeData;
  labSubjects: LabSubject[];
  infrastructure: InfrastructureData;
  onUpdate: (data: ConstraintsData) => void;
}

export const Step7Constraints = ({ 
  data, 
  welcomeData, 
  labSubjects, 
  infrastructure,
  onUpdate 
}: Step7ConstraintsProps) => {
  // Get all selected divisions
  const divisions: string[] = [];
  welcomeData.classes
    .filter(c => c.selected)
    .forEach(c => {
      for (let i = 0; i < c.divisions; i++) {
        divisions.push(`${c.name}-${String.fromCharCode(65 + i)}`);
      }
    });

  const updateHomeRoom = (division: string, room: string) => {
    const newAssignments = { ...data.homeRoomAssignments };
    if (room && room !== 'none') {
      newAssignments[division] = room;
    } else {
      delete newAssignments[division];
    }
    onUpdate({ ...data, homeRoomAssignments: newAssignments });
  };

  const updateShiftBias = (division: string, bias: 'morning' | 'afternoon' | null) => {
    const newBias = { ...data.shiftBias };
    if (bias) {
      newBias[division] = bias;
    } else {
      delete newBias[division];
    }
    onUpdate({ ...data, shiftBias: newBias });
  };

  const updateLabEquipment = (labType: string, rooms: string[]) => {
    const newMapping = { ...data.labEquipmentMapping };
    if (rooms.length > 0) {
      newMapping[labType] = rooms;
    } else {
      delete newMapping[labType];
    }
    onUpdate({ ...data, labEquipmentMapping: newMapping });
  };

  const toggleLabRoom = (labType: string, room: string) => {
    const current = data.labEquipmentMapping[labType] || [];
    const newRooms = current.includes(room)
      ? current.filter(r => r !== room)
      : [...current, room];
    updateLabEquipment(labType, newRooms);
  };

  // Get unique lab subject names for equipment mapping
  const labSubjectNames = [...new Set(labSubjects.map(lab => lab.name))];

  return (
    <div className="form-section animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full gradient-navy flex items-center justify-center">
          <Settings2 className="w-6 h-6 text-gold" />
        </div>
        <div>
          <h2 className="section-title mb-0">Strategic Constraints</h2>
          <p className="text-muted-foreground text-sm">Configure advanced scheduling preferences</p>
        </div>
      </div>

      {/* Lab Equipment Mapping */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-primary" />
          <Label className="input-label mb-0">Lab Equipment Mapping</Label>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Specify which lab rooms have specific equipment requirements
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {labSubjectNames.map(subjectName => (
            <div key={subjectName} className="p-4 rounded-lg border border-border bg-card">
              <h4 className="font-medium text-sm mb-3">{subjectName}</h4>
              <div className="flex flex-wrap gap-2 mt-2">
                {infrastructure.labRooms.map(room => (
                  <label key={room} className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-md border border-border bg-muted/50 hover:bg-muted transition-colors">
                    <Checkbox
                      checked={(data.labEquipmentMapping[subjectName] || []).includes(room)}
                      onCheckedChange={() => toggleLabRoom(subjectName, room)}
                    />
                    <span className="text-sm">{room}</span>
                  </label>
                ))}
                {infrastructure.labRooms.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No lab rooms configured</p>
                )}
              </div>
            </div>
          ))}
          {labSubjectNames.length === 0 && (
            <p className="text-sm text-muted-foreground italic col-span-3">No lab subjects configured</p>
          )}
        </div>
      </div>

      {/* Home Room Assignment */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Home className="w-5 h-5 text-primary" />
          <Label className="input-label mb-0">Home Room Assignment</Label>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Assign a primary theory room to each division
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {divisions.map(division => (
            <div
              key={division}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
            >
              <span className="font-medium">{division}</span>
              <Select
                value={data.homeRoomAssignments[division] || 'none'}
                onValueChange={(value) => updateHomeRoom(division, value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {infrastructure.theoryRooms.map(room => (
                    <SelectItem key={room} value={room}>
                      Room {room}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {/* Shift Bias */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <Label className="input-label mb-0">Shift Bias (Lab Preference)</Label>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Select whether divisions prefer morning or afternoon lab sessions
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {divisions.map(division => (
            <div
              key={division}
              className="p-4 rounded-lg border border-border bg-card"
            >
              <span className="font-medium block mb-3">{division}</span>
              <div className="flex gap-2">
                {[{ key: 'morning', label: 'Morning' }, { key: 'afternoon', label: 'Afternoon' }].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => updateShiftBias(
                      division, 
                      data.shiftBias[division] === key ? null : key as 'morning' | 'afternoon'
                    )}
                    className={`
                      flex-1 px-3 py-2 rounded text-sm font-medium transition-all
                      ${data.shiftBias[division] === key
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
