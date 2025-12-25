from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import random
import copy
from collections import defaultdict

app = FastAPI()

# 1. ALLOW CONNECTION FROM FRONTEND (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow your local or Lovable UI to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. DATA MODELS (The Contract with your UI)
class TeacherInput(BaseModel):
    id: str
    name: str
    role: str  # HOD, Div Incharge, Faculty
    experience: int
    shift: str  # A or B
    skills: List[str]

class SubjectInput(BaseModel):
    name: str
    code: str
    type: str  # Theory or Lab
    weekly_load: int # e.g. 3 or 2
    
class AllocationInput(BaseModel):
    teacher_id: str
    subject_name: str
    division: str

class TimetableRequest(BaseModel):
    config: Dict[str, Any]      # { "slots_per_day": 9, "recess_index": 4, "days": [...] }
    resources: Dict[str, Any]   # { "theory_rooms": [...], "lab_rooms": [...], "maths_room": "902" }
    subjects: Dict[str, List[SubjectInput]] # Keyed by Year (SE, TE)
    lab_prefs: Dict[str, List[str]] # { "Web": ["801"], "Maths": ["902"] }
    home_rooms: Dict[str, str]  # { "SE-A": "701" }
    faculty: List[TeacherInput]
    allocations: List[AllocationInput]
    divisions: Dict[str, List[str]] # { "SE": ["SE-A", "SE-B"] }

# 3. V66 ALGORITHM LOGIC ADAPTED FOR API
class Teacher:
    def __init__(self, data: TeacherInput):
        self.id = data.id
        self.name = data.name
        self.role = data.role
        self.experience = data.experience
        self.shift = data.shift
        self.skills = set(data.skills)
        self.current_load = 0
        
        # Load Limits
        if self.role == "HOD": self.max_load = 10
        elif self.role == "Div Incharge": self.max_load = 12
        else: self.max_load = 14 if self.experience > 15 else 18

    def is_available(self, slot):
        if self.shift == 'A' and slot > 7: return False
        if self.shift == 'B' and slot < 1: return False
        return True
    
    def can_take_load(self, duration=1):
        return self.current_load + duration <= self.max_load

class Gene:
    def __init__(self, div, type, subject, teacher=None, duration=1, lab_subjects=None):
        self.div = div
        self.type = type
        self.subject = subject 
        self.lab_subjects = lab_subjects
        self.duration = duration
        self.teacher = teacher 
        self.day = -1
        self.slot = -1
        self.assigned_room = []
        self.assigned_teachers = []

class Schedule:
    def __init__(self, genes, constants):
        self.genes = genes
        self.constants = constants
        self.grid = defaultdict(lambda: defaultdict(lambda: defaultdict(set)))
        self.div_slots = defaultdict(lambda: defaultdict(list))
        self.teacher_slots = defaultdict(lambda: defaultdict(list))
        self.classrooms_used = defaultdict(lambda: defaultdict(int))
        self.general_labs_used = defaultdict(lambda: defaultdict(int))

    def is_free(self, day, start, duration, div, teachers=None, rooms=None):
        for s in range(start, start + duration):
            if s == self.constants['RECESS_INDEX']: return False
            if s >= self.constants['SLOTS_PER_DAY']: return False
            if div and div in self.grid[day][s]['div']: return False
            if teachers:
                for t in teachers:
                    if t.id in self.grid[day][s]['teacher']: return False
                    if not t.is_available(s): return False
            if rooms:
                for r in rooms:
                    if r in self.grid[day][s]['room']: return False
        return True

    def book(self, gene, day, start, rooms, teachers):
        gene.day = day
        gene.slot = start
        gene.assigned_room = rooms
        gene.assigned_teachers = teachers
        for i in range(gene.duration):
            idx = start + i
            self.grid[day][idx]['div'].add(gene.div)
            for t in teachers: 
                if t and t.id != "-1": 
                    self.grid[day][idx]['teacher'].add(t.id)
                    self.teacher_slots[t.id][day].append(idx)
            for r in rooms: self.grid[day][idx]['room'].add(r)
            self.div_slots[gene.div][day].append(idx)
            
            if gene.type == 'THEORY': self.classrooms_used[day][idx] += 1
            elif gene.type == 'LAB':
                if any(r in self.constants['LAB_ROOMS'] for r in rooms):
                    self.general_labs_used[day][idx] += 1

def get_lab_resources(schedule, day, start, duration, lab_names, lab_prefs, all_teachers, constants):
    final_rooms = [None] * 3
    # 1. Rooms Logic
    for i, name in enumerate(lab_names):
        pref_found = False
        for key, rooms in lab_prefs.items():
            if key in name:
                for r in rooms:
                    if schedule.is_free(day, start, duration, None, rooms=[r]) and r not in final_rooms:
                        final_rooms[i] = r; pref_found = True; break
            if pref_found: break
    
    pool = list(constants['LAB_ROOMS']); random.shuffle(pool)
    for i in range(3):
        if final_rooms[i] is None:
            for r in pool:
                if r not in final_rooms and schedule.is_free(day, start, duration, None, rooms=[r]):
                    final_rooms[i] = r; break
            if final_rooms[i] is None: return None, None

    # 2. Teachers Logic (Simplified for API speed)
    candidates = [t for t in all_teachers if t.can_take_load(duration)]
    random.shuffle(candidates)
    final_teachers = []
    
    for t in candidates:
        if schedule.is_free(day, start, duration, None, teachers=[t]):
            final_teachers.append(t)
            if len(final_teachers) == 3: break
            
    if len(final_teachers) < 3: return None, None
    return final_rooms, final_teachers

# 4. API ENDPOINT
@app.post("/generate-timetable")
async def generate_timetable(req: TimetableRequest):
    # Setup Context
    CONSTANTS = {
        'SLOTS_PER_DAY': req.config.get('slots_per_day', 9),
        'RECESS_INDEX': req.config.get('recess_index', 4),
        'LAB_ROOMS': req.resources.get('lab_rooms', []),
        'THEORY_ROOMS': req.resources.get('theory_rooms', [])
    }
    
    # Init Objects
    teacher_map = {t.id: Teacher(t) for t in req.faculty}
    all_teachers = list(teacher_map.values())
    all_genes = []
    
    # Build Workload
    for year, divs in req.divisions.items():
        year_subjects = req.subjects.get(year, [])
        for div in divs:
            # Theory
            theory_subs = [s for s in year_subjects if s.type == 'Theory']
            for sub in theory_subs:
                # Find allocated teacher
                assigned_id = next((a.teacher_id for a in req.allocations if a.subject_name == sub.name and a.division == div), None)
                teacher = teacher_map.get(assigned_id)
                
                # Update Load
                if teacher: teacher.current_load += sub.weekly_load
                
                for _ in range(sub.weekly_load):
                    all_genes.append(Gene(div, "THEORY", sub.name, teacher=teacher))
            
            # Labs
            lab_subs = [s.name for s in year_subjects if s.type == 'Lab']
            if lab_subs:
                count = len(lab_subs)
                for i in range(count):
                    idx = i % count
                    triplet = [lab_subs[idx], lab_subs[(idx+1)%count], lab_subs[(idx+2)%count] if count>2 else "Library"]
                    all_genes.append(Gene(div, "LAB", "Lab Session", duration=2, lab_subjects=triplet))

    # Run Solver (Single Pass for API)
    schedule = Schedule(copy.deepcopy(all_genes), CONSTANTS)
    
    # Place Labs
    labs = [g for g in schedule.genes if g.type == "LAB"]
    for g in labs:
        placed = False
        days = list(range(len(req.config['days']))); random.shuffle(days)
        starts = [0, 2, 5, 7]
        for d in days:
            for s in starts:
                if schedule.is_free(d, s, 2, g.div):
                    rooms, teachers = get_lab_resources(schedule, d, s, 2, g.lab_subjects, req.lab_prefs, all_teachers, CONSTANTS)
                    if rooms:
                        schedule.book(g, d, s, rooms, teachers)
                        placed = True; break
            if placed: break

    # Place Theory
    theories = [g for g in schedule.genes if g.type == "THEORY"]
    for g in theories:
        placed = False
        days = list(range(len(req.config['days']))); random.shuffle(days)
        t = g.teacher
        
        home = req.home_rooms.get(g.div, req.resources['theory_rooms'][0])
        rooms_to_try = [home] + [r for r in req.resources['theory_rooms'] if r != home]
        
        for d in days:
            possible_slots = [s for s in range(CONSTANTS['SLOTS_PER_DAY']) if s != CONSTANTS['RECESS_INDEX']]
            random.shuffle(possible_slots)
            
            for s in possible_slots:
                # Check soft constraint: One slot per day per subject
                if any(x.day == d and x.subject == g.subject for x in schedule.genes if x.div == g.div):
                    break # Try next day
                
                if schedule.is_free(d, s, 1, g.div, [t]):
                    for r in rooms_to_try:
                        if schedule.is_free(d, s, 1, None, rooms=[r]):
                            schedule.book(g, d, s, [r], [t])
                            placed = True; break
                if placed: break
            if placed: break

    # Format Output
    output = {}
    for g in schedule.genes:
        if g.day == -1: continue
        
        div_key = g.div
        day_key = req.config['days'][g.day]
        
        if div_key not in output: output[div_key] = {}
        if day_key not in output[div_key]: output[div_key][day_key] = []
        
        entry = {
            "slot": g.slot,
            "duration": g.duration,
            "type": g.type,
            "subject": g.subject,
            "room": g.assigned_room[0] if g.assigned_room else "TBA",
            "teacher": g.assigned_teachers[0].name if g.assigned_teachers else "TBA"
        }
        
        if g.type == "LAB":
            entry["batches"] = [
                {"subject": sub, "room": g.assigned_room[i], "teacher": g.assigned_teachers[i].name}
                for i, sub in enumerate(g.lab_subjects)
            ]
            
        output[div_key][day_key].append(entry)

    return output