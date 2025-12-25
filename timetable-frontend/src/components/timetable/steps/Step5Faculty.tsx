import { Faculty, FacultyData } from '@/types/timetable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Trash2, UserCog, Wand2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Step5FacultyProps {
  data: FacultyData;
  onUpdate: (data: FacultyData) => void;
}

export const Step5Faculty = ({ data, onUpdate }: Step5FacultyProps) => {

  // --- DEFAULT DATA LOADER (V66 TEMPLATE) ---
  const loadDefaults = () => {
    const defaultFaculty: Faculty[] = [
      // Shift A (Morning) - Seniors
      { id: '1', name: 'T1', shortCode: 'T1', role: 'HOD', experience: 25, shift: '9-5' },
      { id: '2', name: 'T2', shortCode: 'T2', role: 'Div Incharge', experience: 18, shift: '9-5' },
      { id: '3', name: 'T3', shortCode: 'T3', role: 'Div Incharge', experience: 16, shift: '9-5' },
      { id: '4', name: 'T4', shortCode: 'T4', role: 'Div Incharge', experience: 15, shift: '9-5' },
      { id: '5', name: 'T5', shortCode: 'T5', role: 'Div Incharge', experience: 14, shift: '9-5' },
      { id: '6', name: 'T6', shortCode: 'T6', role: 'Div Incharge', experience: 13, shift: '9-5' },
      { id: '7', name: 'T7', shortCode: 'T7', role: 'Div Incharge', experience: 12, shift: '9-5' },
      { id: '8', name: 'T8', shortCode: 'T8', role: 'Div Incharge', experience: 12, shift: '9-5' },

      // Shift B (Afternoon) - Juniors/Mid-level
      { id: '9', name: 'T9', shortCode: 'T9', role: 'Faculty', experience: 8, shift: '10-6' },
      { id: '10', name: 'T10', shortCode: 'T10', role: 'Faculty', experience: 7, shift: '10-6' },
      { id: '11', name: 'T11', shortCode: 'T11', role: 'Faculty', experience: 6, shift: '10-6' },
      { id: '12', name: 'T12', shortCode: 'T12', role: 'Faculty', experience: 5, shift: '10-6' },
      { id: '13', name: 'T13', shortCode: 'T13', role: 'Faculty', experience: 5, shift: '10-6' },
      { id: '14', name: 'T14', shortCode: 'T14', role: 'Faculty', experience: 4, shift: '10-6' },
      { id: '15', name: 'T15', shortCode: 'T15', role: 'Faculty', experience: 4, shift: '10-6' },
      { id: '16', name: 'T16', shortCode: 'T16', role: 'Faculty', experience: 3, shift: '10-6' },
      { id: '17', name: 'T17', shortCode: 'T17', role: 'Faculty', experience: 3, shift: '10-6' },
      { id: '18', name: 'T18', shortCode: 'T18', role: 'Faculty', experience: 2, shift: '10-6' },
      { id: '19', name: 'T19', shortCode: 'T19', role: 'Faculty', experience: 2, shift: '10-6' },
      { id: '20', name: 'T20', shortCode: 'T20', role: 'Faculty', experience: 1, shift: '10-6' },
      { id: '21', name: 'T21', shortCode: 'T21', role: 'Faculty', experience: 1, shift: '10-6' },

      // Special Faculty (Maths)
      { id: '22', name: 'Mrs. Smitha', shortCode: 'Smi', role: 'Faculty', experience: 15, shift: '9-5' },
    ];

    onUpdate({ faculty: defaultFaculty });
    
    toast({
      title: "Faculty Loaded",
      description: "Added 22 teachers based on V66 Template.",
    });
  };

  const addFaculty = () => {
    const newFaculty: Faculty = {
      id: crypto.randomUUID(),
      name: '',
      shortCode: '',
      role: 'Faculty',
      experience: 1,
      shift: '9-5',
    };
    onUpdate({ faculty: [...data.faculty, newFaculty] });
  };

  const updateFaculty = (id: string, field: keyof Faculty, value: any) => {
    const updated = data.faculty.map((f) =>
      f.id === id ? { ...f, [field]: value } : f
    );
    onUpdate({ faculty: updated });
  };

  const removeFaculty = (id: string) => {
    onUpdate({ faculty: data.faculty.filter((f) => f.id !== id) });
  };

  return (
    <div className="form-section animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-navy flex items-center justify-center">
            <Users className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h2 className="section-title mb-0">Faculty Directory</h2>
            <p className="text-muted-foreground text-sm">Manage teaching staff and their roles</p>
          </div>
        </div>
        <Button onClick={loadDefaults} variant="outline" className="gap-2 border-purple-200 hover:bg-purple-50 text-purple-700">
          <Wand2 className="w-4 h-4" /> Load V66 Faculty
        </Button>
      </div>

      <div className="grid gap-4">
        {data.faculty.map((f) => (
          <Card key={f.id} className="p-4 border-l-4 border-l-gold shadow-sm hover:shadow-md transition-shadow">
            <div className="grid gap-4 md:grid-cols-12 items-end">
              
              <div className="md:col-span-1 flex justify-center pb-2 md:pb-0">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">
                  {f.shortCode || '??'}
                </div>
              </div>

              <div className="md:col-span-3">
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <Input
                  value={f.name}
                  onChange={(e) => updateFaculty(f.id, 'name', e.target.value)}
                  placeholder="e.g. Dr. John Doe"
                  className="h-9 font-medium"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Short Code</Label>
                <Input
                  value={f.shortCode}
                  onChange={(e) => updateFaculty(f.id, 'shortCode', e.target.value)}
                  placeholder="e.g. JD"
                  className="h-9"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Role</Label>
                <Select
                  value={f.role}
                  onValueChange={(val) => updateFaculty(f.id, 'role', val)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOD">HOD</SelectItem>
                    <SelectItem value="Div Incharge">Div Incharge</SelectItem>
                    <SelectItem value="Faculty">Faculty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Shift</Label>
                <Select
                  value={f.shift}
                  onValueChange={(val) => updateFaculty(f.id, 'shift', val)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9-5">Morning (A)</SelectItem>
                    <SelectItem value="10-6">Afternoon (B)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1">
                <Label className="text-xs text-muted-foreground">Exp(Y)</Label>
                <Input
                  type="number"
                  min={0}
                  value={f.experience}
                  onChange={(e) => updateFaculty(f.id, 'experience', parseInt(e.target.value))}
                  className="h-9"
                />
              </div>

              <div className="md:col-span-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 h-9 w-9"
                  onClick={() => removeFaculty(f.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        <Button onClick={addFaculty} className="w-full gap-2 py-6 border-dashed" variant="outline">
          <UserCog className="w-5 h-5" /> Add Faculty Member
        </Button>
      </div>
    </div>
  );
};