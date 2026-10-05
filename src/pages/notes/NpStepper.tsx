import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

/** The notes page's  label  −  value  +  ; tapping the value resets it (styles in notes.css) */
export const NpStepper: React.FC<{
  label: string;
  value: string;
  changed: boolean;
  onMinus: () => void;
  onPlus: () => void;
  onReset: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
  className?: string;
}> = ({ label, value, changed, onMinus, onPlus, onReset, minusDisabled, plusDisabled, className = '' }) => (
  <div className={`np-stepper ${className}`}>
    <span className="lbl">{label}</span>
    <button type="button" className="pm" onClick={() => { triggerHaptic(5); onMinus(); }} disabled={minusDisabled} aria-label={`${label} −`}><Minus strokeWidth={2.6} /></button>
    <button type="button" className={`val ${changed ? 'changed' : ''}`} onClick={() => { triggerHaptic(5); onReset(); }} title="საწყისზე დაბრუნება">{value}</button>
    <button type="button" className="pm" onClick={() => { triggerHaptic(5); onPlus(); }} disabled={plusDisabled} aria-label={`${label} +`}><Plus strokeWidth={2.6} /></button>
  </div>
);
