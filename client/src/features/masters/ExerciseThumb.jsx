import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import BoltIcon from '@mui/icons-material/Bolt';
import SportsGymnasticsIcon from '@mui/icons-material/SportsGymnastics';
import AdjustIcon from '@mui/icons-material/Adjust';
import SpaIcon from '@mui/icons-material/Spa';
import { assetUrl } from '../../api/http';
import './masters.css';

const CAT = {
  Strength: { icon: FitnessCenterIcon, color: '#1565C0' }, Cardio: { icon: DirectionsRunIcon, color: '#EF6C00' },
  Mobility: { icon: AccessibilityNewIcon, color: '#00897B' }, Flexibility: { icon: SelfImprovementIcon, color: '#6A1B9A' },
  Core: { icon: AdjustIcon, color: '#0277BD' }, HIIT: { icon: BoltIcon, color: '#C62828' }, Functional: { icon: SportsGymnasticsIcon, color: '#2E7D32' },
  Yoga: { icon: SpaIcon, color: '#D81B60' },
};
export const categoryStyle = (c) => CAT[c] || CAT.Strength;

/** Exercise image, or a category-coloured icon tile when no image is set. Styles: masters.css (.exercise-thumb) */
export default function ExerciseThumb({ category, image, size = 40 }) {
  const s = categoryStyle(category);
  const key = CAT[category] ? category.toLowerCase() : 'strength';
  const vars = { '--thumb-size': `${size}px` };
  if (image) return <img src={assetUrl(image)} alt="" className="exercise-thumb exercise-thumb--image" style={vars} />;
  return (
    <span className={`exercise-thumb exercise-thumb--${key}`} style={vars} aria-hidden>
      <s.icon />
    </span>
  );
}
