let seq = 0;
export const key = () => `k${Date.now().toString(36)}${(seq += 1)}`;

/** Normalise an API plan/template into builder state (adds client-side keys). */
export function toBuilderDays(days = []) {
  return days.map((d) => ({
    _key: key(), id: d.id, name: d.name, day_of_week: d.day_of_week ?? null, focus: d.focus || '',
    exercises: (d.exercises || []).map((e) => ({ _key: key(), ...e })),
  }));
}
export function exerciseFromMaster(ex) {
  return {
    _key: key(), exercise_id: ex.id, exercise_name: ex.name, muscle_group: ex.primary_muscle, category: ex.category, equipment: ex.equipment,
    instructions: ex.instructions, video_url: ex.video_url, image_url: ex.image_url, exercise_type: ex.exercise_type,
    sets: ex.default_sets ?? 3, reps: ex.default_reps ?? (ex.exercise_type === 'time' ? null : '10'), duration_sec: ex.default_duration_sec ?? null,
    weight_kg: null, rest_sec: ex.default_rest_sec ?? 60, tempo: '', notes: '',
  };
}
/** Strip UI-only fields for the API payload. */
export function toPayloadDays(days) {
  const n = (v) => (v === '' || v === undefined ? null : v);
  return days.map((d) => ({
    ...(d.id ? { id: d.id } : {}), name: d.name, day_of_week: d.day_of_week || null, focus: n(d.focus),
    exercises: d.exercises.map((e) => ({
      ...(e.id ? { id: e.id } : {}), exercise_id: e.exercise_id, sets: n(e.sets), reps: n(e.reps), duration_sec: n(e.duration_sec),
      weight_kg: n(e.weight_kg), rest_sec: n(e.rest_sec), tempo: n(e.tempo), notes: n(e.notes),
    })),
  }));
}
/** Rough session length in minutes: work (≈40s per rep-set or the set duration) + rest. */
export function estimateMinutes(exercises = []) {
  const sec = exercises.reduce((a, e) => {
    const sets = Number(e.sets) || 1;
    const work = Number(e.duration_sec) || 40;
    return a + sets * work + Math.max(0, sets - 1) * (Number(e.rest_sec) || 0) + 60;
  }, 0);
  return Math.round(sec / 60);
}
export const move = (arr, from, to) => { const a = [...arr]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };
