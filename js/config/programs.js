export const planItem = (exerciseId, sets, reps, rest) => ({ exerciseId, sets, reps, rest });

export const PROGRAMS = [
  {
    id: 'abc', name: 'ABC', workouts: [
      { id: 'abc-a', tag: 'A', name: 'Peito + Tríceps', items: [
        planItem('bench', 4, '6–8', 150), planItem('inclineDumbbell', 3, '8–10', 120), planItem('crossover', 3, '12–15', 60),
        planItem('dips', 3, '8–12', 90), planItem('tricepsRope', 3, '10–12', 60), planItem('tricepsFrench', 3, '10–12', 60),
      ] },
      { id: 'abc-b', tag: 'B', name: 'Costas + Bíceps', items: [
        planItem('pullup', 4, '6–10', 120), planItem('barbellRow', 4, '8–10', 120), planItem('dumbbellRow', 3, '10–12', 90),
        planItem('straightArmPulldown', 2, '12–15', 60), planItem('barbellCurl', 3, '8–10', 60), planItem('hammerCurl', 3, '10–12', 60),
      ] },
      { id: 'abc-c', tag: 'C', name: 'Pernas + Ombro', items: [
        planItem('squat', 4, '6–8', 150), planItem('romanianDeadlift', 3, '8–10', 120), planItem('legPress', 3, '10–12', 120),
        planItem('legCurl', 3, '10–12', 60), planItem('shoulderPress', 3, '8–10', 90), planItem('lateralRaise', 3, '12–15', 60),
        planItem('calfRaise', 3, '12–15', 60),
      ] },
    ],
  },
  {
    id: 'fullbody', name: 'Full Body', workouts: [
      { id: 'fb-a', tag: 'A', name: 'Full Body A', items: [
        planItem('squat', 4, '6–8', 150), planItem('bench', 4, '6–8', 150), planItem('barbellRow', 3, '8–10', 120),
        planItem('dumbbellStiff', 3, '8–10', 120), planItem('shoulderPress', 3, '8–12', 90), planItem('barbellCurl', 2, '10–12', 60),
        planItem('plank', 3, '30–45', 60),
      ] },
      { id: 'fb-b', tag: 'B', name: 'Full Body B', items: [
        planItem('deadlift', 3, '5–6', 180), planItem('inclineDumbbell', 4, '8–10', 120), planItem('pullup', 4, '8–10', 120),
        planItem('legPress', 3, '10–12', 120), planItem('lateralRaise', 3, '12–15', 60), planItem('tricepsRope', 2, '10–12', 60),
        planItem('calfRaise', 3, '12–15', 60),
      ] },
    ],
  },
];

export const WORKOUTS = Object.fromEntries(
  PROGRAMS.flatMap(program => program.workouts.map(workout => [workout.id, { ...workout, programName: program.name }]))
);
