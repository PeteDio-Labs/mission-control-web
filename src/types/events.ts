export interface InfraEvent {
  id: string;
  source: 'kubernetes' | 'proxmox' | 'argocd';
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  namespace?: string;
  affected_service?: string;
  metadata?: Record<string, unknown>;
}
