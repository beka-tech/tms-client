export interface Assessment {
  id: number;
  title: string;
  weight: number;
  type: 'Assignment' | 'Quiz' | 'Midterm' | 'Final' | 'Project';
}

export interface TrainingCourse {
  id: number;
  code: string;
  title: string;
  capacity: number;
  enrollmentCount?: number;
  assessments: readonly Assessment[];
}

export interface CourseDraft {
  code: string;
  title: string;
  capacity: number;
}
