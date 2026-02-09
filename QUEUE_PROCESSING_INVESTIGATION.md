# Queue Processing Investigation
**Date**: 2026-02-02
**Issue**: Jobs stuck in "pending", no visible processing activity

---

## 🔍 **Problem Discovered**

### User Report
- Uploaded 3 PDFs
- Status page shows "0 processing" (but queue says 5 pending, 1 processing)
- No visible activity or progress

### Root Cause (Fact-Checked)

**CRITICAL ISSUE**: ❌ **NO AUTOMATIC BACKGROUND WORKER**

```
Current Architecture:
  Upload PDF → Creates job in database (status='pending')
      ↓
  Job sits in "pending" FOREVER ⏰
      ↓
  Manual trigger required: POST /api/queue/process
      ↓
  Jobs process → Extract evidence → Complete
```

**The queue processor only runs when MANUALLY triggered!**

---

## 📊 **Database Facts**

### Before Manual Trigger
```sql
SELECT status, COUNT(*) FROM processing_jobs;
-- pending: 5
-- processing: 1 (stuck from previous run)
-- completed: 11

SELECT COUNT(*) FROM evidence;
-- 83 items
```

### After Manual Trigger (`POST /api/queue/process`)
```sql
SELECT status, COUNT(*) FROM processing_jobs;
-- pending: 0
-- processing: 2 (actively running)
-- completed: 15

SELECT COUNT(*) FROM evidence;
-- 109 items (+26 from PDFs) ✅
```

**Conclusion**: Queue processor WORKS when triggered, but doesn't run automatically.

---

## 🚨 **Missing Components**

### 1. ❌ No Background Worker
**What exists**: Manual API endpoint (`POST /api/queue/process`)
**What's missing**: Automatic background job processor

**Current behavior**:
- Upload file → Job created → **Sits in pending forever**
- Must manually call API or refresh page to trigger processing

**Expected behavior**:
- Upload file → Job created → **Auto-processes within seconds**

### 2. ❌ No Real-Time Activity Monitor
**What exists**:
- Status page polls `/api/stats` every 5 seconds (shows totals only)
- Upload page polls `/api/documents/:id/status` for individual files

**What's missing**:
- Real-time activity log: "Processing document X... Extracted 12 items... Done"
- Live progress bars per document
- Streaming logs from extraction process
- Current job being processed

**Expected UI**:
```
┌─────────────────────────────────────────────────┐
│ 🔄 LIVE ACTIVITY FEED                          │
├─────────────────────────────────────────────────┤
│ [16:15:43] Processing: api-spec.pdf            │
│ [16:15:44] Extracted 8 endpoints               │
│ [16:15:45] Extracted 6 payload schemas         │
│ [16:15:46] ✅ Completed: api-spec.pdf (14 items)│
│                                                 │
│ [16:15:47] Processing: screenshot.png          │
│ [16:15:48] Analyzing with OpenAI Vision...     │
│ [16:15:52] Extracted 23 UI elements            │
│ [16:15:53] ✅ Completed: screenshot.png         │
└─────────────────────────────────────────────────┘
```

### 3. ⚠️ Status Page Confusion
**What shows**: "Processing: 0" in big bold text
**Reality**: 5 pending + 1 processing jobs exist
**Problem**: "Processing" card shows `documents.byStatus.processing` (document-level status)
**Missing**: Shows queue jobs, not document status

---

## 🔧 **Solutions Needed**

### Solution 1: Automatic Queue Processor (HIGH PRIORITY)

**Option A: Client-Side Polling** (Simplest)
```tsx
// app/upload/page.tsx
useEffect(() => {
  const interval = setInterval(() => {
    // Auto-trigger queue processing
    fetch('/api/queue/process', { method: 'POST' });
  }, 5000); // Every 5 seconds

  return () => clearInterval(interval);
}, []);
```
**Pros**: Easy, no server changes
**Cons**: Wasteful, runs even when no jobs pending

**Option B: Server-Side Background Worker** (Better)
```typescript
// lib/workers/queueWorker.ts
export function startQueueWorker() {
  setInterval(async () => {
    const stats = await getQueueStats();
    if (stats.pending > 0) {
      await processQueue();
    }
  }, 5000);
}

// Start in app startup
```
**Pros**: Efficient, server-controlled
**Cons**: Requires Node.js worker thread or separate process

**Option C: Next.js API Route Polling** (Recommended)
```typescript
// lib/workers/autoProcessor.ts
let intervalId: NodeJS.Timeout | null = null;

export function startAutoProcessor() {
  if (intervalId) return;

  intervalId = setInterval(async () => {
    const queueService = new QueueService();
    await queueService.processNext(async (docId) => {
      await extractionService.extractFromDocument(docId);
    });
  }, 3000); // Check every 3 seconds
}

// Call on server startup
```

### Solution 2: Real-Time Activity Monitor (MEDIUM PRIORITY)

**Implementation**:
1. Create `GET /api/queue/activity` endpoint (returns last 50 log entries)
2. Add `activity_logs` table or use in-memory queue
3. Update status page with live feed component
4. Poll every 2 seconds for updates

**UI Component**:
```tsx
// components/ActivityMonitor.tsx
export function ActivityMonitor() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch('/api/queue/activity');
      const data = await response.json();
      setLogs(data.logs);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="text-sm font-mono">
              <span className="text-muted-foreground">[{log.time}]</span>
              <span className="ml-2">{log.message}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Solution 3: Fix Status Page Metrics (LOW PRIORITY)

**Change**:
```tsx
// Show queue stats, not document processing stats
<Card>
  <CardTitle>Queue Status</CardTitle>
  <div className="text-2xl font-bold">
    {stats.queue.pending + stats.queue.processing}
  </div>
  <p>Active jobs</p>
</Card>
```

---

## 📋 **Added to Phase 7.5 Plan**

**New Section: 7.5.5 - Real-Time Monitoring & Auto-Processing**

### Tasks:
- [ ] Implement automatic queue processor (Option C)
- [ ] Create activity log system
- [ ] Add GET /api/queue/activity endpoint
- [ ] Create ActivityMonitor component
- [ ] Add to status page
- [ ] Update status page metrics to show queue properly

**Time Estimate**: +3 hours

**Updated Phase 7.5 Total**: 15 hours (2 days)

---

## 🎯 **Immediate Workaround**

**For now, manually trigger queue processing:**

```bash
# Process all pending jobs
curl -X POST http://localhost:3003/api/queue/process
```

**Or add auto-trigger to upload page** (quick hack):
```tsx
// app/upload/page.tsx
useEffect(() => {
  const interval = setInterval(() => {
    fetch('/api/queue/process', { method: 'POST' });
  }, 10000); // Every 10 seconds

  return () => clearInterval(interval);
}, []);
```

---

## 📈 **Processing Results (After Manual Trigger)**

**Jobs Processed**: 5 pending → 15 completed
**Evidence Extracted**: 83 → 109 items (+26 from 3 PDFs)
**Time Taken**: ~2 minutes
**Status**: ✅ Queue processor works when triggered

**New Documents Processed**:
1. `FXD-[WIP] Service Managers Matrix-290126-172434.pdf`
2. `FXD-[WIP] Service Manager DTO Matrix-290126-172345.pdf`
3. `BBIEng-Application API-300126-155827.pdf`

---

## 📝 **Summary**

### Issues Found:
1. ❌ **No automatic background worker** (jobs sit in pending forever)
2. ❌ **No real-time activity monitor** (can't see what's happening)
3. ⚠️ **Status page misleading** (shows document status, not queue status)

### Solutions:
1. ✅ Add automatic queue processor to Phase 7.5
2. ✅ Add real-time activity monitor to Phase 7.5
3. ✅ Fix status page metrics

### Immediate Action:
- Use manual trigger: `POST /api/queue/process`
- Or add client-side polling (5-line hack in upload page)

---

**Status**: 🔴 **CRITICAL BUG** - Queue doesn't auto-process
**Severity**: High (blocks user workflow)
**Fix Complexity**: Medium (3 hours for proper solution)
**Added to**: Phase 7.5, Section 7.5.5

---

**Last Updated**: 2026-02-02 16:20:00 UTC
