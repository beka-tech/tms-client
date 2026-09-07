export interface Student {
  id: number;
  registrationNumber: string;
  name: string;
  gpa: number;
  active: boolean;
}

export type StudentDraft = Omit<Student, 'id'>;
