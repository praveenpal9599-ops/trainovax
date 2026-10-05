import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import ContactEmergencyOutlinedIcon from '@mui/icons-material/ContactEmergencyOutlined';
import SectionCard from '../../../components/common/SectionCard';
import InfoRow from '../../../components/common/InfoRow';
import { ACTIVITY_LEVELS, DIET_PREFS, DIFFICULTIES, GENDERS, GOALS, WORKOUT_TIMES, labelOf } from '../../../utils/constants';
import { formatDate, num } from '../../../utils/format';
import './InfoTabs.css';

export function PersonalTab({ client }) {
  const p = client.profile || {};
  return (
    <div className="client-info">
      <SectionCard title="Personal information">
        <InfoRow icon={PhoneOutlinedIcon} label="Phone" value={client.phone} />
        <InfoRow icon={EmailOutlinedIcon} label="Email" value={client.email} />
        <InfoRow icon={CakeOutlinedIcon} label="Age / date of birth" value={`${client.age ?? '—'} yrs${p.date_of_birth ? ` · ${formatDate(p.date_of_birth)}` : ''}`} />
        <InfoRow label="Gender" value={labelOf(GENDERS, client.gender)} />
        <InfoRow icon={WorkOutlineIcon} label="Occupation" value={p.occupation} />
        <InfoRow icon={HomeOutlinedIcon} label="Address" value={p.address} />
      </SectionCard>
      <SectionCard title="Membership & emergency">
        <InfoRow label="Client since" value={formatDate(client.joined_on)} />
        <InfoRow label="Trainer" value={client.trainer_name || 'Unassigned'} />
        <InfoRow label="Organization" value={client.organization_name} />
        <InfoRow label="App access" value={client.user_id ? 'Has client app login' : 'No login yet'} />
        <InfoRow icon={ContactEmergencyOutlinedIcon} label="Emergency contact" value={p.emergency_contact_name ? `${p.emergency_contact_name} · ${p.emergency_contact_phone || ''}` : null} />
      </SectionCard>
    </div>
  );
}

export function FitnessTab({ client }) {
  const p = client.profile || {};
  return (
    <div className="client-info">
      <SectionCard title="Goals & training">
        <InfoRow label="Fitness goal" value={labelOf(GOALS, client.fitness_goal)} />
        <InfoRow label="Height" value={client.height_cm ? `${num(client.height_cm, 0)} cm` : null} />
        <InfoRow label="Starting → current weight" value={`${num(client.stats.starting_weight_kg)} kg → ${num(client.stats.current_weight_kg)} kg`} />
        <InfoRow label="Target weight" value={p.target_weight_kg ? `${num(p.target_weight_kg)} kg` : null} />
        <InfoRow label="Training experience" value={labelOf(DIFFICULTIES, p.experience_level)} />
        <InfoRow label="Activity level" value={labelOf(ACTIVITY_LEVELS, p.activity_level)} />
        <InfoRow label="Workout days / week" value={p.workout_days_per_week} />
        <InfoRow label="Preferred time" value={labelOf(WORKOUT_TIMES, p.preferred_workout_time)} />
      </SectionCard>
      <SectionCard title="Health & lifestyle">
        <InfoRow label="Dietary preference" value={labelOf(DIET_PREFS, p.dietary_preference)} />
        <InfoRow label="Medical conditions" value={p.medical_conditions || 'None reported'} />
        <InfoRow label="Injuries / limitations" value={p.injuries || 'None reported'} />
        <InfoRow label="Allergies" value={p.allergies || 'None reported'} />
        <InfoRow label="Medications" value={p.medications || 'None'} />
        <InfoRow label="Sleep" value={p.sleep_hours ? `${p.sleep_hours} hrs / night` : null} />
        <InfoRow label="Water goal" value={p.water_goal_ml ? `${(p.water_goal_ml / 1000).toFixed(1)} L / day` : null} />
        <InfoRow label="Trainer notes" value={client.notes} />
      </SectionCard>
    </div>
  );
}
