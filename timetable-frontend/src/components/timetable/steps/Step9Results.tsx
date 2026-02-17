import { useState, useEffect, useMemo, Fragment } from 'react';
import { ResultsData, TimingData, WelcomeData, Faculty, InfrastructureData, BackendEntry } from '@/types/timetable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, User, MapPin, Plus, Monitor, FlaskConical, BookOpen, Layers, Briefcase, AlertCircle, Trash2, RotateCcw, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Step9ResultsProps {
  data: ResultsData;
  timingData: TimingData;
  welcomeData: WelcomeData;
  faculty?: Faculty[]; 
  infrastructure?: InfrastructureData; 
}

type ViewMode = 'MASTER' | 'TEACHER' | 'CLASSROOM' | 'LAB';

interface LogEntry {
    id: string;
    timestamp: Date;
    action: 'DELETE' | 'ADD';
    details: string;
    originalEntry?: any; // To support revert
    slotInfo: { div: string, day: string, slotIdx: number };
}

// --- HELPER: Available Rooms ---
const getAvailableRooms = (
  timetable: Record<string, Record<string, BackendEntry[]>>,
  allTheoryRooms: string[],
  allLabRooms: string[],
  day: string,
  slotIndex: number
) => {
  const occupied = new Set<string>();
  
  Object.values(timetable).forEach(days => {
    const entries = days[day] || [];
    entries.forEach(e => {
        if (e.slot <= slotIndex && (e.slot + e.duration) > slotIndex) {
            if (e.room && e.room !== 'TBA') occupied.add(e.room);
            if (e.batches) e.batches.forEach((b: any) => occupied.add(b.room));
        }
    });
  });

  const freeTheory = allTheoryRooms.filter(r => !occupied.has(r));
  const freeLabs = allLabRooms.filter(r => !occupied.has(r));
  return { freeTheory, freeLabs };
};

export const Step9Results = ({ 
  data, 
  timingData, 
  welcomeData,
  faculty = [], 
  infrastructure = { theoryRooms: [], labRooms: [], specialAssignments: {} } 
}: Step9ResultsProps) => {
  const [timetable, setTimetable] = useState<Record<string, Record<string, BackendEntry[]>>>(data.timetable || {});
  const [viewMode, setViewMode] = useState<ViewMode>('MASTER');
  const [selectedEntity, setSelectedEntity] = useState<string>(''); 
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<{ div: string, day: string, slotIndex: number, timeLabel: string } | null>(null);

  // Manual Entry State
  const [manualEntry, setManualEntry] = useState({
    type: 'THEORY', duration: 1,
    // Standard Fields
    subject: '', teacher: '', room: '',
    // Elective Fields (Array)
    electiveGroups: [{ subject: '', teacher: '', room: '' }]
  });

  const divisions = useMemo(() => {
    return welcomeData.classes
      .filter(c => c.selected)
      .flatMap(c => Array.from({ length: c.divisions }, (_, i) => `${c.name}-${String.fromCharCode(65 + i)}`));
  }, [welcomeData]);

  useEffect(() => {
    setTimetable(data.timetable || {});
    if (!selectedEntity) {
        if (viewMode === 'MASTER' && divisions.length > 0) setSelectedEntity(divisions[0]);
        else if (viewMode === 'TEACHER' && faculty.length > 0) setSelectedEntity(faculty[0].name);
        else if (viewMode === 'CLASSROOM' && infrastructure.theoryRooms.length > 0) setSelectedEntity(infrastructure.theoryRooms[0]);
        else if (viewMode === 'LAB' && infrastructure.labRooms.length > 0) setSelectedEntity(infrastructure.labRooms[0]);
    }
  }, [data.timetable, viewMode, faculty, infrastructure, divisions]);

  useEffect(() => {
    if (viewMode === 'MASTER' && divisions.length > 0) setSelectedEntity(divisions[0]);
    else if (viewMode === 'TEACHER' && faculty.length > 0) setSelectedEntity(faculty[0].name);
    else if (viewMode === 'CLASSROOM' && infrastructure.theoryRooms.length > 0) setSelectedEntity(infrastructure.theoryRooms[0]);
    else if (viewMode === 'LAB' && infrastructure.labRooms.length > 0) setSelectedEntity(infrastructure.labRooms[0]);
  }, [viewMode]);

  // --- UNPLACED SUBJECTS CALCULATION (Dynamic based on Deletions) ---
  const unplacedSubjects = useMemo(() => {
    const missing: { div: string, subjects: any[] }[] = [];
    divisions.forEach(div => {
        const divSchedule = timetable[div] || {};
        let placedCount = 0;
        Object.values(divSchedule).forEach(day => placedCount += day.length);
        
        if (placedCount < 15) {
            missing.push({
                div,
                subjects: [
                    { name: 'Pending Allocation', type: 'ANY', load: 15 - placedCount },
                ]
            });
        }
    });
    return missing;
  }, [timetable, divisions]);

  const getTeacherShortCode = (teacherName: string | undefined | null) => {
    if (!teacherName) return '';
    const trimmed = teacherName.trim();
    if (!trimmed || trimmed === 'TBA') return trimmed;
    const match = faculty.find(f => f.name === trimmed);
    return match?.shortCode?.trim() || trimmed;
  };

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
      
      const formatTime = (h: number, m: number) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h > 12 ? h - 12 : h;
        return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
      };

      slots.push({
        label: `${formatTime(startH, startM)} - ${formatTime(endH, endM)}`,
        index: i
      });
      
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

  const getDataForCell = (day: string, slotIndex: number) => {
    if (!timetable) return null;
    
    if (viewMode === 'MASTER') {
       const dayData = timetable[selectedEntity]?.[day] || [];
       return dayData.find(e => e.slot <= slotIndex && (e.slot + e.duration) > slotIndex);
    } 
    
    const searchGlobal = (predicate: (e: BackendEntry) => boolean) => {
      for (const div of Object.keys(timetable)) {
        const entries = timetable[div]?.[day] || [];
        const found = entries.find(e => 
          (e.slot <= slotIndex && (e.slot + e.duration) > slotIndex) && predicate(e)
        );
        if (found) return { ...found, displayDiv: div };
      }
      return null;
    };

    if (viewMode === 'TEACHER') {
       return searchGlobal(e => {
         if (e.teacher === selectedEntity) return true;
         if (e.type === 'ELECTIVE' && e.teacher && e.teacher.includes(selectedEntity)) return true;
         if ((e.type === 'LAB' || e.type === 'TUTORIAL' || e.type === 'MATHS_TUT') && e.batches?.some(b => b.teacher === selectedEntity)) return true;
         return false;
       });
    }

    return searchGlobal(e => {
       if (e.room === selectedEntity) return true;
       if (e.type === 'ELECTIVE' && e.room && e.room.includes(selectedEntity)) return true;
       if ((e.type === 'LAB' || e.type === 'TUTORIAL' || e.type === 'MATHS_TUT') && e.batches?.some(b => b.room === selectedEntity)) return true;
       return false;
    });
  };

  const confirmDelete = (div: string, day: string, slotIdx: number, entry: any) => {
      const newTimetable = JSON.parse(JSON.stringify(timetable));
      if (newTimetable[div] && newTimetable[div][day]) {
          newTimetable[div][day] = newTimetable[div][day].filter((e: any) => e.slot !== slotIdx);
          setTimetable(newTimetable);
          
          // Add Log
          const log: LogEntry = {
              id: Date.now().toString(),
              timestamp: new Date(),
              action: 'DELETE',
              details: `${entry.subject} (${entry.type}) removed from ${day} Slot ${slotIdx + 1}`,
              originalEntry: entry,
              slotInfo: { div, day, slotIdx }
          };
          setLogs(prev => [log, ...prev]);
          toast({ title: "Lecture Removed", description: "The slot is now empty." });
      }
  };

  const renderCellContent = (entry: any, day: string, slotIdx: number) => {
    if (!entry) {
        // EMPTY CELL: Click to Add
        const { freeTheory, freeLabs } = getAvailableRooms(
          timetable,
          infrastructure.theoryRooms || [],
          infrastructure.labRooms || [],
          day,
          slotIdx
        );

        return (
            <div className="h-full w-full min-h-[100px] flex flex-col items-center justify-center relative group p-1 transition-colors hover:bg-muted/10">
               {viewMode === 'MASTER' && (
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center cursor-pointer rounded">
                       <Plus className="w-6 h-6 text-primary opacity-60 hover:scale-110 transition-transform" />
                   </div>
               )}
               <div className="flex flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground text-center px-1">
                 {(freeTheory.length > 0 || freeLabs.length > 0) ? (
                   <>
                     <span className="uppercase tracking-wide text-[9px] font-semibold text-muted-foreground/80">
                       Available Rooms
                     </span>
                     <div className="flex flex-col gap-0.5">
                       {freeTheory.length > 0 && (
                         <div>
                           <span className="font-semibold mr-1">Class:</span>
                           <span>
                             {freeTheory.slice(0, 3).join(', ')}
                             {freeTheory.length > 3 && ' +'}
                           </span>
                         </div>
                       )}
                       {freeLabs.length > 0 && (
                         <div>
                           <span className="font-semibold mr-1">Lab:</span>
                           <span>
                             {freeLabs.slice(0, 3).join(', ')}
                             {freeLabs.length > 3 && ' +'}
                           </span>
                         </div>
                       )}
                     </div>
                   </>
                 ) : (
                   <span className="italic text-[10px] text-muted-foreground/70">
                     No rooms free
                   </span>
                 )}
               </div>
            </div>
        );
    }

    // OCCUPIED CELL
    const colors: Record<string, string> = {
      THEORY: "bg-blue-50/80 border-l-4 border-blue-500 text-blue-900 hover:bg-blue-100",
      LAB: "bg-orange-50/80 border-l-4 border-orange-500 text-orange-900 hover:bg-orange-100",
      MATHS_TUT: "bg-emerald-50/80 border-l-4 border-emerald-500 text-emerald-900 hover:bg-emerald-100", 
      TUTORIAL: "bg-emerald-50/80 border-l-4 border-emerald-500 text-emerald-900 hover:bg-emerald-100",
      ELECTIVE: "bg-pink-50/80 border-l-4 border-pink-500 text-pink-900 hover:bg-pink-100",
      PROJECT: "bg-purple-50/80 border-l-4 border-purple-500 text-purple-900 hover:bg-purple-100", 
    };
    
    const typeKey = (entry.type === 'MATHS_TUT' || entry.type === 'TUTORIAL') ? 'MATHS_TUT' : entry.type;
    const baseClass = `w-full h-full p-2 text-xs rounded-r-md shadow-sm transition-all flex flex-col gap-1 cursor-pointer group relative ${colors[typeKey] || colors.THEORY}`;

    // DELETE BUTTON OVERLAY (Visible on Hover in Master View)
    const deleteOverlay = viewMode === 'MASTER' ? (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button variant="ghost" size="icon" className="h-5 w-5 bg-white/80 hover:bg-red-100 hover:text-red-600 rounded-full shadow-sm"
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if(confirm("Are you sure you want to delete this lecture?")) {
                        confirmDelete(selectedEntity, day, slotIdx, entry);
                    }
                }}>
                <Trash2 className="w-3 h-3" />
            </Button>
        </div>
    ) : null;

    if (entry.type === 'ELECTIVE') {
        const subjects = entry.subject ? entry.subject.split(' / ') : ['Elective'];
        const teachers = entry.teacher ? entry.teacher.split(' / ') : ['TBA'];
        const rooms = entry.room ? entry.room.split(' / ') : ['TBA'];

        return (
            <div className={baseClass}>
                {deleteOverlay}
                <div className="flex items-center justify-between pb-1 border-b border-pink-200/50 mb-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-70">
                        <Layers className="w-3 h-3" /> Elective
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    {subjects.map((sub: string, i: number) => {
                        if ((viewMode === 'CLASSROOM' || viewMode === 'LAB') && rooms[i] !== selectedEntity) return null;
                        return (
                            <div key={i} className="flex flex-col bg-white/60 p-1.5 rounded-sm border border-pink-100">
                                <span className="font-bold text-xs text-pink-950 truncate">{sub}</span>
                                <div className="flex justify-between items-center mt-0.5">
                                    <span className="text-[10px] text-pink-800">
                                      {(() => {
                                        const name = teachers[i] || 'TBA';
                                        return name === 'TBA' ? 'TBA' : getTeacherShortCode(name);
                                      })()}
                                    </span>
                                    <span className="text-[10px] font-mono text-pink-700 bg-pink-100/50 px-1 rounded">{rooms[i] || 'TBA'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if ((entry.type === 'LAB' || entry.type === 'TUTORIAL' || entry.type === 'MATHS_TUT')) {
       const isTutorial = entry.type === 'TUTORIAL' || entry.type === 'MATHS_TUT';
       const badgeColor = isTutorial ? 'bg-emerald-600' : 'bg-orange-600';
       const borderColor = isTutorial ? 'border-emerald-200/60' : 'border-orange-200/60';
       const textColor = isTutorial ? 'text-emerald-950' : 'text-orange-950';
       const subTextColor = isTutorial ? 'text-emerald-800/80' : 'text-orange-800/80';
       const headerText = isTutorial ? 'TUTORIAL' : 'LAB';

       return (
           <div className={`${baseClass} justify-start`}>
               {deleteOverlay}
               <div className={`flex items-center justify-between mb-2 border-b ${isTutorial ? 'border-emerald-200/50' : 'border-orange-200/50'} pb-1`}>
                   <span className="font-bold text-[10px] uppercase tracking-wider opacity-80">{headerText}</span>
                   <span className="text-[9px] font-mono font-bold opacity-70 bg-white/60 px-1.5 py-0.5 rounded shadow-sm">{entry.duration === 1 ? '1h' : '2h'}</span>
               </div>
               <div className="flex flex-col gap-1.5">
                   {entry.batches?.map((b: any, i: number) => {
                       if ((viewMode === 'CLASSROOM' || viewMode === 'LAB') && b.room !== selectedEntity) return null;
                       return (
                           <div key={i} className={`flex items-center gap-2 bg-white/70 p-1.5 rounded border ${borderColor} shadow-sm`}>
                               <span className={`${badgeColor} text-white text-[10px] font-bold px-1.5 py-1 rounded min-w-[28px] text-center shadow-sm h-full flex items-center justify-center`}>
                                   {b.batch || `B${i+1}`}
                               </span>
                               <div className="flex flex-col leading-none flex-1 min-w-0 gap-0.5">
                                   <span className={`font-bold text-[11px] ${textColor} truncate`} title={b.subject}>{b.subject}</span>
                                   <div className={`flex justify-between items-center w-full ${subTextColor}`}>
                                       <span className="text-[10px] truncate max-w-[60px]">
                                         {getTeacherShortCode(b.teacher)}
                                       </span>
                                       <span className="font-mono text-[10px] bg-white/50 px-1 rounded">{b.room}</span>
                                   </div>
                               </div>
                           </div>
                       );
                   })}
               </div>
           </div>
       );
    }

    return (
        <div className={baseClass}>
            {deleteOverlay}
            <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start">
                    <div className="font-bold text-sm leading-tight line-clamp-2 mb-1">{entry.subject}</div>
                    {entry.type === 'PROJECT' && <Briefcase className="w-3 h-3 opacity-50 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-1.5 opacity-90 text-xs">
                    <User className="w-3 h-3" />
                    <span className="truncate font-medium">
                      {viewMode === 'TEACHER' ? entry.displayDiv : getTeacherShortCode(entry.teacher)}
                    </span>
                </div>
            </div>
            <div className="mt-auto pt-2 border-t border-black/5 flex items-center justify-between opacity-80">
                <div className="flex items-center gap-1 font-mono text-[10px]">
                    <MapPin className="w-3 h-3" />
                    <span>{entry.room}</span>
                </div>
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-bold">{entry.type.substring(0,3)}</span>
            </div>
        </div>
    );
  };

  const handleCellClick = (div: string, day: string, slotIndex: number, timeLabel: string, existingEntry: any) => {
    if (viewMode !== 'MASTER') return;

    if (existingEntry) {
        return;
    }
    setTargetSlot({ div, day, slotIndex, timeLabel });
    setManualEntry({ 
        type: 'THEORY', duration: 1, subject: '', teacher: '', room: '',
        electiveGroups: [{ subject: '', teacher: '', room: '' }]
    });
    setIsAddDialogOpen(true);
  };

  const saveManualEntry = () => {
    if (!targetSlot) return;
    const { div, day, slotIndex } = targetSlot;
    
    const newEntry: BackendEntry = {
      slot: slotIndex,
      duration: manualEntry.duration,
      type: manualEntry.type as any,
      subject: manualEntry.type === 'ELECTIVE' ? manualEntry.electiveGroups.map(g => g.subject).join(' / ') : manualEntry.subject,
      teacher: manualEntry.type === 'ELECTIVE' ? manualEntry.electiveGroups.map(g => g.teacher).join(' / ') : (manualEntry.type === 'PROJECT' ? 'TBA' : manualEntry.teacher || 'TBA'),
      room: manualEntry.type === 'ELECTIVE' ? manualEntry.electiveGroups.map(g => g.room).join(' / ') : (manualEntry.room || 'TBA'),
      
      ...(manualEntry.type === 'ELECTIVE' ? {
          lab_subjects: manualEntry.electiveGroups.map(g => g.subject),
          teachers_list: manualEntry.electiveGroups.map(g => ({ name: g.teacher, id: 'manual' })), 
          assigned_rooms: manualEntry.electiveGroups.map(g => g.room)
      } : {})
    };

    const newTimetable = JSON.parse(JSON.stringify(timetable));
    if (!newTimetable[div]) newTimetable[div] = {};
    if (!newTimetable[div][day]) newTimetable[div][day] = [];
    
    const isOccupied = newTimetable[div][day].some((e: any) => e.slot === slotIndex);
    if (isOccupied) {
        toast({ title: "Slot Occupied", description: "Please remove existing entry first.", variant: "destructive" });
        return;
    }

    newTimetable[div][day].push(newEntry);
    setTimetable(newTimetable);
    
    const log: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date(),
        action: 'ADD',
        details: `${newEntry.subject} added to ${day} Slot ${slotIndex + 1}`,
        slotInfo: { div, day, slotIdx: slotIndex }
    };
    setLogs(prev => [log, ...prev]);

    setIsAddDialogOpen(false);
    toast({ title: "Entry Added" });
  };

  const handleRevert = (log: LogEntry) => {
      const { div, day, slotIdx } = log.slotInfo;
      const currentDaySlots = timetable[div]?.[day] || [];
      const isOccupied = currentDaySlots.some((e: any) => e.slot === slotIdx);

      if (log.action === 'DELETE') {
          if (isOccupied) {
              toast({ title: "Cannot Revert", description: "Slot is currently occupied by another lecture.", variant: "destructive" });
              return;
          }
          const newTimetable = JSON.parse(JSON.stringify(timetable));
          if (!newTimetable[div]) newTimetable[div] = {};
          if (!newTimetable[div][day]) newTimetable[div][day] = [];
          newTimetable[div][day].push(log.originalEntry);
          setTimetable(newTimetable);
          
          setLogs(prev => prev.filter(l => l.id !== log.id));
          toast({ title: "Action Reverted", description: "Lecture restored successfully." });
      } 
      else if (log.action === 'ADD') {
          const newTimetable = JSON.parse(JSON.stringify(timetable));
          if (newTimetable[div]?.[day]) {
              newTimetable[div][day] = newTimetable[div][day].filter((e: any) => e.slot !== slotIdx);
              setTimetable(newTimetable);
              setLogs(prev => prev.filter(l => l.id !== log.id));
              toast({ title: "Action Reverted", description: "Added entry removed." });
          }
      }
  };

  const buildCsvForCurrentView = () => {
    const rows: string[][] = [];

    // Header row: Day + one column per visual slot (with Recess column)
    const header: string[] = ['Day'];
    timeSlots.forEach((slot, i) => {
      if (i === timingData.recessAfterSlot) {
        header.push('Recess');
      }
      header.push(`${slot.label} (Slot ${i + 1})`);
    });
    rows.push(header);

    // Body: one row per day, one column per visual slot index
    timingData.workingDays.forEach((day) => {
      const row: string[] = [day];

      timeSlots.forEach((slot, i) => {
        // Recess column – keep empty cells, header already labels it
        if (i === timingData.recessAfterSlot) {
          row.push('');
        }

        const realSlotIdx = getBackendSlotIndex(i);
        const entry: any = getDataForCell(day, realSlotIdx);

        // No entry in this visual cell
        if (!entry) {
          row.push('');
          return;
        }

        // For multi-slot lectures, only fill the starting visual slot to mimic colSpan
        const isStart = entry.slot === realSlotIdx;
        if (!isStart) {
          row.push('');
          return;
        }

        let cellText = '';

        if (entry.type === 'ELECTIVE') {
          const subjects = (entry.subject || '').split(' / ');
          const teachers = (entry.teacher || '').split(' / ');
          const rooms = (entry.room || '').split(' / ');

          cellText = subjects
            .map((sub: string, idx: number) => {
              const tName = teachers[idx] || '';
              const tCode = tName ? getTeacherShortCode(tName) : '';
              const room = rooms[idx] || '';
              const teacherPart = tCode || tName;
              const roomPart = room ? ` (${room})` : '';
              return `${sub}${teacherPart ? ` - ${teacherPart}` : ''}${roomPart}`;
            })
            .join(' | ');
        } else if (
          entry.type === 'LAB' ||
          entry.type === 'TUTORIAL' ||
          entry.type === 'MATHS_TUT'
        ) {
          cellText =
            entry.batches
              ?.map((b: any) => {
                const tCode = getTeacherShortCode(b.teacher);
                const roomPart = b.room ? ` (${b.room})` : '';
                const batchLabel = b.batch ? `${b.batch} ` : '';
                return `${batchLabel}${b.subject}${
                  tCode ? ` - ${tCode}` : ''
                }${roomPart}`;
              })
              .join(' | ') || '';
        } else {
          const teacherDisplay =
            viewMode === 'TEACHER'
              ? entry.displayDiv || ''
              : getTeacherShortCode(entry.teacher);
          const roomPart = entry.room ? ` (${entry.room})` : '';
          cellText = `${entry.subject || ''}${
            teacherDisplay ? ` - ${teacherDisplay}` : ''
          }${roomPart}`;
        }

        row.push(cellText);
      });

      rows.push(row);
    });

    const escape = (value: string) =>
      `"${String(value).replace(/"/g, '""')}"`;

    return rows.map((row) => row.map(escape).join(',')).join('\n');
  };

  const handleDownloadCSV = () => {
    if (!timingData || !timetable) {
      toast({
        title: 'No timetable to export',
        description: 'Please generate the timetable first.',
        variant: 'destructive',
      });
      return;
    }

    const csvContent = buildCsvForCurrentView();
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeEntity = (selectedEntity || 'timetable').replace(/\s+/g, '_');
    link.href = url;
    link.download = `${viewMode.toLowerCase()}_${safeEntity}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: 'CSV download started' });
  };

  return (
    <div className="form-section animate-slide-up pb-10">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 bg-card p-4 rounded-xl shadow-sm border border-border sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            {viewMode === 'TEACHER' ? <User className="w-6 h-6 text-primary" /> : 
             viewMode === 'LAB' ? <FlaskConical className="w-6 h-6 text-primary" /> :
             <BookOpen className="w-6 h-6 text-primary" />}
          </div>
          <div>
            <h2 className="text-xl font-display font-bold">Timetable View</h2>
            <div className="flex gap-2 mt-1">
                {['MASTER', 'TEACHER', 'CLASSROOM', 'LAB'].map((m) => (
                    <button type="button" key={m} onClick={() => setViewMode(m as any)}
                        className={`text-xs px-3 py-1 rounded-full transition-colors border ${viewMode === m ? 'bg-primary text-white border-primary' : 'bg-background hover:bg-muted border-border'}`}>
                        {m}
                    </button>
                ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center">
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger className="w-[200px] h-9 border-primary/20 bg-white">
                    <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                    {viewMode === 'MASTER' && divisions.map(d => <SelectItem key={d} value={d}>{d} Division</SelectItem>)}
                    {viewMode === 'TEACHER' && faculty.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
                    {viewMode === 'CLASSROOM' && infrastructure.theoryRooms.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    {viewMode === 'LAB' && infrastructure.labRooms.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="gap-2 h-9"
              onClick={handleDownloadCSV}
            >
              <Download className="w-4 h-4" /> CSV
            </Button>
            <Button type="button" variant="outline" className="gap-2 h-9" onClick={() => toast({title: "Download Started"})}>
                <Download className="w-4 h-4" /> PDF
            </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="overflow-x-auto rounded-xl border border-border shadow-md bg-white">
        <table className="w-full min-w-[1200px] border-collapse">
            <thead>
                <tr className="bg-muted/30 border-b border-border h-10">
                    <th className="h-10 py-1 px-2 w-28 text-center align-middle font-bold text-muted-foreground uppercase text-xs tracking-wider border-r border-border sticky left-0 bg-white z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">Day</th>
                    {timeSlots.map((slot, i) => (
                        <Fragment key={i}>
                            {i === timingData.recessAfterSlot && (
                              <th className="relative h-10 w-10 bg-yellow-50/50 border-r border-yellow-200/50 p-0 align-middle">
                                <div
                                  className="absolute inset-0 flex items-center justify-center text-[9px] leading-none font-semibold text-muted-foreground"
                                  style={{ writingMode: 'vertical-rl' }}
                                >
                                  Recess
                                </div>
                              </th>
                            )}
                            <th className="h-10 py-1 px-2 text-center align-middle border-r border-border min-w-[160px]">
                                <div className="flex flex-col items-center justify-center leading-none gap-0.5">
                                    <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0 rounded whitespace-nowrap">{slot.label}</span>
                                    <span className="text-[11px] font-bold leading-none">Slot {i + 1}</span>
                                </div>
                            </th>
                        </Fragment>
                    ))}
                </tr>
            </thead>
            <tbody>
                {timingData.workingDays.map((day) => (
                    <tr key={day} className="border-b border-border last:border-b-0">
                        <td className="p-4 font-bold text-sm text-foreground border-r border-border sticky left-0 bg-white z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] text-center">{day}</td>
                        {timeSlots.map((slot, i) => {
                            const realSlotIdx = getBackendSlotIndex(i);
                            const entry = getDataForCell(day, realSlotIdx);
                            const isStart = entry && entry.slot === realSlotIdx;
                            const isContinuation = entry && entry.slot < realSlotIdx;

                            return (
                                <Fragment key={i}>
                                    {i === timingData.recessAfterSlot && <td className="bg-yellow-50/20 border-r border-yellow-100"></td>}
                                    {!isContinuation ? (
                                        <td 
                                            colSpan={isStart ? entry.duration : 1}
                                            className="p-1 min-h-[100px] h-auto border-r border-border align-top relative group hover:bg-muted/5"
                                            onClick={() => !entry && handleCellClick(selectedEntity, day, realSlotIdx, slot.label, entry)}
                                        >
                                            {renderCellContent(entry, day, realSlotIdx)}
                                        </td>
                                    ) : null}
                                </Fragment>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* CHANGELOG & REVERT SECTION */}
      {logs.length > 0 && (
          <Card className="mt-8 border-t-4 border-t-primary">
              <CardHeader className="pb-3 border-b bg-muted/20">
                  <CardTitle className="text-md font-bold flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" /> Recent Changes & Audit Log
                  </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                  <ScrollArea className="h-[200px] w-full">
                      <Table>
                          <TableHeader>
                              <TableRow className="bg-muted/10">
                                  <TableHead>Time</TableHead>
                                  <TableHead>Action</TableHead>
                                  <TableHead>Details</TableHead>
                                  <TableHead className="text-right">Undo</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {logs.map((log) => (
                                  <TableRow key={log.id}>
                                      <TableCell className="font-mono text-xs text-muted-foreground">{log.timestamp.toLocaleTimeString()}</TableCell>
                                      <TableCell>
                                          <Badge variant={log.action === 'DELETE' ? 'destructive' : 'default'} className="text-[10px]">
                                              {log.action}
                                          </Badge>
                                      </TableCell>
                                      <TableCell className="text-sm">{log.details}</TableCell>
                                      <TableCell className="text-right">
                                          <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs hover:bg-primary/10 hover:text-primary" onClick={() => handleRevert(log)}>
                                              <RotateCcw className="w-3 h-3" /> Revert
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </ScrollArea>
              </CardContent>
          </Card>
      )}

      {/* ADD ENTRY DIALOG */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Add Entry to {targetSlot?.day} Slot {targetSlot && targetSlot.slotIndex + 1}</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
                {/* Type Selection */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Type</Label>
                    <Select value={manualEntry.type} onValueChange={(v) => setManualEntry({...manualEntry, type: v})}>
                        <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="THEORY">Theory Lecture</SelectItem>
                            <SelectItem value="LAB">Lab Session</SelectItem>
                            <SelectItem value="ELECTIVE">Elective (Group)</SelectItem>
                            <SelectItem value="PROJECT">Project</SelectItem>
                            <SelectItem value="TUTORIAL">Tutorial</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* DYNAMIC FORM BASED ON TYPE */}
                {manualEntry.type === 'ELECTIVE' ? (
                    <div className="col-span-4 space-y-4 border rounded-md p-4 bg-muted/10">
                        <div className="flex justify-between items-center mb-2">
                            <Label className="font-bold text-sm">Elective Groups</Label>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                onClick={() => setManualEntry({
                                    ...manualEntry, 
                                    electiveGroups: [...manualEntry.electiveGroups, { subject: '', teacher: '', room: '' }]
                                })}>
                                <Plus className="w-3 h-3" /> Add Group
                            </Button>
                        </div>
                        {manualEntry.electiveGroups.map((group, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b pb-2 mb-2 last:border-0 last:pb-0">
                                <div className="col-span-4">
                                    <Label className="text-[10px]">Subject</Label>
                                    <Input className="h-8 text-xs" placeholder="Subject" value={group.subject} 
                                        onChange={e => {
                                            const newGroups = [...manualEntry.electiveGroups];
                                            newGroups[idx].subject = e.target.value;
                                            setManualEntry({...manualEntry, electiveGroups: newGroups});
                                        }} />
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-[10px]">Teacher</Label>
                                    <Input className="h-8 text-xs" placeholder="Teacher" value={group.teacher}
                                        onChange={e => {
                                            const newGroups = [...manualEntry.electiveGroups];
                                            newGroups[idx].teacher = e.target.value;
                                            setManualEntry({...manualEntry, electiveGroups: newGroups});
                                        }} />
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-[10px]">Room</Label>
                                    <Input className="h-8 text-xs" placeholder="Room" value={group.room}
                                        onChange={e => {
                                            const newGroups = [...manualEntry.electiveGroups];
                                            newGroups[idx].room = e.target.value;
                                            setManualEntry({...manualEntry, electiveGroups: newGroups});
                                        }} />
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    {manualEntry.electiveGroups.length > 1 && (
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50"
                                            onClick={() => {
                                                const newGroups = manualEntry.electiveGroups.filter((_, i) => i !== idx);
                                                setManualEntry({...manualEntry, electiveGroups: newGroups});
                                            }}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Subject</Label>
                            <Input className="col-span-3" value={manualEntry.subject} onChange={e => setManualEntry({...manualEntry, subject: e.target.value})} />
                        </div>
                        {manualEntry.type !== 'PROJECT' && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Teacher</Label>
                                <Input className="col-span-3" value={manualEntry.teacher} onChange={e => setManualEntry({...manualEntry, teacher: e.target.value})} />
                            </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Room</Label>
                            <Input className="col-span-3" value={manualEntry.room} onChange={e => setManualEntry({...manualEntry, room: e.target.value})} />
                        </div>
                    </>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Duration</Label>
                    <Input type="number" className="col-span-3" value={manualEntry.duration} onChange={e => setManualEntry({...manualEntry, duration: parseInt(e.target.value)})} min={1} max={2} />
                </div>
            </div>

            <DialogFooter>
                <Button type="button" onClick={() => setIsAddDialogOpen(false)} variant="outline">Cancel</Button>
                <Button type="button" onClick={saveManualEntry}>Save</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};