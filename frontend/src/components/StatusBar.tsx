import { useMemo } from 'react';
import { useAppSelector } from '../util/hooks';

const statusLabels: Record<string, string> = {
  idle: 'Ready',
  loading: 'Working...',
  success: 'Success',
  error: 'Needs attention'
};

export default function StatusBar() {
  const { status, message } = useAppSelector(state => state.auth);

  const text = useMemo(() => {
    const trimmed = message?.toString().trim();
    if (trimmed) return trimmed;
    return statusLabels[status] || 'Ready';
  }, [message, status]);

  const statusClass = 'status-bar status-' + status;
  const ariaLive = status === 'error' ? 'assertive' : 'polite';

  return (
    <div className={statusClass} role="status" aria-live={ariaLive} title={text}>
      <span className="status-pill">{status.toUpperCase()}</span>
      <pre className="status-message">{text}</pre>
    </div>
  );
}