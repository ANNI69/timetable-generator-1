import { TimetableGenerator } from '@/components/timetable/TimetableGenerator';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Academic Timetable Generator | Engineering College Scheduling System</title>
        <meta 
          name="description" 
          content="Generate optimized timetables for engineering colleges with our sophisticated scheduling system. Supports multiple departments, faculty allocation, and constraint-based optimization." 
        />
      </Helmet>
      <TimetableGenerator />
    </>
  );
};

export default Index;
