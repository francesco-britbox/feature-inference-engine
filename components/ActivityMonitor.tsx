/**
 * Activity Monitor Component
 * Real-time display of system activity logs
 * Polls /api/queue/activity every 2 seconds
 */

'use client';

import { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActivityLog } from '@/lib/types/activity';

/**
 * Format timestamp for display
 */
function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Get icon for log level
 */
function getLevelIcon(level: ActivityLog['level']): JSX.Element {
  switch (level) {
    case 'success':
      return <CheckCircle className="h-3 w-3 text-green-600" />;
    case 'error':
      return <XCircle className="h-3 w-3 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="h-3 w-3 text-yellow-600" />;
    case 'info':
    default:
      return <Info className="h-3 w-3 text-blue-600" />;
  }
}

/**
 * Get text color for log level
 */
function getLevelColor(level: ActivityLog['level']): string {
  switch (level) {
    case 'success':
      return 'text-green-600';
    case 'error':
      return 'text-red-600';
    case 'warning':
      return 'text-yellow-600';
    case 'info':
    default:
      return 'text-foreground';
  }
}

/**
 * Activity Monitor Component
 * Displays real-time activity feed from queue processing
 */
export function ActivityMonitor(): JSX.Element {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchLogs();

    // Poll every 2 seconds
    const interval = setInterval(() => {
      if (isLive) {
        fetchLogs();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive]);

  const fetchLogs = async (): Promise<void> => {
    try {
      const response = await fetch('/api/queue/activity?limit=50');
      if (!response.ok) return;

      const data: ActivityLog[] = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      // Silent fail - keep existing logs for UX
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Activity
          </CardTitle>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`text-xs px-2 py-1 rounded ${
              isLive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {isLive ? '🔴 Live' : 'Paused'}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-80 overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No activity yet. Upload documents to see real-time processing.
            </p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 py-1 border-b border-border last:border-0">
                <span className="text-muted-foreground whitespace-nowrap">
                  [{formatTime(log.timestamp)}]
                </span>
                <div className="flex items-center gap-1">
                  {getLevelIcon(log.level)}
                </div>
                <span className={getLevelColor(log.level)}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
