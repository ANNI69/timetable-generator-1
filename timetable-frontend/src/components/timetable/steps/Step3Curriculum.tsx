import { useState } from 'react';
import { CurriculumData, LabSubject, TheorySubject } from '@/types/timetable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, Plus, Trash2, Beaker, Wand2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Step3CurriculumProps {
  data: CurriculumData;
  onUpdate: (data: CurriculumData) => void;
}

export const Step3Curriculum = ({ data, onUpdate }: Step3CurriculumProps) => {
  const [activeTab, setActiveTab] = useState<'theory' | 'labs'>('theory');

  // --- DEFAULT DATA LOADER ---
  const loadDefaults = () => {
    const defaultTheory: TheorySubject[] = [
      // SE Theory
      { id: 'se-math', name: 'Applied Mathematics Thinking-II', code: 'Maths 4', year: 'SE', weeklyLoad: 2, type: 'Theory' },
      { id: 'se-os', name: 'Operating System', code: 'OS', year: 'SE', weeklyLoad: 3, type: 'Theory' },
      { id: 'se-cnnd', name: 'Computer Network & Design', code: 'CNND', year: 'SE', weeklyLoad: 3, type: 'Theory' },
      { id: 'se-mm', name: 'Multidisciplinary Minor', code: 'MM', year: 'SE', weeklyLoad: 3, type: 'Theory' },
      { id: 'se-lm', name: 'Leadership Management', code: 'LM', year: 'SE', weeklyLoad: 2, type: 'Theory' },
      
      // TE Theory (Includes Electives)
      { id: 'te-dmbi', name: 'Data Mining & BI', code: 'DMBI', year: 'TE', weeklyLoad: 3, type: 'Theory' },
      { id: 'te-webx', name: 'Web X.0', code: 'WEBX', year: 'TE', weeklyLoad: 3, type: 'Theory' },
      { id: 'te-wt', name: 'Wireless Technology', code: 'WT', year: 'TE', weeklyLoad: 3, type: 'Theory' },
      { id: 'te-eh', name: 'Ethical Hacking', code: 'EH', year: 'TE', weeklyLoad: 3, type: 'Elective' }, // <--- Elective
      { id: 'te-git', name: 'Green IT', code: 'GIT', year: 'TE', weeklyLoad: 3, type: 'Elective' },       // <--- Elective
      { id: 'te-aids', name: 'Artificial Intelligence & DS', code: 'AIDS1', year: 'TE', weeklyLoad: 3, type: 'Theory' },

      // BE Theory
      { id: 'be-bdlt', name: 'Blockchain and DLT', code: 'BDLT', year: 'BE', weeklyLoad: 3, type: 'Theory' },
      { id: 'be-bda', name: 'Big Data Analysis', code: 'BDA', year: 'BE', weeklyLoad: 3, type: 'Theory' },
      { id: 'be-uid', name: 'User Interface Design', code: 'UID', year: 'BE', weeklyLoad: 3, type: 'Theory' },
      { id: 'be-ccs', name: 'Cyber Security', code: 'CCS', year: 'BE', weeklyLoad: 3, type: 'Theory' },
      { id: 'be-pm', name: 'Project Management', code: 'PM', year: 'BE', weeklyLoad: 3, type: 'Theory' },
    ];

    const defaultLabs: LabSubject[] = [
      // SE Labs
      { id: 'se-math-lab', name: 'Maths Tutorial', code: 'maths tut', year: 'SE', batchCount: 3, labsPerWeek: 1, isSpecial: true, type: 'Lab' },
      { id: 'se-unix', name: 'UNIX Lab', code: 'UNIX', year: 'SE', batchCount: 3, labsPerWeek: 1, isSpecial: false, type: 'Lab' },
      { id: 'se-bmd', name: 'BMD Lab', code: 'BMD', year: 'SE', batchCount: 3, labsPerWeek: 1, isSpecial: false, type: 'Lab' },
      { id: 'se-dt', name: 'DT Lab', code: 'DT', year: 'SE', batchCount: 3, labsPerWeek: 1, isSpecial: false, type: 'Lab' },
      { id: 'se-mm-lab', name: 'MM Lab', code: 'MM', year: 'SE', batchCount: 3, labsPerWeek: 1, isSpecial: false, type: 'Lab' },
      { id: 'se-ndl', name: 'NDL Lab', code: 'NDL', year: 'SE', batchCount: 3, labsPerWeek: 1, isSpecial: false, type: 'Lab' },

      // TE Labs
      { id: 'te-bil', name: 'BI Lab', code: 'BIL', year: 'TE', batchCount: 3, labsPerWeek: 1, isSpecial: false, type: 'Lab' },
      { id: 'te-dspyl', name: 'Data Science Lab', code: 'DSPYL', year: 'TE', batchCount: 3, labsPerWeek: 1, isSpecial: false, type: 'Lab' },
      { id: 'te-sl', name: 'Sensor Lab', code: 'SL', year: 'TE', batchCount: 3, labsPerWeek: 1, isSpecial: false, type: 'Lab' },
      { id: 'te-mad', name: 'Mobile App Dev', code: 'MAD/PWA', year: 'TE', batchCount: 3, labsPerWeek: 1, isSpecial: false, type: 'Lab' },
      { id: 'te-webl', name: 'Web Lab', code: 'WEBL', year: 'TE', batchCount: 3, labsPerWeek: 1, isSpecial: false, type: 'Lab' },

      // BE Labs
      { id: 'be-bl', name: 'Blockchain Lab', code: 'BL', year: 'BE', batchCount: 3, labsPerWeek: 1, isSpecial: false, type: 'Lab' },
      { id: 'be-ccsl', name: 'CCS Lab', code: 'CCSL', year: 'BE', batchCount: 3, labsPerWeek: 1, isSpecial: false, type: 'Lab' },
    ];

    onUpdate({
      theorySubjects: defaultTheory,
      labSubjects: defaultLabs
    });

    toast({
      title: "Defaults Loaded",
      description: "Added standard V66 subjects including Electives.",
    });
  };

  const addTheorySubject = () => {
    const newSubject: TheorySubject = {
      id: crypto.randomUUID(),
      name: '',
      code: '',
      year: 'SE',
      weeklyLoad: 3,
      type: 'Theory',
    };
    onUpdate({
      ...data,
      theorySubjects: [...data.theorySubjects, newSubject],
    });
  };

  const addLabSubject = () => {
    const newSubject: LabSubject = {
      id: crypto.randomUUID(),
      name: '',
      code: '',
      year: 'SE',
      batchCount: 3,
      labsPerWeek: 1,
      isSpecial: false,
      type: 'Lab',
    };
    onUpdate({
      ...data,
      labSubjects: [...data.labSubjects, newSubject],
    });
  };

  const updateTheorySubject = (id: string, field: keyof TheorySubject, value: any) => {
    const updated = data.theorySubjects.map((sub) =>
      sub.id === id ? { ...sub, [field]: value } : sub
    );
    onUpdate({ ...data, theorySubjects: updated });
  };

  const updateLabSubject = (id: string, field: keyof LabSubject, value: any) => {
    const updated = data.labSubjects.map((sub) =>
      sub.id === id ? { ...sub, [field]: value } : sub
    );
    onUpdate({ ...data, labSubjects: updated });
  };

  const removeTheorySubject = (id: string) => {
    onUpdate({
      ...data,
      theorySubjects: data.theorySubjects.filter((s) => s.id !== id),
    });
  };

  const removeLabSubject = (id: string) => {
    onUpdate({
      ...data,
      labSubjects: data.labSubjects.filter((s) => s.id !== id),
    });
  };

  return (
    <div className="form-section animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-navy flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h2 className="section-title mb-0">Curriculum Setup</h2>
            <p className="text-muted-foreground text-sm">Define subjects, electives, and labs</p>
          </div>
        </div>
        <Button onClick={loadDefaults} variant="outline" className="gap-2 border-purple-200 hover:bg-purple-50 text-purple-700">
          <Wand2 className="w-4 h-4" /> Load V66 Defaults
        </Button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab('theory')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'theory'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Theory & Electives
        </button>
        <button
          onClick={() => setActiveTab('labs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'labs'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Labs / Practicals
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === 'theory' ? (
          <>
            <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-xs mb-4 border border-blue-200">
              <strong>Tip:</strong> Mark subjects as "Elective" to have them scheduled simultaneously in different rooms for the same division.
            </div>
            {data.theorySubjects.map((subject) => (
              <Card key={subject.id} className={`p-4 border-l-4 ${subject.type === 'Elective' ? 'border-l-purple-500 bg-purple-50/30' : 'border-l-blue-500'}`}>
                {/* Adjusted Grid for "Type" Column */}
                <div className="grid gap-4 md:grid-cols-12 items-end">
                  {/* Class */}
                  <div className="md:col-span-2">
                    <Label className="text-xs">Class</Label>
                    <Select
                      value={subject.year}
                      onValueChange={(val) => updateTheorySubject(subject.id, 'year', val)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SE">SE (2nd Yr)</SelectItem>
                        <SelectItem value="TE">TE (3rd Yr)</SelectItem>
                        <SelectItem value="BE">BE (4th Yr)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Type Selection (NEW) */}
                  <div className="md:col-span-2">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={subject.type}
                      onValueChange={(val) => updateTheorySubject(subject.id, 'type', val)}
                    >
                      <SelectTrigger className="h-9 border-purple-200 focus:ring-purple-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Theory">Theory</SelectItem>
                        <SelectItem value="Elective">Elective</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Name */}
                  <div className="md:col-span-3">
                    <Label className="text-xs">Subject Name</Label>
                    <Input
                      value={subject.name}
                      onChange={(e) => updateTheorySubject(subject.id, 'name', e.target.value)}
                      placeholder="e.g. Data Structures"
                      className="h-9"
                    />
                  </div>

                  {/* Code */}
                  <div className="md:col-span-2">
                    <Label className="text-xs">Code</Label>
                    <Input
                      value={subject.code}
                      onChange={(e) => updateTheorySubject(subject.id, 'code', e.target.value)}
                      placeholder="e.g. CS301"
                      className="h-9"
                    />
                  </div>

                  {/* Load */}
                  <div className="md:col-span-2">
                    <Label className="text-xs">Load/Week</Label>
                    <Select
                      value={subject.weeklyLoad.toString()}
                      onValueChange={(val) => updateTheorySubject(subject.id, 'weeklyLoad', parseInt(val))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Hour</SelectItem>
                        <SelectItem value="2">2 Hours</SelectItem>
                        <SelectItem value="3">3 Hours</SelectItem>
                        <SelectItem value="4">4 Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Delete */}
                  <div className="md:col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 h-9 w-9"
                      onClick={() => removeTheorySubject(subject.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            <Button onClick={addTheorySubject} className="w-full gap-2 border-dashed" variant="outline">
              <Plus className="w-4 h-4" /> Add Theory / Elective
            </Button>
          </>
        ) : (
          <>
            {data.labSubjects.map((subject) => (
              <Card key={subject.id} className="p-4 border-l-4 border-l-orange-500">
                <div className="grid gap-4 md:grid-cols-12 items-end">
                  <div className="md:col-span-2">
                    <Label className="text-xs">Class</Label>
                    <Select
                      value={subject.year}
                      onValueChange={(val) => updateLabSubject(subject.id, 'year', val)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SE">SE</SelectItem>
                        <SelectItem value="TE">TE</SelectItem>
                        <SelectItem value="BE">BE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-xs">Lab Name</Label>
                    <Input
                      value={subject.name}
                      onChange={(e) => updateLabSubject(subject.id, 'name', e.target.value)}
                      placeholder="e.g. DBMS Lab"
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Code</Label>
                    <Input
                      value={subject.code}
                      onChange={(e) => updateLabSubject(subject.id, 'code', e.target.value)}
                      placeholder="e.g. L-CS301"
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Sessions/Wk</Label>
                    <Select
                      value={subject.labsPerWeek.toString()}
                      onValueChange={(val) => updateLabSubject(subject.id, 'labsPerWeek', parseInt(val))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Session</SelectItem>
                        <SelectItem value="2">2 Sessions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2 h-9">
                    <Checkbox 
                      id={`special-${subject.id}`}
                      checked={subject.isSpecial}
                      onCheckedChange={(c) => updateLabSubject(subject.id, 'isSpecial', c as boolean)}
                    />
                    <Label htmlFor={`special-${subject.id}`} className="text-xs cursor-pointer">
                      Special Room?
                    </Label>
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 h-9 w-9"
                      onClick={() => removeLabSubject(subject.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            <Button onClick={addLabSubject} className="w-full gap-2 border-dashed" variant="outline">
              <Beaker className="w-4 h-4" /> Add Lab Subject
            </Button>
          </>
        )}
      </div>
    </div>
  );
};