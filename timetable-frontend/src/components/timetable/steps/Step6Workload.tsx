import { useState, useMemo, useEffect } from 'react';
import { WorkloadData, Faculty, WelcomeData, CurriculumData } from '@/types/timetable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, CheckCircle2, AlertCircle, Wand2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Step6WorkloadProps {
  data: WorkloadData;
  faculty: Faculty[];
  welcomeData: WelcomeData;
  curriculum: CurriculumData;
  onUpdate: (data: WorkloadData) => void;
}

// Helper Type for Dropdown Options
interface AssignableOption {
  value: string; // "SubjectName::Division::Type"
  label: string;
  subjectName: string;
  division: string;
  type: 'Theory' | 'Lab';
  load: number;
}

export const Step6Workload = ({
  data,
  faculty,
  welcomeData,
  curriculum,
  onUpdate,
}: Step6WorkloadProps) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(faculty[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'theory' | 'lab'>('theory');

  // --- 1. PREPARE OPTIONS ---
  const { theoryOptions, labOptions } = useMemo(() => {
    const tOptions: AssignableOption[] = [];
    const lOptions: AssignableOption[] = [];
    const activeClasses = welcomeData.classes.filter((c) => c.selected);

    activeClasses.forEach((cls) => {
      const divisions = Array.from({ length: cls.divisions }, (_, i) => 
        `${cls.name}-${String.fromCharCode(65 + i)}`
      );

      divisions.forEach((div) => {
        // Theory
        curriculum.theorySubjects
          .filter((sub) => sub.year === cls.name)
          .forEach((sub) => {
            tOptions.push({
              value: `${sub.name}::${div}::THEORY`, // Using Name as ID for simplicity in Python matching
              label: `${sub.name} (${div})`,
              subjectName: sub.name,
              division: div,
              type: 'Theory',
              load: sub.weeklyLoad,
            });
          });

        // Labs
        curriculum.labSubjects
          .filter((sub) => sub.year === cls.name)
          .forEach((sub) => {
            const batchCount = sub.batchCount || 3;
            for (let b = 1; b <= batchCount; b++) {
              const batchDiv = `${div}${b}`;
              lOptions.push({
                value: `${sub.name}::${batchDiv}::LAB`,
                label: `${sub.name} (${batchDiv})`,
                subjectName: sub.name,
                division: batchDiv,
                type: 'Lab',
                load: sub.labsPerWeek * 2,
              });
            }
          });
      });
    });

    return { theoryOptions: tOptions, labOptions: lOptions };
  }, [welcomeData, curriculum]);

  // --- 2. LOCAL STATE ---
  const [structuredPrefs, setStructuredPrefs] = useState<Record<string, { theory: string[], lab: string[] }>>({});

  useEffect(() => {
    // Rehydrate state from global data (if exists)
    if (data.allocations.length > 0 && Object.keys(structuredPrefs).length === 0) {
      const initialMap: Record<string, { theory: string[], lab: string[] }> = {};
      
      data.allocations.forEach(alloc => {
        Object.entries(alloc.divisions).forEach(([div, teacherId]) => {
          if (teacherId) {
            const typeKey = /\d$/.test(div) ? 'lab' : 'theory';
            // Reconstruction of value string must match Option generation exactly
            const val = `${alloc.subjectName}::${div}::${typeKey === 'lab' ? 'LAB' : 'THEORY'}`;
            
            if (!initialMap[teacherId]) initialMap[teacherId] = { theory: [], lab: [] };
            
            const currentList = initialMap[teacherId][typeKey];
            const maxSlots = typeKey === 'theory' ? 5 : 3;
            if (currentList.length < maxSlots) currentList.push(val);
          }
        });
      });
      // Pad
      Object.keys(initialMap).forEach(key => {
         while(initialMap[key].theory.length < 5) initialMap[key].theory.push('');
         while(initialMap[key].lab.length < 3) initialMap[key].lab.push('');
      });
      setStructuredPrefs(initialMap);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 3. AUTO ASSIGN ---
  const handleAutoAssign = () => {
    if (faculty.length === 0) {
      toast({ title: "No Faculty", description: "Add faculty in Step 5 first.", variant: "destructive" });
      return;
    }
    const newPrefs: Record<string, { theory: string[], lab: string[] }> = {};
    faculty.forEach(f => newPrefs[f.id] = { theory: [], lab: [] });

    // Shuffle helper
    const shuffle = (array: any[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    // Assign Theory
    const allTheory = shuffle([...theoryOptions]);
    let tPtr = 0;
    allTheory.forEach(opt => {
      for(let i=0; i<faculty.length; i++) {
        const tIdx = (tPtr + i) % faculty.length;
        const tId = faculty[tIdx].id;
        if(newPrefs[tId].theory.length < 5) {
          newPrefs[tId].theory.push(opt.value);
          tPtr = tIdx + 1;
          break;
        }
      }
    });

    // Assign Labs
    const allLabs = shuffle([...labOptions]);
    let lPtr = 0;
    allLabs.forEach(opt => {
      for(let i=0; i<faculty.length; i++) {
        const tIdx = (lPtr + i) % faculty.length;
        const tId = faculty[tIdx].id;
        if(newPrefs[tId].lab.length < 3) {
          newPrefs[tId].lab.push(opt.value);
          lPtr = tIdx + 1;
          break;
        }
      }
    });

    // Pad
    Object.keys(newPrefs).forEach(key => {
      while(newPrefs[key].theory.length < 5) newPrefs[key].theory.push('');
      while(newPrefs[key].lab.length < 3) newPrefs[key].lab.push('');
    });

    setStructuredPrefs(newPrefs);
    syncToGlobal(newPrefs);
    toast({ title: "Auto-Assignment Complete", description: "All available subjects distributed." });
  };

  const clearAll = () => {
    const cleared: Record<string, { theory: string[], lab: string[] }> = {};
    faculty.forEach(f => cleared[f.id] = { theory: ['', '', '', '', ''], lab: ['', '', ''] });
    setStructuredPrefs(cleared);
    syncToGlobal(cleared); // Wipes global state clean
    toast({ title: "Allocations Cleared", description: "All assignments have been reset." });
  };

  // --- 4. VALIDATION ---
  const missingSubjects = useMemo(() => {
    const assigned = new Set<string>();
    Object.values(structuredPrefs).forEach(p => {
      p.theory.forEach(v => v && assigned.add(v));
      p.lab.forEach(v => v && assigned.add(v));
    });
    
    const missing: string[] = [];
    theoryOptions.forEach(o => !assigned.has(o.value) && missing.push(o.label));
    // Lab missing check optional, usually theory is critical
    return missing;
  }, [structuredPrefs, theoryOptions]);

  // --- 5. UPDATERS ---
  const updatePreference = (tId: string, type: 'theory' | 'lab', index: number, value: string) => {
    const prev = structuredPrefs[tId] || { theory: ['', '', '', '', ''], lab: ['', '', ''] };
    const newList = [...prev[type]];
    while(newList.length <= index) newList.push('');
    newList[index] = value;
    const newState = { ...structuredPrefs, [tId]: { ...prev, [type]: newList } };
    setStructuredPrefs(newState);
    syncToGlobal(newState);
  };

  const syncToGlobal = (state: Record<string, { theory: string[], lab: string[] }>) => {
    const newAllocations: any[] = [];
    
    Object.entries(state).forEach(([tId, prefs]) => {
      [...prefs.theory, ...prefs.lab].forEach(val => {
        if (!val) return;
        const parts = val.split('::');
        if (parts.length < 3) return;

        // Robust parsing: join all parts except last 2 as name (handles names with :: if any)
        const div = parts[parts.length - 2];
        const subName = parts.slice(0, parts.length - 2).join('::');

        let alloc = newAllocations.find(a => a.subjectName === subName);
        if (!alloc) {
          alloc = { subjectName: subName, subjectId: subName, divisions: {} };
          newAllocations.push(alloc);
        }
        alloc.divisions[div] = tId;
      });
    });
    onUpdate({ ...data, allocations: newAllocations });
  };

  // --- RENDER ---
  const renderDropdowns = (type: 'theory' | 'lab') => {
    const slotCount = type === 'theory' ? 5 : 3;
    const slots = Array.from({ length: slotCount }, (_, i) => i);
    const currentPrefs = structuredPrefs[selectedTeacherId]?.[type] || Array(slotCount).fill('');

    return slots.map((index) => {
      const selectedInOtherSlots = currentPrefs.filter((_, i) => i !== index);
      const options = (type === 'theory' ? theoryOptions : labOptions).filter(
        opt => !selectedInOtherSlots.includes(opt.value)
      );

      return (
        <div key={index} className="mb-4">
          <label className="text-sm font-medium text-muted-foreground mb-1 block">Priority {index + 1}</label>
          <Select
            value={currentPrefs[index] || ''}
            onValueChange={(val) => updatePreference(selectedTeacherId, type, index, val)}
          >
            <SelectTrigger className="bg-white"><SelectValue placeholder="-- Select Subject --" /></SelectTrigger>
            <SelectContent className="max-h-[200px]">
              <SelectItem value="unassigned_placeholder">None</SelectItem>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label} <span className="ml-2 text-xs text-muted-foreground">({opt.load} hrs)</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    });
  };

  const selectedTeacher = faculty.find(f => f.id === selectedTeacherId);

  return (
    <div className="form-section animate-slide-up h-[75vh] flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-navy flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h2 className="section-title mb-0">Workload Allocation</h2>
            <p className="text-muted-foreground text-sm">Assign subjects to faculty</p>
          </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearAll} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Clear All
            </Button>
            <Button onClick={handleAutoAssign} size="sm" className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                <Wand2 className="w-4 h-4" /> Auto Assign
            </Button>
        </div>
      </div>

      {missingSubjects.length > 0 && (
         <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-3 flex-shrink-0 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
                <h4 className="text-sm font-bold text-red-800">Unassigned Subjects ({missingSubjects.length})</h4>
                <p className="text-xs text-red-600 mt-1">
                  Theory subjects missing teachers will appear as 'TBA' in the timetable.
                </p>
                <div className="mt-2 flex flex-wrap gap-1 max-h-[60px] overflow-y-auto">
                    {missingSubjects.map((sub, i) => <Badge key={i} variant="destructive" className="text-[10px] h-5 px-1">{sub}</Badge>)}
                </div>
            </div>
         </div>
      )}

      <div className="flex flex-1 gap-6 min-h-0">
        <div className="w-1/3 border rounded-lg bg-card overflow-hidden flex flex-col">
          <div className="p-3 border-b bg-muted/30 font-semibold text-sm flex-shrink-0">Faculty List ({faculty.length})</div>
          <div className="flex-1 overflow-y-auto">
            {faculty.map((f) => {
              const prefs = structuredPrefs[f.id] || { theory: [], lab: [] };
              const loadCount = prefs.theory.filter(Boolean).length + prefs.lab.filter(Boolean).length;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedTeacherId(f.id)}
                  className={`w-full text-left p-3 border-b transition-colors hover:bg-muted/50 flex items-center justify-between
                    ${selectedTeacherId === f.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}
                  `}
                >
                  <div>
                    <div className="font-medium text-sm">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.shortCode} • {f.shift === '9-5' ? 'A' : 'B'}</div>
                  </div>
                  {loadCount > 0 && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{loadCount}</Badge>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col border rounded-lg bg-card p-6 overflow-hidden">
          {selectedTeacher ? (
            <>
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold font-display text-primary">{selectedTeacher.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedTeacher.role} • {selectedTeacher.experience} Yrs Exp</p>
                </div>
                <div className="text-right"><div className="text-xs font-mono text-muted-foreground">ID: {selectedTeacher.shortCode}</div></div>
              </div>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-2 mb-6 flex-shrink-0">
                  <TabsTrigger value="theory">Theory Lectures</TabsTrigger>
                  <TabsTrigger value="lab">Lab / Practicals</TabsTrigger>
                </TabsList>
                <TabsContent value="theory" className="flex-1 overflow-y-auto pr-4 animate-fade-in">
                  <div className="bg-blue-50/50 p-4 rounded-md border border-blue-100 mb-4">
                     <p className="text-sm text-blue-800 flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4" /> Select subjects (Max 5).
                     </p>
                  </div>
                  {renderDropdowns('theory')}
                </TabsContent>
                <TabsContent value="lab" className="flex-1 overflow-y-auto pr-4 animate-fade-in">
                  <div className="bg-orange-50/50 p-4 rounded-md border border-orange-100 mb-4">
                     <p className="text-sm text-orange-800 flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4" /> Assign Lab Batches (Max 3).
                     </p>
                  </div>
                  {renderDropdowns('lab')}
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
              <p>Select a faculty member from the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};