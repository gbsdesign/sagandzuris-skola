import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

/** The notes page's  label  −  value  +  ; tapping the value resets it (styles in notes.css).
 *  `icon` stands before a short label; `name` is the full name the − / + buttons say (default: the label). */
export const NpStepper: React.FC<{
  label: string;
  icon?: React.ReactNode;
  name?: string;
  value: string;
  changed: boolean;
  onMinus: () => void;
  onPlus: () => void;
  onReset: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
  className?: string;
}> = ({ label, icon, name = label, value, changed, onMinus, onPlus, onReset, minusDisabled, plusDisabled, className = '' }) => (
  <div className={`np-stepper ${className}`}>
    <span className="lbl" title={name !== label ? name : undefined}>{icon}{label}</span>
    <button type="button" className="pm" onClick={() => { triggerHaptic(5); onMinus(); }} disabled={minusDisabled} aria-label={`${name} −`}><Minus strokeWidth={2.6} /></button>
    <button type="button" className={`val ${changed ? 'changed' : ''}`} onClick={() => { triggerHaptic(5); onReset(); }} title="საწყისზე დაბრუნება">{value}</button>
    <button type="button" className="pm" onClick={() => { triggerHaptic(5); onPlus(); }} disabled={plusDisabled} aria-label={`${name} +`}><Plus strokeWidth={2.6} /></button>
  </div>
);
