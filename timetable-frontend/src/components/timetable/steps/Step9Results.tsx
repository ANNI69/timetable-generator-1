import { useState, useEffect, useMemo, Fragment } from 'react';
import { ResultsData, TimingData, WelcomeData, Faculty, InfrastructureData } from '@/types/timetable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, User, MapPin, Plus, Monitor, FlaskConical, Users, BookOpen, Layers } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Step9ResultsProps {
  data: ResultsData;
  timingData: TimingData;
  welcomeData: WelcomeData;
  faculty?: Faculty[]; 
  infrastructure?: InfrastructureData; 
}

interface BackendBatch {
  batch?: string; 
  subject: string;
  teacher: string;
  room: string;
}

interface BackendEntry {
  slot: number;
  duration: number;
  type: "THEORY" | "LAB" | "PROJECT" | "REMEDIAL" | "ELECTIVE";
  subject: string;
  teacher: string;
  room: string;
  batches?: BackendBatch[];
}

type ViewMode = 'MASTER' | 'TEACHER' | 'CLASSROOM' | 'LAB';

export const Step9Results = ({ 
  data, 
  timingData, 
  welcomeData,
  faculty = [], 
  infrastructure = { theoryRooms: [], labRooms: [], specialAssignments: {} } 
}: Step9ResultsProps) => {
  const [timetable, setTimetable] = useState<any>(data.timetable || {});
  const [viewMode, setViewMode] = useState<ViewMode>('MASTER');
  const [selectedEntity, setSelectedEntity] = useState<string>(''); 

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<{ div: string, day: string, slotIndex: number, timeLabel: string } | null>(null);
  
  const [manualEntry, setManualEntry] = useState({
    type: 'THEORY', subject: '', teacher: '', room: '', duration: 1
  });

  const divisions = useMemo(() => {
    return welcomeData.classes
      .filter(c => c.selected)
      .flatMap(c => Array.from({ length: c.divisions }, (_, i) => `${c.name}-${String.fromCharCode(65 + i)}`));
  }, [welcomeData]);

  useEffect(() => {
    setTimetable(data.timetable || {});
    if (viewMode === 'MASTER' && divisions.length > 0) setSelectedEntity(divisions[0]);
    else if (viewMode === 'TEACHER' && faculty.length > 0) setSelectedEntity(faculty[0].name);
    else if (viewMode === 'CLASSROOM' && infrastructure.theoryRooms.length > 0) setSelectedEntity(infrastructure.theoryRooms[0]);
    else if (viewMode === 'LAB' && infrastructure.labRooms.length > 0) setSelectedEntity(infrastructure.labRooms[0]);
    else setSelectedEntity('');
  }, [data.timetable, viewMode, faculty, infrastructure, divisions]);

  const timeSlots = useMemo(() => {
    const slots = [];
    if (!timingData?.startTime) return [];
    const [hours, minutes] = timingData.startTime.split(':').map(Number);
    let currentMinutes = hours * 60 + minutes;

    for (let i = 0; i < timingData.totalSlots; i++) {
      const startH = Math.floor(currentMinutes / 60);
      const startM = currentMinutes % 60;
      const endMinutes = currentMinutes + timingData.slotDuration;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      slots.push(`${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')} - ${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);
      
      currentMinutes = endMinutes;
      if (i + 1 === timingData.recessAfterSlot) currentMinutes += (timingData.recessDuration || 45);
    }
    return slots;
  }, [timingData]);

  const getBackendSlotIndex = (visualIndex: number) => {
    if (visualIndex >= timingData.recessAfterSlot) {
        return visualIndex + 1;
    }
    return visualIndex;
  };

  const getTeacherData = (teacherName: string, day: string, slotIndex: number) => {
    if (!timetable) return null;
    for (const div of Object.keys(timetable)) {
      const entries = timetable[div]?.[day] as BackendEntry[] || [];
      const entry = entries.find(e => e.slot === slotIndex || (e.slot < slotIndex && e.slot + e.duration > slotIndex));
      if (entry) {
        // Handle normal entry
        if (entry.teacher === teacherName) return { ...entry, displayDiv: div };
        // Handle split/elective entry strings (e.g. "T1 / T2")
        if (entry.type === 'ELECTIVE' && entry.teacher.includes(teacherName)) {
             return { ...entry, displayDiv: div };
        }
        // Handle labs
        if (entry.type === 'LAB' && entry.batches) {
           const batchIndex = entry.batches.findIndex(b => b.teacher === teacherName);
           if (batchIndex !== -1) {
             const b = entry.batches[batchIndex];
             const batchLabel = b.batch ? b.batch.replace(div, '') : `B${batchIndex + 1}`;
             return { ...entry, subject: b.subject, room: b.room, displayDiv: `${div} (${batchLabel})` };
           }
        }
      }
    }
    return null;
  };

  const getRoomData = (roomName: string, day: string, slotIndex: number) => {
    if (!timetable) return null;
    for (const div of Object.keys(timetable)) {
      const entries = timetable[div]?.[day] as BackendEntry[] || [];
      const entry = entries.find(e => e.slot === slotIndex || (e.slot < slotIndex && e.slot + e.duration > slotIndex));
      if (entry) {
        if (entry.room === roomName) return { ...entry, displayDiv: div };
        if (entry.type === 'ELECTIVE' && entry.room.includes(roomName)) return { ...entry, displayDiv: div };
        if (entry.type === 'LAB' && entry.batches) {
           const batchIndex = entry.batches.findIndex(b => b.room === roomName);
           if (batchIndex !== -1) {
             const b = entry.batches[batchIndex];
             const batchLabel = b.batch ? b.batch.replace(div, '') : `B${batchIndex + 1}`;
             return { ...entry, subject: b.subject, teacher: b.teacher, room: b.room, displayDiv: `${div}-${batchLabel}` };
           }
        }
      }
    }
    return null;
  };

  const renderCell = (day: string, visualRowIndex: number, timeLabel: string) => {
    const slotIndex = getBackendSlotIndex(visualRowIndex);
    
    let entry: any = null;
    let isMaster = viewMode === 'MASTER';

    if (isMaster) {
       const dayData = timetable[selectedEntity]?.[day] as BackendEntry[];
       const covered = dayData?.find(e => e.slot < slotIndex && (e.slot + e.duration) > slotIndex);
       if (covered) return null; 
       entry = dayData?.find(e => e.slot === slotIndex);
    } else if (viewMode === 'TEACHER') {
       entry = getTeacherData(selectedEntity, day, slotIndex);
    } else {
       entry = getRoomData(selectedEntity, day, slotIndex);
    }

    if (!entry) {
        return (
            <td 
                key={day} 
                className={`p-1 border border-border h-24 align-top ${isMaster ? 'hover:bg-accent/5 cursor-pointer' : ''}`}
                onClick={isMaster ? () => handleCellClick(selectedEntity, day, slotIndex, timeLabel, undefined) : undefined}
            >
                {isMaster && (
                    <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100">
                        <Plus className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                )}
            </td>
        );
    }

    const rowSpan = isMaster ? (entry.duration || 1) : 1;
    const styles = {
        THEORY: "bg-blue-50 border-blue-100 text-blue-900",
        LAB: "bg-orange-50 border-orange-100 text-orange-900",
        PROJECT: "bg-purple-50 border-purple-100 text-purple-900",
        REMEDIAL: "bg-green-50 border-green-100 text-green-900",
        ELECTIVE: "bg-pink-50 border-pink-100 text-pink-900", // New Style
    };
    const style = styles[entry.type as keyof typeof styles] || styles.THEORY;

    // --- RENDER ELECTIVE (SPLIT VIEW) ---
    if (entry.type === 'ELECTIVE') {
        const subjects = entry.subject.split(' / ');
        const teachers = entry.teacher.split(' / ');
        const rooms = entry.room.split(' / ');

        return (
            <td key={day} className="p-1 border border-border h-24 align-top" rowSpan={rowSpan}>
                <div className={`flex flex-col h-full rounded border shadow-sm ${style} text-xs overflow-hidden`}>
                    <div className="bg-pink-100/50 px-1 py-0.5 text-[8px] font-bold text-center uppercase border-b border-pink-200 text-pink-700 flex items-center justify-center gap-1">
                        <Layers className="w-3 h-3" /> Electives
                    </div>
                    <div className="flex flex-1 divide-x divide-pink-200">
                        {subjects.map((sub: string, idx: number) => (
                            <div key={idx} className="flex-1 flex flex-col justify-center p-1 text-center min-w-0">
                                <div className="font-bold leading-tight truncate text-[10px]" title={sub}>{sub}</div>
                                <div className="text-[9px] opacity-80 truncate">{teachers[idx]}</div>
                                <div className="mt-auto pt-1">
                                    <span className="bg-white/60 px-1 rounded font-mono text-[9px] border border-pink-200 shadow-sm text-pink-800">
                                        {rooms[idx]}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </td>
        );
    }

    // --- RENDER STANDARD CELL ---
    return (
        <td key={day} className="p-1 border border-border h-24 align-top" rowSpan={rowSpan}>
            <div className={`flex flex-col h-full justify-center p-2 rounded border shadow-sm ${style} text-xs relative group`}>
                {(entry.type === 'PROJECT' || entry.type === 'REMEDIAL') && (
                    <span className="absolute top-1 right-1 text-[8px] font-bold uppercase opacity-60 border px-1 rounded bg-white/50">
                        {entry.type === 'PROJECT' ? 'PROJ' : 'REM'}
                    </span>
                )}
                
                <div className="font-bold truncate" title={entry.subject}>{entry.subject}</div>
                
                {viewMode === 'MASTER' && entry.type === 'LAB' ? (
                    <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[60px] custom-scrollbar">
                        {entry.batches?.map((b: any, i: number) => (
                            <div key={i} className="bg-white/60 p-1 rounded text-[9px] border border-orange-200/50 flex flex-col gap-0.5">
                                <div className="flex justify-between items-center font-semibold text-orange-900">
                                    <span>B{i+1}</span>
                                    <span>{b.room}</span>
                                </div>
                                <div className="truncate opacity-90">{b.subject}</div>
                                <div className="opacity-75 italic">{b.teacher}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="mt-1 flex items-center gap-1 opacity-90">
                            {viewMode === 'TEACHER' ? <Users className="w-3 h-3"/> : <User className="w-3 h-3"/>}
                            <span className="truncate">
                                {viewMode === 'TEACHER' ? entry.displayDiv : entry.teacher}
                            </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 opacity-75 font-mono text-[10px]">
                            <MapPin className="w-3 h-3"/> {entry.room}
                        </div>
                    </>
                )}
            </div>
        </td>
    );
  };

  const handleCellClick = (div: string, day: string, slotIndex: number, timeLabel: string, existingEntry: any) => {
    if (existingEntry) {
        toast({ description: "Slot occupied." });
        return;
    }
    setEditSlot({ div, day, slotIndex, timeLabel });
    setManualEntry({ type: 'THEORY', subject: '', teacher: '', room: '', duration: 1 });
    setIsDialogOpen(true);
  };

  const saveManualEntry = () => {
    if (!editSlot || !manualEntry.subject) return;
    const { div, day, slotIndex } = editSlot;
    const newTimetable = JSON.parse(JSON.stringify(timetable));
    if (!newTimetable[div]) newTimetable[div] = {};
    if (!newTimetable[div][day]) newTimetable[div][day] = [];

    const newRecord: BackendEntry = {
      slot: slotIndex,
      duration: manualEntry.duration,
      type: manualEntry.type as any,
      subject: manualEntry.subject,
      teacher: manualEntry.teacher || (['PROJECT','REMEDIAL'].includes(manualEntry.type) ? 'Assigned' : 'TBA'),
      room: manualEntry.room || (['PROJECT','REMEDIAL'].includes(manualEntry.type) ? 'Dept' : 'TBA')
    };

    newTimetable[div][day].push(newRecord);
    setTimetable(newTimetable);
    setIsDialogOpen(false);
    toast({ title: "Entry Added" });
  };

  return (
    <div className="form-section animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-navy flex items-center justify-center">
            {viewMode === 'TEACHER' ? <User className="w-6 h-6 text-gold" /> : 
             viewMode === 'LAB' ? <FlaskConical className="w-6 h-6 text-gold" /> :
             viewMode === 'CLASSROOM' ? <Monitor className="w-6 h-6 text-gold" /> :
             <BookOpen className="w-6 h-6 text-gold" />}
          </div>
          <div>
            <h2 className="section-title mb-0">Timetable Views</h2>
            <p className="text-muted-foreground text-sm">Switch views or add manual entries</p>
          </div>
        </div>
        
        <div className="flex bg-muted p-1 rounded-lg">
            {(['MASTER', 'TEACHER', 'CLASSROOM', 'LAB'] as const).map(m => (
                <button 
                    key={m}
                    onClick={() => setViewMode(m)} 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === m ? 'bg-white shadow text-primary' : 'text-muted-foreground'}`}
                >
                    {m.charAt(0) + m.slice(1).toLowerCase()}
                </button>
            ))}
        </div>
      </div>

      <Card className="mb-8 border-t-4 border-t-primary">
        <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                        <SelectTrigger className="w-[280px] h-10 bg-muted/50 border-primary/20">
                            <SelectValue placeholder="Select Entity" />
                        </SelectTrigger>
                        <SelectContent>
                            {viewMode === 'MASTER' && divisions.map(d => <SelectItem key={d} value={d}>{d} Division</SelectItem>)}
                            {viewMode === 'TEACHER' && faculty.map((f, i) => <SelectItem key={f.id || i} value={f.name}>{f.name}</SelectItem>)}
                            {viewMode === 'CLASSROOM' && infrastructure.theoryRooms.map((r, i) => <SelectItem key={r || i} value={r}>Room {r}</SelectItem>)}
                            {viewMode === 'LAB' && infrastructure.labRooms.map((r, i) => <SelectItem key={r || i} value={r}>Lab {r}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardTitle>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast({title: "Downloading..."})}>
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                </div>
            </div>
        </CardHeader>

        <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border mt-2">
                <table className="w-full border-collapse text-sm table-fixed min-w-[800px]">
                    <thead>
                        <tr>
                            <th className="w-24 p-3 bg-primary/5 text-primary font-bold text-left border-b border-border">Time</th>
                            {timingData.workingDays.map(day => (
                                <th key={day} className="p-3 bg-primary/5 text-primary font-bold text-center border-l border-b border-border">{day}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map((time, idx) => {
                            const showRecess = (idx + 1) === timingData.recessAfterSlot;
                            return (
                                <Fragment key={idx}>
                                    <tr className="group hover:bg-muted/10">
                                        <td className="p-2 border border-border bg-muted/20 font-medium text-xs whitespace-nowrap align-middle">
                                            {time}
                                        </td>
                                        {timingData.workingDays.map(day => renderCell(day, idx, time))}
                                    </tr>
                                    {showRecess && (
                                        <tr>
                                            <td className="p-2 border border-border bg-yellow-50/50 font-medium text-xs text-center">Break</td>
                                            <td colSpan={timingData.workingDays.length} className="p-1 bg-yellow-50/50 text-center text-xs font-bold text-yellow-600 border border-border tracking-widest uppercase">
                                                Recess
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add Manual Entry</DialogTitle>
                <p className="text-sm text-muted-foreground">Adding to <strong>{editSlot?.div}</strong> on {editSlot?.day} at {editSlot?.timeLabel}</p>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-semibold">Type</Label>
                    <Select value={manualEntry.type} onValueChange={(val) => setManualEntry({...manualEntry, type: val})}>
                        <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="THEORY">Lecture (Theory)</SelectItem>
                            <SelectItem value="LAB">Lab / Practical</SelectItem>
                            <SelectItem value="PROJECT">Major Project</SelectItem>
                            <SelectItem value="ELECTIVE">Elective</SelectItem>
                            <SelectItem value="REMEDIAL">Remedial Lecture</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Subject</Label>
                    <Input placeholder="Subject Name" className="col-span-3" value={manualEntry.subject} onChange={(e) => setManualEntry({...manualEntry, subject: e.target.value})} />
                </div>
                {(manualEntry.type === 'THEORY' || manualEntry.type === 'LAB' || manualEntry.type === 'ELECTIVE') && (
                    <>
                        <div className="grid grid-cols-4 items-center gap-4 animate-fade-in">
                            <Label className="text-right">Faculty</Label>
                            <Input placeholder="Faculty Name" className="col-span-3" value={manualEntry.teacher} onChange={(e) => setManualEntry({...manualEntry, teacher: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4 animate-fade-in">
                            <Label className="text-right">Room</Label>
                            <Input placeholder="Room Number" className="col-span-3" value={manualEntry.room} onChange={(e) => setManualEntry({...manualEntry, room: e.target.value})} />
                        </div>
                    </>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Slots</Label>
                    <Select value={manualEntry.duration.toString()} onValueChange={(val) => setManualEntry({...manualEntry, duration: parseInt(val)})}>
                        <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1 Slot</SelectItem>
                            <SelectItem value="2">2 Slots</SelectItem>
                            <SelectItem value="3">3 Slots</SelectItem>
                            <SelectItem value="4">4 Slots</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveManualEntry}>Save Entry</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};