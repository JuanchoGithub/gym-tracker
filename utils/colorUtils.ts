
import { BodyPart, ExerciseCategory } from '../types';

export const getBodyPartColor = (bodyPart: BodyPart): string => {
  const colors: Record<BodyPart, string> = {
    'Chest': 'bg-pink-500/20 text-pink-400',
    'Back': 'bg-red-500/20 text-red-400',
    'Legs': 'bg-blue-500/20 text-blue-400',
    'Glutes': 'bg-orange-500/20 text-orange-400',
    'Shoulders': 'bg-purple-500/20 text-purple-400',
    'Biceps': 'bg-amber-400/20 text-amber-300',
    'Triceps': 'bg-yellow-400/20 text-yellow-300',
    'Core': 'bg-green-500/20 text-green-400',
    'Full Body': 'bg-slate-500/20 text-slate-400',
    'Calves': 'bg-cyan-500/20 text-cyan-400',
    'Forearms': 'bg-lime-500/20 text-lime-400',
    'Mobility': 'bg-teal-500/20 text-teal-400',
    'Cardio': 'bg-rose-500/20 text-rose-400',
  };
  return colors[bodyPart] || 'bg-gray-500/20 text-gray-400';
};

export const getCategoryColor = (category: ExerciseCategory): string => {
  const colors: Record<ExerciseCategory, string> = {
    'Barbell': 'bg-gray-500/20 text-gray-400',
    'Dumbbell': 'bg-slate-500/20 text-slate-400',
    'Machine': 'bg-indigo-500/20 text-indigo-400',
    'Cable': 'bg-sky-500/20 text-sky-400',
    'Bodyweight': 'bg-emerald-500/20 text-emerald-400',
    'Assisted Bodyweight': 'bg-teal-500/20 text-teal-400',
    'Kettlebell': 'bg-fuchsia-500/20 text-fuchsia-400',
    'Plyometrics': 'bg-violet-500/20 text-violet-400',
    'Reps Only': 'bg-stone-500/20 text-stone-400',
    'Cardio': 'bg-rose-500/20 text-rose-400',
    'Duration': 'bg-cyan-500/20 text-cyan-400',
    'Smith Machine': 'bg-gray-400/20 text-gray-300',
  };
  return colors[category] || 'bg-gray-500/20 text-gray-400';
};