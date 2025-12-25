import random
import webbrowser
import os
import copy
from collections import defaultdict

# ==========================================
# 1. CONFIGURATION
# ==========================================

CONSTANTS = {
    'DAYS': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    'SLOTS': [
        '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-01:00', 
        '01:00-01:30 (Break)', 
        '01:30-02:30', '02:30-03:30', '03:30-04:30', '04:30-05:30'
    ],
    'RECESS_INDEX': 4,
    'THEORY_ROOMS': ['701', '702', '703', '704', '705'],
    'LAB_ROOMS': ['801', '802', '803', '804', '805', '806'],
    'MATHS_LAB': '902'
}

HOME_ROOMS = {
    'SE-A': '701', 'SE-B': '702', 'SE-C': '703',
    'TE-A': '704', 'BE-A': '704',
    'TE-B': '705', 'BE-B': '705'
}

LAB_BIAS = {
    'SE-A': 'Afternoon', 'SE-C': 'Afternoon', 'TE-A': 'Afternoon', 'BE-A': 'Afternoon',
    'SE-B': 'Morning', 'TE-B': 'Morning', 'BE-B': 'Morning'
}

# ==========================================
# 2. DATA INPUT
# ==========================================

ALL_TEACHERS = {f'T{i}': f'T{i}' for i in range(1, 23)}
ALL_TEACHERS['T22'] = 'Mrs. Smitha'

THEORY_DATA = [
    # SE
    ('T2', 'CNND', ['SE-A', 'SE-B'], 3),
    ('T7', 'CNND', ['SE-C'], 3),
    ('T7', 'BMD', ['SE-A', 'SE-B'], 2),
    ('T9', 'DT', ['SE-B'], 2),
    ('T11', 'DT', ['SE-C'], 2),
    ('T12', 'MDM', ['SE-C'], 3),
    ('T12', 'DT', ['SE-A'], 2),
    ('T14', 'MDM', ['SE-A'], 3),
    ('T15', 'BMD', ['SE-C'], 2),
    ('T17', 'PP', ['SE-B', 'SE-C'], 2),
    ('T17', 'MDM', ['SE-A'], 3), 
    ('T18', 'OS', ['SE-B', 'SE-C'], 3),
    ('T19', 'OE', ['SE-A', 'SE-B', 'SE-C'], 2),
    ('T20', 'MDM', ['SE-B', 'SE-C'], 3),
    ('T22', 'Maths-4', ['SE-A', 'SE-B', 'SE-C'], 2), 
    
    # TE
    ('T9', 'DMBI', ['TE-A'], 3),
    ('T16', 'DMBI', ['TE-B'], 3),
    ('T10', 'AIDS', ['TE-A'], 3),
    ('T11', 'AIDS', ['TE-B'], 3),
    ('T14', 'WebX', ['TE-A'], 3),
    ('T21', 'WebX', ['TE-B'], 3),
    ('T15', 'WT', ['TE-A', 'TE-B'], 3),
    
    # BE
    ('T3', 'BDLT', ['BE-A', 'BE-B'], 3),
    ('T12', 'BDA', ['BE-A', 'BE-B'], 3),
    ('T4', 'PM', ['BE-A'], 3),
    ('T6', 'PM', ['BE-B'], 3),
]

ELECTIVE_DATA = [
    ('EHF', 'T1', 'GIT', 'T14', ['TE-A', 'TE-B'], 3),
    ('UID', 'T13', 'CCS', 'T8', ['BE-A', 'BE-B'], 3)
]

LAB_TASKS_RAW = [
    # SE
    ('SE-A', ['A1','A2','A3'], 'NDL', 'T2'),
    ('SE-B', ['B1','B2'],      'NDL', 'T4'),
    ('SE-A', ['A1','A2','A3'], 'UL', 'T5'),
    ('SE-B', ['B1','B2'],      'UL', 'T5'),
    ('SE-A', ['A1','A2','A3'], 'MPWA', 'T6'),
    ('SE-A', ['A1'],           'DT', 'T6'),
    ('SE-A', ['A1','A2','A3'], 'BMD', 'T7'),
    ('SE-C', ['C1'],           'BMD', 'T7'),
    ('SE-A', ['A1','A2','A3'], 'BIL', 'T9'),
    ('SE-B', ['B1','B2'],      'DT', 'T9'),
    
    ('SE-A', ['A1','A2','A3'], 'DSPYL', 'T10'),
    ('SE-B', ['B1','B2','B3'], 'PP', 'T10'),
    ('SE-B', ['B1','B2','B3'], 'DSPYL', 'T11'),

    ('SE-C', ['C2','C3'],      'DT', 'T11'),
    ('SE-C', ['C1'],           'MDM', 'T12'), 
    ('SE-A', ['A1'],           'MDM', 'T12'), 
    ('SE-A', ['A2','A3'],      'DT', 'T12'),
    ('SE-B', ['B1','B2','B3'], 'BMD', 'T13'),
    ('SE-B', ['B1','B2','B3'], 'WL', 'T13'),
    ('SE-A', ['A1','A2','A3'], 'WL', 'T14'),
    ('SE-A', ['A2'],           'MDM', 'T14'),
    ('SE-B', ['B1','B2','B3'], 'SL', 'T15'),
    ('SE-C', ['C1','C2','C3'], 'NDL', 'T16'),
    ('SE-A', ['A1','A2','A3'], 'PP', 'T17'),
    ('SE-C', ['C3'],           'PP', 'T17'),
    ('SE-C', ['C1','C2','C3'], 'UL', 'T18'),
    ('SE-B', ['B3'],           'UL', 'T18'),
    ('SE-A', ['A3'],           'MDM', 'T18'),
    ('SE-B', ['B3'],           'NDL', 'T19'),
    ('SE-B', ['B3'],           'DT', 'T19'),
    ('SE-C', ['C1'],           'DT', 'T19'),
    ('SE-C', ['C2','C3'],      'BMD', 'T19'),
    ('SE-B', ['B1','B2','B3'], 'MDM', 'T20'),
    ('SE-C', ['C2','C3'],      'MDM', 'T20'),
    
    # TE
    ('TE-A', ['A1','A2','A3'], 'BIL', 'T9'),
    ('TE-B', ['B1','B2','B3'], 'BIL', 'T16'),
    ('TE-A', ['A1','A2','A3'], 'WL', 'T14'),
    ('TE-B', ['B1','B2','B3'], 'WL', 'T13'),
    ('TE-A', ['A1','A2','A3'], 'SL', 'T1'),
    ('TE-B', ['B1','B2','B3'], 'SL', 'T15'),
    ('TE-A', ['A1','A2','A3'], 'DSPYL', 'T10'),
    ('TE-B', ['B1','B2','B3'], 'DSPYL', 'T11'),
    ('TE-A', ['A1','A2','A3'], 'MPWA', 'T6'),
    ('TE-B', ['B1','B2','B3'], 'MPWA', 'T21'),
    
    # BE
    ('BE-A', ['A1','A2','A3'], 'BDLT Lab', 'T3'),
    ('BE-B', ['B1','B2','B3'], 'BDLT Lab', 'T4'),
    ('BE-A', ['A1','A2','A3'], 'CCL', 'T8'),
    ('BE-B', ['B1','B2','B3'], 'CCL', 'T8'),
]

# ==========================================
# 3. CORE LOGIC
# ==========================================

class Teacher:
    def __init__(self, id, name):
        self.id = id; self.name = name; self.current_load = 0; self.max_load = 40
    def assign_load(self, duration=1): self.current_load += duration
    def __repr__(self): return self.name

class Gene:
    def __init__(self, div, type, subject, teacher=None, duration=1, lab_subjects=None, teachers_list=None, batch=None):
        self.div = div
        self.type = type # THEORY, LAB_WHOLE, LAB_GROUP, LAB_SINGLE, ELECTIVE, MATHS_TUT
        self.subject = subject 
        self.lab_subjects = lab_subjects 
        self.duration = duration
        self.teacher = teacher 
        self.teachers_list = teachers_list 
        self.batch = batch 
        self.day = -1; self.slot = -1; self.assigned_room = []
    def __repr__(self): return f"{self.div}|{self.subject}"

class Schedule:
    def __init__(self, genes):
        self.genes = genes
        self.grid = defaultdict(lambda: defaultdict(lambda: defaultdict(set)))
        self.div_slots = defaultdict(lambda: defaultdict(list))
        self.teacher_slots = defaultdict(lambda: defaultdict(list))
        self.div_type_history = defaultdict(lambda: defaultdict(lambda: None))
        self.theory_rooms_used = defaultdict(lambda: defaultdict(int))
        self.div_batch_busy = defaultdict(lambda: defaultdict(lambda: defaultdict(set))) 
        
    def is_free(self, day, start, duration, div, teachers=None, rooms=None, batches=None):
        for s in range(start, start + duration):
            if s == CONSTANTS['RECESS_INDEX']: return False
            if s >= 9: return False
            
            if div:
                if "BE" in div and (day == 4 or (day == 3 and start >= 5)): return False
                if "TE" in div and (day == 4 and start >= 5): return False

            # Batch/Div Collision
            if batches:
                current = self.div_batch_busy[day][s][div]
                if "ALL" in current: return False
                for b in batches:
                    if b in current: return False
            else:
                if self.div_batch_busy[day][s][div]: return False

            if teachers:
                for t in teachers:
                    if t and t.id != "-1" and t.id in self.grid[day][s]['teacher']: return False
            if rooms:
                for r in rooms:
                    if r != "Library" and r in self.grid[day][s]['room']: return False
        return True

    def book(self, gene, day, start, rooms, teachers):
        gene.day = day; gene.slot = start; gene.assigned_room = rooms
        for i in range(gene.duration):
            idx = start + i
            if gene.batch: self.div_batch_busy[day][idx][gene.div].add(gene.batch)
            elif gene.type in ["LAB_GROUP", "LAB_WHOLE"]: 
                for b in gene.lab_subjects: self.div_batch_busy[day][idx][gene.div].add(b)
            else: self.div_batch_busy[day][idx][gene.div].add("ALL")

            if teachers:
                for t in teachers:
                    if t and t.id != "-1":
                        self.grid[day][idx]['teacher'].add(t.id)
                        self.teacher_slots[t.id][day].append(idx)
            for r in rooms:
                if r != "Library": self.grid[day][idx]['room'].add(r)
            
            if gene.type == "THEORY": 
                self.theory_rooms_used[day][idx] += 1
                self.div_type_history[day][idx] = "THEORY"
            elif gene.type == "ELECTIVE": 
                self.theory_rooms_used[day][idx] += 2
                self.div_type_history[day][idx] = "THEORY"
            
            self.div_slots[gene.div][day].append(idx)

teachers_obj = {}
for tid, name in ALL_TEACHERS.items(): teachers_obj[tid] = Teacher(tid, name)

def distribute_workload():
    all_genes = []
    
    # 1. Theory
    for tid, subj, divs, count in THEORY_DATA:
        for div in divs:
            t = teachers_obj.get(tid)
            if t: t.assign_load(count)
            for _ in range(count):
                all_genes.append(Gene(div, "THEORY", subj, teacher=t))
                
    # 2. Electives
    for s1, tid1, s2, tid2, divs, count in ELECTIVE_DATA:
        for div in divs:
            t1 = teachers_obj.get(tid1); t2 = teachers_obj.get(tid2)
            if t1: t1.assign_load(count)
            if t2: t2.assign_load(count)
            for _ in range(count):
                g = Gene(div, "ELECTIVE", f"{s1} / {s2}", teachers_list=[t1, t2], duration=1)
                all_genes.append(g)
    
    # 3. LABS: INTELLIGENT GROUPING
    flat_tasks = []
    # Identify "Whole Class" tasks first
    for div, batches, subj, tid in LAB_TASKS_RAW:
        t = teachers_obj.get(tid)
        if t: t.assign_load(len(batches)*2) # Load approx
        
        # Check if this entry covers all 3 batches of a Div (A1,A2,A3 or B1,B2,B3 etc)
        # Note: SE-B batches are B1,B2,B3. The input might say ['B1','B2'] and another ['B3'].
        # We need to respect the list.
        
        # If the list has 3 batches (e.g. A1,A2,A3), we treat it as WHOLE class gene.
        if len(batches) >= 3:
             g = Gene(div, "LAB_WHOLE", subj, duration=2, lab_subjects=batches, teacher=t)
             all_genes.append(g)
        else:
             # Partial -> Add to pool for grouping
             for b in batches:
                 flat_tasks.append({'div': div, 'batch': b, 'sub': subj, 'teacher': t})
            
    div_tasks = defaultdict(list)
    for task in flat_tasks:
        div_tasks[task['div']].append(task)
        
    for div, tasks in div_tasks.items():
        batches = sorted(list(set(t['batch'] for t in tasks)))
        batch_queues = {b: [t for t in tasks if t['batch'] == b] for b in batches}
        
        while True:
            active_batches = [b for b in batches if batch_queues[b]]
            if not active_batches: break
            
            # Prioritize batch with most tasks
            primary_b = max(active_batches, key=lambda b: len(batch_queues[b]))
            primary_task = batch_queues[primary_b].pop(0)
            
            group = [primary_task]
            used_teachers = {primary_task['teacher'].id}
            
            # Try to fill from other batches
            for other_b in active_batches:
                if other_b == primary_b: continue
                
                found_idx = -1
                for i, candidate in enumerate(batch_queues[other_b]):
                    if candidate['teacher'].id not in used_teachers:
                        found_idx = i
                        break
                
                if found_idx != -1:
                    match = batch_queues[other_b].pop(found_idx)
                    group.append(match)
                    used_teachers.add(match['teacher'].id)
                    
            subs = [t['sub'] for t in group]
            ts = [t['teacher'] for t in group]
            bs = [t['batch'] for t in group]
            
            if len(group) >= 2: # Accept 2 or 3 as a Group
                g = Gene(div, "LAB_GROUP", "Lab Session", duration=2, 
                         lab_subjects=bs, teachers_list=ts)
                g.display_subs = subs
                all_genes.append(g)
            else:
                g = Gene(div, "LAB_SINGLE", "Lab Partial", duration=2, 
                         lab_subjects=bs, teachers_list=ts)
                g.display_subs = subs
                all_genes.append(g)

    # 4. Maths Tut (SE)
    t_math = teachers_obj['T22']
    for div in ['SE-A', 'SE-B', 'SE-C']:
        for b in ['A1','A2','A3','B1','B2','B3','C1','C2','C3']:
            if b.startswith(div.split('-')[1]):
                g = Gene(div, "MATHS_TUT", f"Maths Tut", duration=1, teacher=t_math, batch=b)
                all_genes.append(g)

    return all_genes

def get_theory_rooms(schedule, day, slot, div, count=1):
    available = []
    home = HOME_ROOMS.get(div)
    if home and schedule.is_free(day, slot, 1, None, rooms=[home]):
        available.append(home)
    pool = list(CONSTANTS['THEORY_ROOMS'])
    random.shuffle(pool)
    for r in pool:
        if r != home and schedule.is_free(day, slot, 1, None, rooms=[r]):
            available.append(r)
            if len(available) == count: return available
    if len(available) == count: return available
    return None

def get_lab_rooms(schedule, day, start, count):
    pool = list(CONSTANTS['LAB_ROOMS'])
    random.shuffle(pool)
    found = []
    for r in pool:
        if schedule.is_free(day, start, 2, None, rooms=[r]):
            found.append(r)
            if len(found) == count: return found
    return None

def check_soft_constraints(schedule, div, day, slot, gene):
    cost = 0
    if gene.type == "ELECTIVE" and slot > 1: return 10000 
    if gene.type == "MATHS_TUT":
        if slot < 6: return 10000 
        if slot == 8: cost -= 500
    
    if gene.type == "LAB_SINGLE":
        if slot < 5: return 5000 
    
    if gene.type in ["THEORY", "ELECTIVE"]:
        prev1 = slot - 1
        prev2 = slot - 2
        if prev1 == CONSTANTS['RECESS_INDEX']: prev1 -= 1; prev2 -= 1
        elif prev2 == CONSTANTS['RECESS_INDEX']: prev2 -= 1
        
        if prev1 >= 0 and prev2 >= 0:
            type1 = schedule.div_type_history[day][prev1]
            type2 = schedule.div_type_history[day][prev2]
            if type1 == "THEORY" and type2 == "THEORY":
                return 10000 # HARD REJECT
    
    if gene.type in ["LAB_GROUP", "LAB_SINGLE", "LAB_WHOLE"]:
        bias = LAB_BIAS.get(div, "Afternoon")
        is_morning = slot < 4
        if bias == "Afternoon" and is_morning: cost += 2000
        if bias == "Morning" and not is_morning: cost += 2000

    return cost

def run_solver(iterations=5000):
    print("--- Starting Final Solver (Optimized) ---")
    base_genes = distribute_workload()
    best_fitness = -float('inf')
    best_sched = None
    
    base_genes.sort(key=lambda x: (
        x.type != "ELECTIVE", 
        x.type != "MATHS_TUT",
        x.type != "LAB_WHOLE",
        x.type != "LAB_GROUP",
        x.type != "LAB_SINGLE"
    ))

    for run in range(iterations):
        all_genes = copy.deepcopy(base_genes)
        schedule = Schedule(all_genes)
        unplaced = []
        
        for g in all_genes:
            placed = False
            best_local_cost = float('inf')
            best_move = None
            
            possible_slots = [0, 1, 2, 5, 6, 7] if "LAB" in g.type else [0, 1, 2, 3, 5, 6, 7, 8]
            days = list(range(5)); random.shuffle(days)
            
            for d in days:
                for s in possible_slots:
                    ts = g.teachers_list if g.teachers_list else [g.teacher]
                    batches = g.lab_subjects if "LAB" in g.type else ([g.batch] if g.batch else None)
                    
                    valid_ts = [t for t in ts if t]
                    if not schedule.is_free(d, s, g.duration, g.div, teachers=valid_ts, batches=batches): 
                        continue
                    
                    rooms_to_book = []
                    if g.type == "THEORY":
                        if schedule.theory_rooms_used[d][s] >= 5: continue
                        rooms = get_theory_rooms(schedule, d, s, g.div, 1)
                        if rooms: rooms_to_book = rooms
                    elif g.type == "ELECTIVE":
                        if schedule.theory_rooms_used[d][s] >= 4: continue
                        rooms = get_theory_rooms(schedule, d, s, g.div, 2)
                        if rooms: rooms_to_book = rooms
                    elif g.type == "MATHS_TUT":
                        if schedule.is_free(d, s, 1, None, rooms=[CONSTANTS['MATHS_LAB']]):
                            rooms_to_book = [CONSTANTS['MATHS_LAB']]
                    elif "LAB" in g.type:
                        rooms = get_lab_rooms(schedule, d, s, len(valid_ts))
                        if rooms: rooms_to_book = rooms
                    
                    if not rooms_to_book: continue
                    
                    cost = check_soft_constraints(schedule, g.div, d, s, g)
                    if cost >= 10000: continue
                    
                    if cost < best_local_cost:
                        best_local_cost = cost
                        best_move = (d, s, rooms_to_book)
                        if cost <= -1000: break 
                if best_move and best_local_cost <= -1000: break
            
            if best_move:
                d, s, rms = best_move
                ts = g.teachers_list if g.teachers_list else [g.teacher]
                schedule.book(g, d, s, rms, ts)
                placed = True
            else:
                unplaced.append(g)
        
        score = 10000 - (len(unplaced) * 5000)
        if score > best_fitness:
            best_fitness = score
            best_sched = schedule
            print(f"Run {run}: Score {score} (Unplaced: {len(unplaced)})")
            if len(unplaced) == 0: break
            
    return best_sched

def generate_html(schedule):
    if not schedule: return
    html = """<html><head><style>
        body { font-family: 'Segoe UI', sans-serif; background: #f4f6f8; padding: 20px; }
        .div-container { background: white; margin-bottom: 40px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); overflow: hidden; }
        h2 { background: #1a237e; color: white; margin: 0; padding: 15px; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th { background: #3949ab; color: white; padding: 10px; font-size: 12px; }
        td { border: 1px solid #e0e0e0; height: 100px; vertical-align: top; padding: 0; font-size: 11px; }
        .cell-inner { padding: 5px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; }
        .room { font-weight: bold; color: #d81b60; font-size: 10px; }
        .elective-tag { font-size: 9px; color: #c2185b; font-weight: bold; }
        .blocked { background: #e0e0e0; }
        .lab-item { border-bottom: 1px solid #eee; margin-bottom: 2px; font-size: 10px; }
        .break { writing-mode: vertical-rl; text-align: center; background: #eceff1; font-weight: bold; color: #78909c; }
    </style></head><body>"""
    
    divisions = sorted(list(set([g.div for g in schedule.genes])))
    for div in divisions:
        html += f"<div class='div-container'><h2>Division: {div}</h2><table><thead><tr><th>Day</th>"
        for s in CONSTANTS['SLOTS']: html += f"<th>{s.split(' ')[0]}</th>"
        html += "</tr></thead><tbody>"
        for day in range(5):
            html += f"<tr><td style='text-align:center; font-weight:bold; background:#e8eaf6'>{CONSTANTS['DAYS'][day]}</td>"
            for slot in range(9):
                if slot == CONSTANTS['RECESS_INDEX']:
                    html += "<td class='break'>RECESS</td>"; continue
                
                if "BE" in div and (day == 4 or (day == 3 and slot >= 5)):
                    html += "<td class='blocked'></td>"; continue
                if "TE" in div and (day == 4 and slot >= 5):
                    html += "<td class='blocked'></td>"; continue

                found_genes = []
                for g in schedule.genes:
                    if g.day == day and g.div == div and g.slot <= slot < g.slot + g.duration:
                        found_genes.append(g)
                
                if not found_genes:
                    html += "<td></td>"; continue
                
                starts_here = [g for g in found_genes if g.slot == slot]
                if not starts_here: continue 

                max_duration = max([g.duration for g in starts_here])
                rowspan = f" colspan='{max_duration}'" if max_duration > 1 else ""
                
                content = "<div class='cell-inner'>"
                theories = [g for g in starts_here if g.type in ["THEORY", "ELECTIVE"]]
                labs = [g for g in starts_here if g.type in ["LAB_GROUP", "LAB_SINGLE", "LAB_WHOLE", "MATHS_TUT"]]
                
                if theories:
                    g = theories[0]
                    color = "#e3f2fd" if g.type == "THEORY" else "#fce4ec"
                    if g.type == "THEORY":
                        content += f"<b>{g.subject}</b><br>{g.teacher.name}<br><span class='room'>[{g.assigned_room[0]}]</span>"
                    else:
                        subs = g.subject.split('/')
                        ts = g.teachers_list
                        rs = g.assigned_room
                        content += f"<span class='elective-tag'>(ELECTIVE)</span><br><b>{subs[0]}</b> ({ts[0].name}) [{rs[0]}]<hr><b>{subs[1]}</b> ({ts[1].name}) [{rs[1]}]"
                elif labs:
                    color = "#fff3e0"
                    for g in labs:
                        if g.type == "MATHS_TUT":
                            content += f"<div class='lab-item' style='color:#d84315;'><b>{g.batch}:</b> {g.subject}<br>{g.teacher.name} [{g.assigned_room[0]}]</div>"
                        elif g.type == "LAB_WHOLE":
                            content += f"<div class='lab-item'><b>ALL:</b> {g.subject}<br>{g.teacher.name} [{g.assigned_room[0]}]</div>"
                        else: 
                            for i in range(len(g.teachers_list)):
                                sub_name = g.display_subs[i]
                                t_name = g.teachers_list[i].name
                                b_name = g.lab_subjects[i]
                                r_name = g.assigned_room[i]
                                content += f"<div class='lab-item'><b>{b_name}:</b> {sub_name}<br>{t_name} [{r_name}]</div>"
                
                content += "</div>"
                html += f"<td{rowspan} style='background:{color}'>{content}</td>"
            html += "</tr>"
        html += "</tbody></table></div>"
    
    with open("timetable_v14_final.html", "w") as f: f.write(html)
    return os.path.abspath("timetable_v14_final.html")

if __name__ == "__main__":
    best = run_solver(5000)
    if best:
        path = generate_html(best)
        webbrowser.open('file://' + path)
    else:
        print("Failed to generate a valid schedule.")