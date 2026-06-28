import { severityLabel } from '../lib/utils';

export default function SeverityBadge({ severity }) {
  const map = {
    LOW:      'badge-low',
    MEDIUM:   'badge-medium',
    HIGH:     'badge-high',
    CRITICAL: 'badge-critical',
  };
  return (
    <span className={map[severity] || 'badge-low'}>
      {severityLabel(severity)}
    </span>
  );
}
