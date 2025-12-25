# Timetable Algorithm Constraints

## Hard Constraints
- Teacher no double-booking across divisions/years at the same timeslot (global check; heavy penalty).
- Room/Lab no double-booking at the same timeslot within a division and across years.
- Student no overlapping sessions within the same division/batch at the same timeslot.
- Labs scheduled as contiguous 2-hour blocks (two consecutive timeslots).
- Project work scheduled as a contiguous half-day block on the preferred day; no teacher assigned during project time; no regular classes overlap that half-day for that year’s divisions.
- No sessions scheduled during lunch/recess window.
- Subject sessions-per-week requirements must be satisfied for each subject/division.
- Room/Lab capacity must meet or exceed student count for the assigned division/batch.
- Timeslot uniqueness per day enforced by model (`day`, `slot_number`) combination.
- Labs must be scheduled in `Lab` rooms; lectures in regular `Room` rooms.
- One session per division per timeslot (no multi-occupancy of a single division slot).
- Cross-year teacher conflicts prevented (teacher cannot be in two years/divisions at the same time).

## Soft Constraints
- Teacher time preferences (morning/afternoon) respected; violations penalized.
- Teacher–subject proficiency matching favored; low proficiency penalized, very high proficiency rewarded slightly.
- Workload balancing across teachers (avoid over/under allocation beyond configured tolerance).
- Schedule gap minimization for divisions (avoid isolated hours, unnecessary gaps).
- Morning/afternoon distribution balance (guided by configuration, treated as optimization rather than strict).
- Stable room usage preference (reduce unnecessary room changes when alternatives exist).
- Avoid back-to-back same subject unless configured as a double period.
- Limit excessive consecutive hours for teachers; prefer reasonable breaks.
- Spread sessions across days to avoid clustering heavy loads on a single day.

## Penalty Weights (Representative)
- User-driven algorithm (primary):
  - Teacher conflicts: very high penalty per duplicate timeslot.
  - Room conflicts: high penalty per duplicate timeslot.
  - Lab continuity violations: heavy penalty when not consecutive 2-hour blocks.
  - Project block violations: penalty when half-day continuity is broken.
  - Recess violations: penalty per session scheduled in recess.
  - Proficiency < threshold: scaled penalty; ≥8 grants small bonus.
  - Time preference violations: +20 each.
  - Capacity violations: penalty when capacity < student_count.
  - Workload imbalance and schedule gaps: optimization penalties.
- Division-specific algorithm (fallback):
  - Teacher conflicts (within division): +(count-1)*20.
  - Room conflicts (within division): +(count-1)*15.
  - Student conflicts (within division): +(count-1)*25.
  - Cross-division teacher conflicts: +30 per clash.
  - Missing subject sessions: +(required-count)*5.
  - Very low proficiency (<5): +3 per assignment.

## Notes
- Project blocks reserve rooms but do not reserve teachers; teachers remain available during project time.
- Equipment requirements exist in data models; current scheduling focuses on capacity/time/conflict constraints. Equipment matching can be added if required.
- Semester parity (odd/even) selection is a UI configuration; year selection is independent of parity. Generation uses explicitly selected years.

## Implementation References
- Teacher conflicts: `timetable_generator/timetable_app/user_driven_timetable_algorithm_FIXED.py:447`
- Room conflicts: `timetable_generator/timetable_app/user_driven_timetable_algorithm_FIXED.py:468`
- Student conflicts: `timetable_generator/timetable_app/user_driven_timetable_algorithm_FIXED.py:485`
- Recess exclusion: `timetable_generator/timetable_app/user_driven_timetable_algorithm_FIXED.py:501`
- Lab continuity (2-hour): `timetable_generator/timetable_app/user_driven_timetable_algorithm_FIXED.py:514`
- Project half-day blocks: `timetable_generator/timetable_app/user_driven_timetable_algorithm_FIXED.py:541`
- Capacity checks: `timetable_generator/timetable_app/user_driven_timetable_algorithm_FIXED.py:568`
- Teacher time preferences: `timetable_generator/timetable_app/user_driven_timetable_algorithm_FIXED.py:421`
- Workload balance: `timetable_generator/timetable_app/user_driven_timetable_algorithm_FIXED.py:605`
- Schedule gaps: `timetable_generator/timetable_app/user_driven_timetable_algorithm_FIXED.py:627`
- Cross-year conflicts report: `timetable_generator/timetable_app/user_driven_timetable_algorithm_FIXED.py:286`
