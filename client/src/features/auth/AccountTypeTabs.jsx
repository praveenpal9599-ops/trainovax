import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ButtonBase } from '@mui/material';
import FitnessCenterRoundedIcon from '@mui/icons-material/FitnessCenterRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import './AccountTypeTabs.css';

const KEY = 'trainovax.portal';
const TYPES = [
  { value: 'trainer', label: 'Trainer', hint: 'Coach & manage clients', icon: FitnessCenterRoundedIcon },
  { value: 'client', label: 'Client', hint: 'Follow your plan', icon: PersonRoundedIcon },
];

/**
 * Account type selected on the login / sign-up screens.
 * Kept in the URL (?as=trainer|client — handy for deep-linking a WebView) and remembered on the device.
 */
export function useAccountType() {
  const [params, setParams] = useSearchParams();
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch { /* storage unavailable */ }
  const fromUrl = params.get('as');
  const type = ['trainer', 'client'].includes(fromUrl) ? fromUrl : ['trainer', 'client'].includes(stored) ? stored : 'trainer';
  const setType = useCallback((t) => {
    try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
    const next = new URLSearchParams(params); next.set('as', t);
    setParams(next, { replace: true });
  }, [params, setParams]);
  return [type, setType];
}

/** Segmented Trainer / Client switch. Styles: AccountTypeTabs.css */
export default function AccountTypeTabs({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Account type" className="account-tabs">
      {TYPES.map((t) => {
        const active = value === t.value;
        return (
          <ButtonBase key={t.value} role="tab" aria-selected={active} onClick={() => onChange(t.value)}
            className={`account-tabs__tab ${active ? 'account-tabs__tab--active' : ''}`.trim()}>
            <span className="account-tabs__inner">
              <span className="account-tabs__icon"><t.icon /></span>
              <span className="account-tabs__text">
                <span className="account-tabs__label">{t.label}</span>
                <span className="account-tabs__hint">{t.hint}</span>
              </span>
            </span>
          </ButtonBase>
        );
      })}
    </div>
  );
}
