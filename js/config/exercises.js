export const MUSCLE_GROUPS = {
  chest: 'Peito',
  back: 'Costas',
  shoulders: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  legs: 'Pernas',
  core: 'Abdômen',
  other: 'Outros',
};

// imageId points to the photo pair shipped in img/ (free-exercise-db, public domain).
export const EXERCISES = {
  bench: { name: 'Supino reto com barra', group: 'chest', imageId: 'Barbell_Bench_Press_-_Medium_Grip' },
  inclineDumbbell: { name: 'Supino inclinado com halteres', group: 'chest', imageId: 'Incline_Dumbbell_Press' },
  crossover: { name: 'Crossover', group: 'chest', imageId: 'Cable_Crossover' },
  dips: { name: 'Paralelas', group: 'chest', imageId: 'Dips_-_Chest_Version' },
  tricepsRope: { name: 'Tríceps corda', group: 'triceps', imageId: 'Triceps_Pushdown_-_Rope_Attachment' },
  tricepsFrench: { name: 'Tríceps francês', group: 'triceps', imageId: 'Seated_Triceps_Press' },
  pullup: { name: 'Barra fixa / Puxada frontal', group: 'back', imageId: 'Pullups' },
  barbellRow: { name: 'Remada curvada', group: 'back', imageId: 'Bent_Over_Barbell_Row' },
  dumbbellRow: { name: 'Remada unilateral', group: 'back', imageId: 'One-Arm_Dumbbell_Row' },
  straightArmPulldown: { name: 'Pulldown braço estendido', group: 'back', imageId: 'Straight-Arm_Pulldown' },
  barbellCurl: { name: 'Rosca direta', group: 'biceps', imageId: 'Barbell_Curl' },
  hammerCurl: { name: 'Rosca martelo', group: 'biceps', imageId: 'Hammer_Curls' },
  squat: { name: 'Agachamento livre / Hack', group: 'legs', imageId: 'Barbell_Full_Squat' },
  romanianDeadlift: { name: 'Stiff (terra romeno)', group: 'legs', imageId: 'Romanian_Deadlift' },
  dumbbellStiff: { name: 'Stiff com halteres', group: 'legs', imageId: 'Stiff-Legged_Dumbbell_Deadlift' },
  deadlift: { name: 'Levantamento terra', group: 'legs', imageId: 'Barbell_Deadlift' },
  legPress: { name: 'Leg press', group: 'legs', imageId: 'Leg_Press' },
  legCurl: { name: 'Mesa flexora', group: 'legs', imageId: 'Lying_Leg_Curls' },
  shoulderPress: { name: 'Desenvolvimento com halteres', group: 'shoulders', imageId: 'Dumbbell_Shoulder_Press' },
  lateralRaise: { name: 'Elevação lateral', group: 'shoulders', imageId: 'Side_Lateral_Raise' },
  calfRaise: { name: 'Panturrilha em pé', group: 'legs', imageId: 'Standing_Calf_Raises' },
  plank: { name: 'Prancha', group: 'core', imageId: 'Plank', repsLabel: 'seg' },
};

export const DEFAULT_PLAN = Object.freeze({ sets: 3, reps: '8–12', rest: 90 });

export const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
