export const ui = {
  tab: 'train',
  summary: null,
  exerciseId: null,
  sessionId: null,
  progressMode: 'exercises',
  editingWorkoutId: null,
};

let renderer = () => {};
export const setRenderer = fn => { renderer = fn; };
export const render = () => renderer();

export function navigate(changes) {
  Object.assign(ui, changes);
  render();
  window.scrollTo(0, 0);
}
