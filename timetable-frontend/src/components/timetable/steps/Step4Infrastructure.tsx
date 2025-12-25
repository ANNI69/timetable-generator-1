import { useState } from 'react';
import { InfrastructureData, LabSubject } from '@/types/timetable';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, X } from 'lucide-react';

interface Step4InfrastructureProps {
  data: InfrastructureData;
  labSubjects: LabSubject[];
  onUpdate: (data: InfrastructureData) => void;
}

export const Step4Infrastructure = ({ data, labSubjects, onUpdate }: Step4InfrastructureProps) => {
  const [newTheoryRoom, setNewTheoryRoom] = useState('');
  const [newLabRoom, setNewLabRoom] = useState('');

  const addTheoryRoom = () => {
    if (!newTheoryRoom || data.theoryRooms.includes(newTheoryRoom)) return;
    onUpdate({ ...data, theoryRooms: [...data.theoryRooms, newTheoryRoom] });
    setNewTheoryRoom('');
  };

  const addLabRoom = () => {
    if (!newLabRoom || data.labRooms.includes(newLabRoom)) return;
    onUpdate({ ...data, labRooms: [...data.labRooms, newLabRoom] });
    setNewLabRoom('');
  };

  const removeTheoryRoom = (room: string) => {
    onUpdate({ ...data, theoryRooms: data.theoryRooms.filter((r) => r !== room) });
  };

  const removeLabRoom = (room: string) => {
    onUpdate({ ...data, labRooms: data.labRooms.filter((r) => r !== room) });
  };

  const updateSpecialAssignment = (labId: string, room: string) => {
    const newAssignments = { ...data.specialAssignments };
    if (room && room !== 'none') {
      newAssignments[labId] = room;
    } else {
      delete newAssignments[labId];
    }
    onUpdate({ ...data, specialAssignments: newAssignments });
  };

  const specialLabs = labSubjects.filter((lab) => lab.isSpecial);

  return (
    <div className="form-section animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full gradient-navy flex items-center justify-center">
          <Building2 className="w-6 h-6 text-gold" />
        </div>
        <div>
          <h2 className="section-title mb-0">Infrastructure Setup</h2>
          <p className="text-muted-foreground text-sm">Configure your available rooms and special assignments</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Theory Rooms */}
        <div className="space-y-4">
          <Label className="input-label">Theory Rooms</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Room number (e.g., 701)"
              value={newTheoryRoom}
              onChange={(e) => setNewTheoryRoom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTheoryRoom()}
            />
            <Button onClick={addTheoryRoom} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.theoryRooms.map((room) => (
              <span
                key={room}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm"
              >
                {room}
                <button onClick={() => removeTheoryRoom(room)} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {data.theoryRooms.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No theory rooms added yet</p>
          )}
        </div>

        {/* Lab Rooms */}
        <div className="space-y-4">
          <Label className="input-label">Lab Rooms</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Room number (e.g., 801)"
              value={newLabRoom}
              onChange={(e) => setNewLabRoom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addLabRoom()}
            />
            <Button onClick={addLabRoom} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.labRooms.map((room) => (
              <span
                key={room}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
              >
                {room}
                <button onClick={() => removeLabRoom(room)} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {data.labRooms.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No lab rooms added yet</p>
          )}
        </div>
      </div>

      {/* Special Assignments */}
      {specialLabs.length > 0 && (
        <div className="mt-8">
          <Label className="input-label mb-4 block">Special Lab Room Assignments</Label>
          <div className="space-y-3">
            {specialLabs.map((lab) => (
              <div
                key={lab.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-xs font-medium bg-accent/20 text-accent rounded">
                    {lab.code}
                  </span>
                  <span className="font-medium">{lab.name}</span>
                </div>
                <Select
                  value={data.specialAssignments[lab.id] || 'none'}
                  onValueChange={(value) => updateSpecialAssignment(lab.id, value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Assign room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {[...data.theoryRooms, ...data.labRooms].map((room) => (
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
      )}

      <div className="mt-8 p-4 rounded-lg bg-accent/10 border border-accent/30">
        <h4 className="font-display font-semibold text-sm mb-2">Infrastructure Summary</h4>
        <p className="text-sm text-muted-foreground">
          You have <span className="gold-accent">{data.theoryRooms.length} theory rooms</span> and{' '}
          <span className="gold-accent">{data.labRooms.length} lab rooms</span> configured.
          {specialLabs.length > 0 && (
            <> With <span className="gold-accent">{Object.keys(data.specialAssignments).length}/{specialLabs.length}</span> special assignments.</>
          )}
        </p>
      </div>
    </div>
  );
};
