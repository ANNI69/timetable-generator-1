from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import random
import copy
from collections import defaultdict, deque, Counter

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS ---
class TeacherInput(BaseModel):
    id: str
    name: str
    role: str 
    experience: int
    shift: str 
    skills: List[str]

class SubjectInput(BaseModel):
    name: str
    code: str
    type: str 
    weekly_load: int 
    
class AllocationInput(BaseModel):
    teacher_id: str
    subject_name: str
    division: str

class TimetableRequest(BaseModel):
    config: Dict[str, Any]      
    resources: Dict[str, Any]   
    subjects: Dict[str, List[SubjectInput]] 
    lab_prefs: Dict[str, List[str]]
    home_rooms: Dict[str, str]  
    faculty: List[TeacherInput]
    allocations: List[AllocationInput]
    divisions: Dict[str, List[str]] 

# --- CLASSES ---
class Teacher:
    def __init__(self, data: TeacherInput):
        self.id = data.id
        self.name = data.name
        self.role = data.role
        self.experience = data.experience
        self.shift = data.shift
        self.skills = set(data.skills)
        self.current_load = 0
        self.theory_load = 0
        self.lab_load = 0
        
        # --- STRICT WORKLOAD LIMITS ---
        if self.role == "HOD": 
            self.max_load = 12; self.min_target = 10; self.max_theory = 4; self.max_lab = 8
        elif self.role == "Div Incharge":
            self.max_load = 15; self.min_target = 13; self.max_theory = 6; self.max_lab = 10
        elif self.role == "Faculty" and self.experience >= 10: 
            self.max_load = 14; self.min_target = 13; self.max_theory = 6; self.max_lab = 8
        else: 
            self.max_load = 17; self.min_target = 15; self.max_theory = 9; self.max_lab = 10

    def is_available(self, slot):
        if self.shift == 'A' and slot > 7: return False
        if self.shift == 'B' and slot < 1: return False
        return True
    
    def can_take_load(self, duration, type="THEORY"):
        if self.current_load + duration > self.max_load: return False
        if type == "THEORY": return self.theory_load + duration <= self.max_theory
        else: return self.lab_load + duration <= self.max_lab

class DummyTeacher:
    def __init__(self, id="-1", name="TBA"):
        self.id = id; self.name = name
        self.current_load = 0; self.theory_load = 0; self.lab_load = 0; self.shift = "ALL"
    def is_available(self, slot): return True
    def can_take_load(self, duration, type="THEORY"): return True

class Gene:
    def __init__(self, div, type, subject, teacher=None, duration=1, lab_subjects=None):
        self.div = div
        self.type = type # THEORY, LAB, ELECTIVE
        self.subject = subject 
        self.lab_subjects = lab_subjects # Used for Labs AND Elective lists
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
        self.div_types = defaultdict(lambda: defaultdict(dict))
        self.div_rooms = defaultdict(lambda: defaultdict(dict)) 

    def is_free(self, day, start, duration, div, teachers=None, rooms=None):
        for s in range(start, start + duration):
            if s >= self.constants['SLOTS_PER_DAY']: return False
            if s == self.constants['RECESS_INDEX']: return False 
            if div and div in self.grid[day][s]['div']: return False
            if teachers:
                for t in teachers:
                    if t is None: continue 
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
            self.div_types[day][gene.div][idx] = gene.type 
            if rooms: self.div_rooms[day][gene.div][idx] = rooms[0]
            
            for t in teachers: 
                if t and t.id != "-1": 
                    self.grid[day][idx]['teacher'].add(t.id)
                    self.teacher_slots[t.id][day].append(idx)
            for r in rooms: self.grid[day][idx]['room'].add(r)
            self.div_slots[gene.div][day].append(idx)
    
    def calculate_gaps(self):
        total_gaps = 0
        for div, days_data in self.div_slots.items():
            for day, slots in days_data.items():
                if not slots: continue
                slots.sort()
                valid = [s for s in slots if s != self.constants['RECESS_INDEX']]
                if len(valid) > 1:
                    gaps = (max(valid) - min(valid) + 1) - len(valid)
                    if gaps > 0: total_gaps += gaps
        return total_gaps

# --- UTILS ---
def get_pref_rooms_for_subject(sub_name: str, lab_prefs: Dict[str, List[str]]) -> List[str]:
    if sub_name in ["Library", "Free"]: return []
    for key, rooms in lab_prefs.items():
        if key in sub_name: return rooms
    return []

def get_lab_resources(schedule, day, start, duration, lab_names, lab_prefs, all_teachers, constants):
    final_rooms = [None] * 3
    reserved_rooms = set()
    for rooms in lab_prefs.values():
        for r in rooms: reserved_rooms.add(r)

    # 1. Preferences
    for i, name in enumerate(lab_names):
        if name in ["Library", "Free"]: continue
        matched_rooms = get_pref_rooms_for_subject(name, lab_prefs)
        if matched_rooms:
            for r in matched_rooms:
                if schedule.is_free(day, start, duration, None, rooms=[r]) and r not in final_rooms:
                    final_rooms[i] = r; break
    
    # 2. General Pool
    general_pool = [r for r in constants['LAB_ROOMS'] if r not in reserved_rooms]
    random.shuffle(general_pool)
    for i in range(3):
        if final_rooms[i] is None:
            if lab_names[i] in ["Library", "Free"]: final_rooms[i] = "TBA"
            else:
                for r in general_pool:
                    if r not in final_rooms and schedule.is_free(day, start, duration, None, rooms=[r]):
                        final_rooms[i] = r; break

    if any(r is None for r in final_rooms): return None, None
    return final_rooms, [] 

def get_elective_resources(schedule, day, start, duration, subject_names, theory_rooms, constants):
    # Find multiple theory rooms for parallel electives
    final_rooms = []
    # Use any available theory room
    available = [r for r in theory_rooms if schedule.is_free(day, start, duration, None, rooms=[r])]
    random.shuffle(available)
    
    if len(available) >= len(subject_names):
        return available[:len(subject_names)]
    return None

def check_soft_constraints(schedule, div, day, slot, gene, constants, proposed_room=None, home_room=None):
    cost = 0
    # 1. Subject Repetition
    for g in schedule.genes:
        if g.day == day and g.div == div and g.subject == gene.subject and g != gene:
            return 10000 

    # 2. Teacher Compactness
    t = gene.teacher
    if t:
        teacher_slots = sorted(schedule.teacher_slots[t.id][day])
        prev_slot = slot - 1; next_slot = slot + 1
        if prev_slot == constants['RECESS_INDEX']: prev_slot -= 1
        if next_slot == constants['RECESS_INDEX']: next_slot += 1
        if prev_slot in teacher_slots: cost -= 1000 
        if next_slot in teacher_slots: cost -= 1000

    # 3. Nuclear Gap Penalty (50k)
    existing = schedule.div_slots[div][day]
    if existing:
        new_slots = existing + [slot]; new_slots.sort()
        valid = [s for s in new_slots if s != constants['RECESS_INDEX']]
        if len(valid) > 1:
            gaps = (max(valid) - min(valid) + 1) - len(valid)
            if gaps > 0: cost += (gaps * 50000)

    # 4. Post-Recess Magnet & Morning Anchor
    if slot == constants['RECESS_INDEX'] + 1: cost -= 100000
    if slot == 0: cost -= 20000 

    # 5. Student Boredom
    if gene.type == "THEORY":
        day_types = schedule.div_types[day][div]
        consecutive = 0
        for s in range(slot - 1, -1, -1):
            if s == constants['RECESS_INDEX']: continue
            if day_types.get(s) == "THEORY": consecutive += 1
            else: break
        for s in range(slot + 1, constants['SLOTS_PER_DAY']):
            if s == constants['RECESS_INDEX']: continue
            if day_types.get(s) == "THEORY": consecutive += 1
            else: break
        if consecutive >= 2: cost += 5000 
        if consecutive >= 3: cost += 10000

    # 6. Room Stickiness
    if proposed_room and home_room:
        if proposed_room != home_room:
            if slot < constants['RECESS_INDEX']: cost += 5000
            else: cost += 500 
        
        prev_slot = slot - 1
        if prev_slot == constants['RECESS_INDEX']: prev_slot -= 1
        prev_room = schedule.div_rooms[day][div].get(prev_slot)
        if prev_room:
            if prev_room != proposed_room: cost += 2000
            else: cost -= 500
            
    # 7. Elective Placement (Start/End Preference)
    if gene.type == "ELECTIVE":
        last_slot = constants['SLOTS_PER_DAY'] - 1
        if slot not in [0, last_slot, last_slot-1]:
            cost += 5000 

    return cost

def atomic_allocate_teacher(all_teachers, subject_name, total_weekly_load, allocation_map, division, type="THEORY"):
    assigned_id = next((a.teacher_id for a in allocation_map if a.subject_name == subject_name and a.division == division), None)
    if assigned_id:
        t = next((x for x in all_teachers if x.id == assigned_id), None)
        if t: return t

    candidates = [t for t in all_teachers if t.can_take_load(total_weekly_load, type)]
    skilled = [t for t in candidates if subject_name in t.skills]
    pool = skilled if skilled else candidates
    
    if pool:
        pool.sort(key=lambda x: (x.current_load >= x.min_target, x.current_load))
        return pool[0]
    
    fallback = [t for t in all_teachers if t.can_take_load(total_weekly_load, type)]
    if fallback:
        fallback.sort(key=lambda x: x.current_load)
        return fallback[0]

    return DummyTeacher()

@app.post("/generate-timetable")
async def generate_timetable(req: TimetableRequest):
    PROJECT_RESERVATIONS = {
        "BE-A": {"Fri": [0, 1, 2, 3, 5, 6, 7]}, 
        "BE-B": {"Thu": [0, 1, 2, 3, 5, 6, 7]},
        "TE-A": {"Wed": [5, 6, 7]},
        "TE-B": {"Tue": [5, 6, 7]}
    }
    
    CONSTANTS = {
        'SLOTS_PER_DAY': req.config.get('slots_per_day', 9),
        'RECESS_INDEX': req.config.get('recess_index', 4),
        'LAB_ROOMS': req.resources.get('lab_rooms', []),
        'THEORY_ROOMS': req.resources.get('theory_rooms', [])
    }
    
    teacher_map = {t.id: Teacher(t) for t in req.faculty}
    all_teachers = list(teacher_map.values())
    all_genes = []
    global_subject_assignments = {}

    # --- WORKLOAD GENERATION ---
    for year, divs in req.divisions.items():
        year_subjects = req.subjects.get(year, [])
        for div in divs:
            
            # 1. Separate Electives vs Normal Theory
            normal_theory = [s for s in year_subjects if s.type == 'Theory']
            electives = [s for s in year_subjects if s.type == 'Elective'] 
            
            # A. Process Normal Theory
            for sub in normal_theory:
                if "Project" in sub.name: continue 
                
                assignment_key = (div, sub.name)
                if assignment_key not in global_subject_assignments:
                    t = atomic_allocate_teacher(all_teachers, sub.name, sub.weekly_load, req.allocations, div, "THEORY")
                    if t.id != "-1": 
                        t.current_load += sub.weekly_load
                        t.theory_load += sub.weekly_load
                    global_subject_assignments[assignment_key] = t
                
                teacher = global_subject_assignments[assignment_key]
                for _ in range(sub.weekly_load):
                    all_genes.append(Gene(div, "THEORY", sub.name, teacher=teacher))
            
            # B. Process Electives (Bundled)
            if electives:
                load = electives[0].weekly_load
                elec_names = []
                elec_teachers = []
                
                # Pre-allocate for all electives
                for e in electives:
                    elec_names.append(e.name)
                    t = atomic_allocate_teacher(all_teachers, e.name, load, req.allocations, div, "THEORY")
                    if t.id != "-1":
                        t.current_load += load
                        t.theory_load += load
                    elec_teachers.append(t)

                for _ in range(load):
                    g = Gene(div, "ELECTIVE", "Elective Block", duration=1, lab_subjects=elec_names)
                    g.assigned_teachers = elec_teachers
                    all_genes.append(g)

            # 2. Labs
            lab_subs = [s for s in year_subjects if s.type == 'Lab']
            if lab_subs:
                valid_labs = [s for s in lab_subs if "Project" not in s.name]
                master_tokens = []
                for sub in valid_labs:
                    sessions = max(1, int(sub.weekly_load / 2))
                    for _ in range(sessions): master_tokens.append(sub.name)
                
                random.shuffle(master_tokens)
                n = len(master_tokens)
                if n > 0:
                    shift = n // 3 if n >= 3 else 1
                    q1 = list(master_tokens)
                    q2 = master_tokens[shift:] + master_tokens[:shift]
                    q3 = master_tokens[2*shift:] + master_tokens[:2*shift]
                    
                    for i in range(n):
                        triplet = [q1[i], q2[i], q3[i]]
                        lab_gene = Gene(div, "LAB", "Lab Session", duration=2, lab_subjects=triplet)
                        
                        assigned_teachers = []
                        for sub_name in triplet:
                            if sub_name == "Library" or sub_name == "Free":
                                assigned_teachers.append(None)
                            else:
                                t = atomic_allocate_teacher(all_teachers, sub_name, 2, req.allocations, div, "LAB")
                                if t.id != "-1": 
                                    t.current_load += 2
                                    t.lab_load += 2 
                                assigned_teachers.append(t)
                        
                        lab_gene.assigned_teachers = assigned_teachers
                        all_genes.append(lab_gene)

    best_schedule = None
    best_score = -float('inf')
    best_gaps = float('inf')

    for run in range(100): 
        schedule = Schedule(copy.deepcopy(all_genes), CONSTANTS)
        
        # Pre-Book Projects
        for div, days_map in PROJECT_RESERVATIONS.items():
            for day_name, slots in days_map.items():
                if day_name not in req.config['days']: continue
                d_idx = req.config['days'].index(day_name)
                for s in slots:
                    if schedule.is_free(d_idx, s, 1, div):
                        proj_gene = Gene(div, "PROJECT", "Major Project", duration=1)
                        proj_gene.assigned_room = ["Project Lab"]
                        proj_gene.assigned_teachers = [DummyTeacher(id="-1", name="Guide")]
                        schedule.book(proj_gene, d_idx, s, ["Project Lab"], proj_gene.assigned_teachers)

        # 1. Place Labs
        labs = [g for g in schedule.genes if g.type == "LAB"]
        random.shuffle(labs)
        for g in labs:
            placed = False
            days = list(range(len(req.config['days']))); random.shuffle(days)
            has_library = any(sub == "Library" for sub in g.lab_subjects)
            if has_library: starts = [0, 7, 1, 6, 5, 2] 
            else: starts = [5, 7, 0, 2]
            
            for d in days:
                for s in starts:
                    if schedule.is_free(d, s, 2, g.div, teachers=g.assigned_teachers):
                        rooms, _ = get_lab_resources(schedule, d, s, 2, g.lab_subjects, req.lab_prefs, all_teachers, CONSTANTS)
                        if rooms:
                            schedule.book(g, d, s, rooms, g.assigned_teachers)
                            placed = True; break
                if placed: break

        # 2. Place Theory (Includes Electives)
        theories = [g for g in schedule.genes if g.type in ["THEORY", "ELECTIVE"]]
        random.shuffle(theories)
        
        for g in theories:
            teachers_check = g.assigned_teachers if g.type == "ELECTIVE" else [g.teacher]
            best_cost = float('inf')
            best_move = None
            
            home = req.home_rooms.get(g.div, req.resources['theory_rooms'][0])
            days = list(range(len(req.config['days']))); random.shuffle(days)
            
            for d in days:
                if any(x.day == d and x.subject == g.subject for x in schedule.genes if x.div == g.div): continue
                
                possible_slots = list(range(CONSTANTS['SLOTS_PER_DAY']))
                possible_slots.sort(key=lambda s: 0 if s in [CONSTANTS['RECESS_INDEX'] + 1, 0] else 1)

                for s in possible_slots:
                    chosen_rooms = []
                    if g.type == "ELECTIVE":
                        chosen_rooms = get_elective_resources(schedule, d, s, 1, g.lab_subjects, req.resources['theory_rooms'], CONSTANTS)
                        if not chosen_rooms: continue 
                    else:
                        if schedule.is_free(d, s, 1, g.div, teachers=teachers_check, rooms=[home]):
                            chosen_rooms = [home]
                        else:
                            for r in req.resources['theory_rooms']:
                                if r != home and schedule.is_free(d, s, 1, g.div, teachers=teachers_check, rooms=[r]):
                                    chosen_rooms = [r]; break
                    
                    if chosen_rooms:
                        if schedule.is_free(d, s, 1, g.div, teachers=teachers_check, rooms=chosen_rooms):
                            chk_room = chosen_rooms[0] if chosen_rooms else None
                            cost = check_soft_constraints(schedule, g.div, d, s, g, CONSTANTS, proposed_room=chk_room, home_room=home)
                            if cost < best_cost:
                                best_cost = cost
                                best_move = (d, s, chosen_rooms)
                            if cost < -10000: break 

                if best_cost < -50000: break

            if best_move:
                d, s, rms = best_move
                schedule.book(g, d, s, rms, teachers_check)

        unplaced = sum(1 for g in schedule.genes if g.day == -1)
        gaps = schedule.calculate_gaps()
        score = 1000000 - (unplaced * 100000) - (gaps * 50000)
        
        if score > best_score:
            best_score = score
            best_schedule = schedule
            best_gaps = gaps

    output = {}
    if best_schedule:
        for g in best_schedule.genes:
            if g.day == -1: continue
            div_key = g.div
            day_key = req.config['days'][g.day]
            if div_key not in output: output[div_key] = {}
            if day_key not in output[div_key]: output[div_key][day_key] = []
            
            if g.type == "ELECTIVE":
                entry = {
                    "slot": g.slot,
                    "duration": g.duration,
                    "type": "ELECTIVE",
                    "subject": " / ".join(g.lab_subjects),
                    "room": " / ".join(g.assigned_room),
                    "teacher": " / ".join([t.name for t in g.assigned_teachers if t])
                }
            else:
                t_name = "TBA"
                if g.type == "THEORY" and g.teacher: t_name = g.teacher.name
                elif g.assigned_teachers and g.assigned_teachers[0]: t_name = g.assigned_teachers[0].name

                entry = {
                    "slot": g.slot,
                    "duration": g.duration,
                    "type": g.type,
                    "subject": g.subject,
                    "room": g.assigned_room[0] if g.assigned_room else "TBA",
                    "teacher": t_name
                }
            
            if g.type == "LAB":
                entry["batches"] = []
                for i, sub in enumerate(g.lab_subjects):
                    b_teacher = "TBA"
                    if i < len(g.assigned_teachers) and g.assigned_teachers[i]:
                        b_teacher = g.assigned_teachers[i].name
                    b_room = "TBA"
                    if i < len(g.assigned_room) and g.assigned_room[i]: b_room = g.assigned_room[i]
                    entry["batches"].append({
                        "subject": sub, "room": b_room, "teacher": b_teacher, "batch": f"B{i+1}"
                    })
                
            output[div_key][day_key].append(entry)

    return output