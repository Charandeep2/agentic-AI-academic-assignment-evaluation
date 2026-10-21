/**
 * Course Credit & Dynamic Evaluation Scheme Utilities
 * Supports custom teacher-defined evaluation criteria with any number of components.
 */

export interface EvaluationComponent {
  id: string;
  name: string;
  weight: number; // Percentage (e.g. 40, 30, 20, 15, 10)
  description?: string;
}

/**
 * Standard Fallback Presets
 */
export const EVALUATION_PRESETS: Record<string, EvaluationComponent[]> = {
  academic_standard: [
    { id: 'end_term', name: 'End-Term Examination', weight: 40 },
    { id: 'mid_term', name: 'Mid-Term Examination', weight: 30 },
    { id: 'quizzes', name: 'Quizzes & Tests', weight: 15 },
    { id: 'labs', name: 'Labs & Practical Coursework', weight: 15 },
  ],
  project_and_viva: [
    { id: 'end_term', name: 'End-Term Examination', weight: 30 },
    { id: 'mid_term', name: 'Mid-Term Examination', weight: 20 },
    { id: 'project', name: 'Final Capstone Project', weight: 20 },
    { id: 'quizzes', name: 'Quizzes & Tests', weight: 15 },
    { id: 'labs', name: 'Labs & Practical Coursework', weight: 15 },
  ],
  continuous_assessment: [
    { id: 'end_term', name: 'End-Term Examination', weight: 25 },
    { id: 'mid_term', name: 'Mid-Term Examination', weight: 25 },
    { id: 'quizzes', name: 'Quizzes & Tests', weight: 25 },
    { id: 'assignments', name: 'Assignments & Coursework', weight: 25 },
  ],
  theory_project_attendance: [
    { id: 'end_term', name: 'End-Term Examination', weight: 35 },
    { id: 'mid_term', name: 'Mid-Term Examination', weight: 25 },
    { id: 'project', name: 'Project & Viva Voce', weight: 20 },
    { id: 'quizzes', name: 'Quizzes & Assessments', weight: 10 },
    { id: 'participation', name: 'Participation & Attendance', weight: 10 },
  ],
};

/**
 * Extract and normalize the evaluation scheme for ANY course.
 * Handles both new dynamic `evaluationScheme` array and legacy `gradingWeights` dictionary.
 */
export function getCourseEvaluationScheme(classInfo: any): EvaluationComponent[] {
  if (Array.isArray(classInfo?.evaluationScheme) && classInfo.evaluationScheme.length > 0) {
    return classInfo.evaluationScheme.map((item: any, idx: number) => ({
      id: item.id || `eval-${idx}-${item.name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'comp'}`,
      name: item.name || `Component ${idx + 1}`,
      weight: Number(item.weight) || 0,
      description: item.description,
    }));
  }

  // Fallback to gradingWeights dictionary
  const weights = classInfo?.gradingWeights || { endTerm: 40, midTerm: 30, quizzes: 15, labs: 15 };
  const components: EvaluationComponent[] = [];

  if (weights.endTerm !== undefined) {
    components.push({ id: 'end_term', name: 'End-Term Examination', weight: Number(weights.endTerm) });
  }
  if (weights.midTerm !== undefined) {
    components.push({ id: 'mid_term', name: 'Mid-Term Examination', weight: Number(weights.midTerm) });
  }
  if (weights.quizzes !== undefined) {
    components.push({ id: 'quizzes', name: 'Quizzes & Tests', weight: Number(weights.quizzes) });
  }
  if (weights.labs !== undefined) {
    components.push({ id: 'labs', name: 'Labs & Practical Coursework', weight: Number(weights.labs) });
  }

  // Capture any custom keys present in gradingWeights
  Object.entries(weights).forEach(([key, val]) => {
    if (!['endTerm', 'midTerm', 'quizzes', 'labs'].includes(key)) {
      const formattedName = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
      components.push({
        id: key,
        name: formattedName,
        weight: Number(val) || 0,
      });
    }
  });

  return components.length > 0 ? components : EVALUATION_PRESETS.academic_standard;
}

/**
 * Intelligently match an assignment or quiz to one of the course's evaluation components.
 */
export function matchAssignmentToComponent(
  assignment: any,
  components: EvaluationComponent[]
): EvaluationComponent {
  if (!components || components.length === 0) {
    return { id: 'general', name: 'General Coursework', weight: 100 };
  }

  // 1. Direct tag on assignment
  if (assignment?.evaluationCategoryId) {
    const found = components.find((c) => c.id === assignment.evaluationCategoryId);
    if (found) return found;
  }
  if (assignment?.evaluationCategory) {
    const found = components.find(
      (c) =>
        c.id === assignment.evaluationCategory ||
        c.name.toLowerCase() === String(assignment.evaluationCategory).toLowerCase()
    );
    if (found) return found;
  }

  const title = (assignment?.title || '').toLowerCase();
  const type = (assignment?.assignmentType || assignment?.submissionFormat || assignment?.type || '').toLowerCase();

  // 2. Quiz matching
  if (type === 'quiz' || title.includes('quiz') || title.includes('mcq') || title.includes('pop quiz')) {
    const quizComp = components.find(
      (c) => c.id === 'quizzes' || c.name.toLowerCase().includes('quiz') || c.name.toLowerCase().includes('test')
    );
    if (quizComp) return quizComp;
  }

  // 3. End-term / Final matching
  if (
    type === 'end_term' ||
    title.includes('end term') ||
    title.includes('end-term') ||
    title.includes('final exam') ||
    title.includes('final test')
  ) {
    const endComp = components.find(
      (c) => c.id === 'end_term' || c.name.toLowerCase().includes('end') || c.name.toLowerCase().includes('final')
    );
    if (endComp) return endComp;
  }

  // 4. Mid-term matching
  if (
    type === 'mid_term' ||
    title.includes('mid term') ||
    title.includes('midterm') ||
    title.includes('mid-term')
  ) {
    const midComp = components.find(
      (c) => c.id === 'mid_term' || c.name.toLowerCase().includes('mid')
    );
    if (midComp) return midComp;
  }

  // 5. Project / Capstone / Paper matching
  if (
    type === 'project' ||
    title.includes('project') ||
    title.includes('capstone') ||
    title.includes('term paper') ||
    title.includes('mini-project')
  ) {
    const projComp = components.find(
      (c) =>
        c.name.toLowerCase().includes('project') ||
        c.name.toLowerCase().includes('capstone') ||
        c.name.toLowerCase().includes('paper')
    );
    if (projComp) return projComp;
  }

  // 6. Viva Voce / Oral Defense / Presentation matching
  if (
    type === 'viva' ||
    title.includes('viva') ||
    title.includes('oral') ||
    title.includes('defense') ||
    title.includes('presentation')
  ) {
    const vivaComp = components.find(
      (c) =>
        c.name.toLowerCase().includes('viva') ||
        c.name.toLowerCase().includes('oral') ||
        c.name.toLowerCase().includes('presentation')
    );
    if (vivaComp) return vivaComp;
  }

  // 7. Match any component name in title
  for (const comp of components) {
    const compLower = comp.name.toLowerCase();
    if (title.includes(compLower) || compLower.includes(title)) {
      return comp;
    }
  }

  // 8. Labs & Practical Coursework
  const labComp = components.find(
    (c) =>
      c.id === 'labs' ||
      c.name.toLowerCase().includes('lab') ||
      c.name.toLowerCase().includes('practical') ||
      c.name.toLowerCase().includes('coursework') ||
      c.name.toLowerCase().includes('assignment')
  );
  if (labComp) return labComp;

  // Fallback to the first non-exam component, or first component
  return components.find((c) => !c.id.includes('end') && !c.id.includes('mid')) || components[0];
}

