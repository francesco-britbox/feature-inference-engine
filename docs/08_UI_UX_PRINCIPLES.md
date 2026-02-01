# UI/UX Design Principles
## Modern, Sleek, User-Friendly Interface

> **MANDATORY**: All UI implementation MUST follow these principles

---

## 1. Design System

### 1.1 Component Library (MANDATORY)

**Use**: `shadcn/ui` (NOT optional - REQUIRED)

**Why**:
- Modern, accessible components
- Built on Radix UI primitives
- Customizable with Tailwind
- Copy-paste components (full control)
- TypeScript native

**Install**:
```bash
pnpm dlx shadcn-ui@latest init
```

**Required components**:
- Button, Input, Label, Card, Badge, Progress, Dialog, Dropdown, Table, Tabs

---

### 1.2 Styling (MANDATORY)

**Framework**: TailwindCSS (already in Next.js setup)

**Design tokens**:
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { /* blue shades */ },
        success: { /* green shades */ },
        warning: { /* yellow shades */ },
        danger: { /* red shades */ },
        neutral: { /* gray shades */ }
      }
    }
  }
}
```

**Typography**: Use system fonts (fast, modern)

---

### 1.3 Icons (MANDATORY)

**Use**: `lucide-react`

**Why**: Modern, consistent, tree-shakeable

**Common icons**:
- Upload: `Upload` icon
- Success: `CheckCircle` icon
- Error: `XCircle` icon
- Processing: `Loader2` icon (animated)
- Info: `Info` icon

---

## 2. UI Principles (MANDATORY)

### 2.1 Modern & Sleek

**Characteristics**:
- Clean layouts with ample whitespace
- Subtle shadows and borders
- Smooth animations (no jarring transitions)
- Consistent spacing (4px, 8px, 16px, 24px, 32px)
- Rounded corners (4px for cards, 8px for buttons)
- Modern color palette (not flat, not overly colorful)

**Example**:
```tsx
// Upload card
<Card className="p-6 border-2 border-dashed hover:border-primary transition-colors">
  <div className="flex flex-col items-center gap-4">
    <Upload className="w-12 h-12 text-muted-foreground" />
    <p className="text-sm text-muted-foreground">
      Drag files here or click to browse
    </p>
  </div>
</Card>
```

---

### 2.2 Best Component for Task

**MANDATORY selections**:

| Task | Component | Library |
|------|-----------|---------|
| File upload | Dropzone with visual feedback | `react-dropzone` + shadcn Card |
| Progress | Progress bar with percentage | shadcn Progress |
| Status badges | Badge with color variants | shadcn Badge |
| Tables | Sortable, filterable table | `@tanstack/react-table` + shadcn Table |
| Forms | Validated forms | `react-hook-form` + `zod` |
| Modals | Accessible dialog | shadcn Dialog |
| Tooltips | Info tooltips | shadcn Tooltip |
| Notifications | Toast messages | shadcn Toast/Sonner |

**Rule**: Use shadcn components FIRST, custom components only if shadcn doesn't have it

---

### 2.3 Error Validation in UI

**MANDATORY patterns**:

**Form validation** (immediate feedback):
```tsx
<Form onSubmit={handleSubmit}>
  <FormField
    name="files"
    rules={{
      validate: {
        fileType: (files) => validateFileTypes(files) || 'Invalid file type',
        fileSize: (files) => validateFileSize(files) || 'File too large (max 50MB)',
        batchSize: (files) => files.length <= 20 || 'Maximum 20 files per batch'
      }
    }}
  >
    <Input type="file" multiple />
    <FormMessage />  {/* Shows error immediately */}
  </FormField>
</Form>
```

**API error handling** (user-friendly messages):
```tsx
try {
  await uploadFiles(files);
} catch (error) {
  if (error.code === 'INVALID_FILE_TYPE') {
    toast.error('Invalid File Type', {
      description: error.userMessage || 'Please upload PDF, PNG, JPG, JSON, CSV, YAML, or MD files'
    });
  } else {
    toast.error('Upload Failed', {
      description: 'Please try again or contact support'
    });
  }
}
```

**Per-file error display**:
```tsx
{failures.map(failure => (
  <Alert variant="destructive" key={failure.filename}>
    <XCircle className="h-4 w-4" />
    <AlertTitle>{failure.filename}</AlertTitle>
    <AlertDescription>
      {failure.userMessage}
      {failure.details && (
        <details className="mt-2 text-xs">
          <summary>Technical details</summary>
          <pre>{JSON.stringify(failure.details, null, 2)}</pre>
        </details>
      )}
    </AlertDescription>
  </Alert>
))}
```

---

### 2.4 Simple UI with Labels (No Overdo)

**Rules**:
- ✅ Clear, concise labels (2-4 words)
- ✅ Tooltips for extra info (don't clutter)
- ✅ Progressive disclosure (show details on demand)
- ❌ NO overwhelming text blocks
- ❌ NO unnecessary explanations
- ❌ NO jargon without tooltips

**Examples**:

**Good**:
```tsx
<Label>
  Files to Upload
  <Tooltip>
    <TooltipTrigger><Info className="w-4 h-4 ml-1" /></TooltipTrigger>
    <TooltipContent>Up to 20 files, 500MB total</TooltipContent>
  </Tooltip>
</Label>
```

**Bad**:
```tsx
<Label>
  Files to Upload (You can upload up to 20 files at once with a maximum size
  of 50MB per file and 500MB total batch size. Supported formats include PDF,
  PNG, JPG, JSON, CSV, YAML, and Markdown files. Files are validated for...)
</Label>  {/* TOO MUCH TEXT! */}
```

**Progressive disclosure**:
```tsx
{/* Simple view by default */}
<p>8 files uploaded, 2 failed</p>

{/* Details on click */}
<Collapsible>
  <CollapsibleTrigger>Show details</CollapsibleTrigger>
  <CollapsibleContent>
    {/* Error details here */}
  </CollapsibleContent>
</Collapsible>
```

---

## 3. Page-Specific UI Specs

### 3.1 Upload Page (`/app/upload/page.tsx`)

**Layout**:
```
┌─────────────────────────────────────────┐
│ Upload Documents                        │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   [Drag files here or click]      │ │
│  │   📁 Up to 20 files (500MB max)   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Selected: 5 files (125MB)             │
│  [Upload All Button]                   │
│                                         │
├─────────────────────────────────────────┤
│ Upload Progress                         │
├─────────────────────────────────────────┤
│  ✅ login.png          100% Complete   │
│  🔵 api-spec.json       45% Processing │
│  🟡 tickets.csv          0% Pending    │
│  🔴 invalid.exe        Error           │
│     └─ Invalid file type               │
└─────────────────────────────────────────┘
```

**Components**:
- Dropzone (large, centered, dashed border)
- Progress bars per file (thin, colored)
- Status badges (colored dots + text)
- Collapsible error details

---

### 3.2 Evidence Explorer (`/app/evidence/page.tsx`)

**Layout**:
```
┌─────────────────────────────────────────┐
│ Evidence Explorer                       │
├─────────────────────────────────────────┤
│ [Search box] [Type▼] [Document▼]       │
├─────────────────────────────────────────┤
│ Type     │ Content           │ Source   │
├──────────┼───────────────────┼──────────┤
│ 🟦 UI    │ Email input...    │ login.png│
│ 🟩 API   │ POST /api/login   │ spec.json│
│ 🟨 Req   │ Users must login  │ doc.pdf  │
└─────────────────────────────────────────┘
```

**Components**:
- Search input (debounced)
- Filter dropdowns (type, document)
- Data table (sortable, paginated)
- Badges for types (colored)
- Links to source documents

**Best practice**: `@tanstack/react-table` with shadcn Table

---

### 3.3 Features Page (`/app/features/page.tsx`)

**Layout**:
```
┌─────────────────────────────────────────┐
│ Feature Candidates                      │
├─────────────────────────────────────────┤
│ [Status▼] [Confidence▼]                │
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐  │
│ │ User Login                    82% │  │
│ │ ████████░░ Candidate              │  │
│ │ 12 evidence items                 │  │
│ │ [Confirm] [Reject] [Merge]        │  │
│ └───────────────────────────────────┘  │
│                                         │
│ ┌───────────────────────────────────┐  │
│ │ Playback Control              91% │  │
│ │ █████████░ Confirmed              │  │
│ │ 15 evidence items                 │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Components**:
- Cards for each feature (hover effects)
- Progress bars for confidence (colored: red <50%, yellow 50-75%, green >75%)
- Badge for status (candidate, confirmed)
- Action buttons (primary, secondary, destructive)

---

### 3.4 Feature Detail (`/app/features/[id]/page.tsx`)

**Layout**:
```
┌─────────────────────────────────────────┐
│ ← Back         User Login          82% │
├─────────────────────────────────────────┤
│ [Edit Name] [Merge] [Confirm]          │
├─────────────────────────────────────────┤
│ Evidence (12)  │ API Contracts │ Export│
├────────────────┴───────────────────────┤
│ 🟦 UI Elements (5)                     │
│   • Email input field                  │
│   • Password input field               │
│   • Submit button "Sign In"            │
│   [Show all]                           │
│                                         │
│ 🟩 API Endpoints (3)                   │
│   • POST /api/auth/login               │
│   [Show all]                           │
│                                         │
│ 🟨 Requirements (4)                    │
│   • Users must authenticate            │
│   [Show all]                           │
└─────────────────────────────────────────┘
```

**Components**:
- Tabs for different views
- Grouped evidence (collapsible sections)
- Relationship indicators (implements, supports, constrains)
- Edit dialog (modal)

---

## 4. Progress Visibility (MANDATORY)

### 4.1 Real-Time Progress Display

**Page**: Upload page

**Requirements**:
- Show status for EACH file individually
- Update every 2 seconds (polling `/api/documents/:id/status`)
- Visual progress bar (0-100%)
- Stage indicator: Uploading → Extracting → Embedding → Inferring
- Time elapsed per file
- Estimated time remaining (optional, Phase 9)

**Example**:
```tsx
<div className="space-y-2">
  {files.map(file => (
    <Card key={file.id}>
      <div className="flex items-center gap-4 p-4">
        {/* Status icon */}
        {file.status === 'processing' && <Loader2 className="animate-spin" />}
        {file.status === 'completed' && <CheckCircle className="text-green-600" />}
        {file.status === 'failed' && <XCircle className="text-red-600" />}

        {/* Filename */}
        <div className="flex-1">
          <p className="font-medium">{file.filename}</p>
          <p className="text-sm text-muted-foreground">
            {file.progress.stage}  {/* "Extracting evidence (page 12/25)" */}
          </p>
        </div>

        {/* Progress */}
        <Progress value={file.progress.percent} className="w-32" />
        <span className="text-sm text-muted-foreground">{file.progress.percent}%</span>
      </div>
    </Card>
  ))}
</div>
```

---

### 4.2 System Status Dashboard (NEW REQUIREMENT)

**Add Phase 5.5**: System Status Page

**Purpose**: Show what's happening system-wide

**Layout**:
```
┌─────────────────────────────────────────┐
│ System Status                           │
├─────────────────────────────────────────┤
│ Documents                               │
│   Total: 47                             │
│   Processing: 3                         │
│   Completed: 42                         │
│   Failed: 2                             │
│                                         │
│ Evidence                                │
│   Total: 1,234 items                    │
│   By type: UI (450), API (230), ...    │
│                                         │
│ Features                                │
│   Candidates: 12                        │
│   Confirmed: 8                          │
│   Confidence avg: 78%                   │
│                                         │
│ Queue                                   │
│   Pending jobs: 5                       │
│   Processing: 2                         │
│   [View Queue]                          │
└─────────────────────────────────────────┘
```

---

## 5. Testing & Debug UI (NEW REQUIREMENT)

### 5.1 Correlation Testing Page (NEW - Phase 5.6)

**Purpose**: Manually test feature inference

**Route**: `/app/debug/correlation/page.tsx`

**Layout**:
```
┌─────────────────────────────────────────┐
│ Correlation Testing                     │
├─────────────────────────────────────────┤
│ Select Evidence Items:                  │
│  ☑ Email input field (ui_element)      │
│  ☑ POST /api/login (endpoint)          │
│  ☑ Password validation (requirement)   │
│  ☐ Playback button (ui_element)        │
│                                         │
│ [Test Correlation] [Clear]             │
├─────────────────────────────────────────┤
│ Inference Result:                       │
│                                         │
│ Feature: "User Login"                   │
│ Confidence: 85%                         │
│ Reasoning: "These items describe..."   │
│                                         │
│ Relationships:                          │
│   • Email input → implements (0.9)     │
│   • POST /api/login → implements (0.85)│
│   • Password rule → constrains (0.8)   │
│                                         │
│ [Create Feature] [Adjust & Retry]      │
└─────────────────────────────────────────┘
```

**Features**:
- Select any evidence items
- Click "Test Correlation"
- See what feature LLM would infer
- See confidence score
- See relationships
- Can create feature from test or discard

---

### 5.2 Feature Creation Testing (NEW - Phase 5.6)

**Purpose**: Manually create features to test workflow

**Layout**:
```
┌─────────────────────────────────────────┐
│ Manual Feature Creation                 │
├─────────────────────────────────────────┤
│ Feature Name: [_________________]       │
│ Description:  [_________________]       │
│               [_________________]       │
│                                         │
│ Link Evidence:                          │
│  [Search evidence...]                   │
│                                         │
│  Selected (5):                          │
│  • Email input (implements)             │
│  • POST /login (implements)             │
│  [Add more]                             │
│                                         │
│ [Create Feature]                        │
└─────────────────────────────────────────┘
```

---

## 6. Simple & Guided (MANDATORY)

### 6.1 Clear Labels (2-4 Words)

**Good labels**:
- "Upload Documents" (not "Please upload your documents here")
- "Confidence Score" (not "AI-generated confidence level indicator")
- "Processing" (not "Currently being processed by the system")
- "View Evidence" (not "Click here to view all evidence items")

**Rule**: Max 4 words for labels, use tooltips for explanations

---

### 6.2 Guided Workflow

**Step indicators**:
```tsx
<Steps current={2}>
  <Step title="Upload" status="complete" />
  <Step title="Extract" status="current" />
  <Step title="Review" status="pending" />
  <Step title="Export" status="pending" />
</Steps>
```

**Contextual help**:
```tsx
{files.length === 0 && (
  <Alert>
    <Info className="h-4 w-4" />
    <AlertTitle>No files uploaded yet</AlertTitle>
    <AlertDescription>
      Upload documents to begin extracting features
    </AlertDescription>
  </Alert>
)}
```

**Empty states** (always show what to do next):
```tsx
{evidence.length === 0 ? (
  <EmptyState
    icon={<FileText />}
    title="No evidence yet"
    description="Upload documents to see extracted evidence"
    action={<Button onClick={() => router.push('/upload')}>Upload Files</Button>}
  />
) : (
  <EvidenceTable data={evidence} />
)}
```

---

### 6.3 No Overdo

**Avoid**:
- ❌ Excessive animations (subtle only)
- ❌ Too many colors (max 5 semantic colors)
- ❌ Walls of text (break into sections)
- ❌ Too many tooltips (only for non-obvious)
- ❌ Overexplaining (user is technical)

**Embrace**:
- ✅ Whitespace (don't cram)
- ✅ Consistent spacing (8px, 16px, 24px)
- ✅ Visual hierarchy (size, weight, color)
- ✅ Scannable layouts (users skim, don't read)

---

## 7. Responsive Design (MANDATORY)

**Breakpoints**:
- Desktop: 1280px+ (primary target)
- Tablet: 768px-1279px (secondary)
- Mobile: <768px (basic support)

**Rules**:
- Upload page: Full width dropzone on all sizes
- Tables: Horizontal scroll on mobile
- Modals: Full screen on mobile
- Cards: Stack on mobile, grid on desktop

---

## 8. Accessibility (MANDATORY)

**WCAG 2.1 AA compliance**:
- ✅ Keyboard navigation (tab, enter, escape)
- ✅ ARIA labels on interactive elements
- ✅ Color contrast (4.5:1 minimum)
- ✅ Focus indicators (visible outline)
- ✅ Screen reader support (semantic HTML)

**shadcn/ui handles most of this automatically**

---

## 9. Animation Guidelines

**Use animations for**:
- ✅ Loading states (spinner, skeleton)
- ✅ State changes (fade in/out)
- ✅ Feedback (success checkmark)

**Rules**:
- Duration: 150-300ms (fast, not slow)
- Easing: ease-in-out (smooth)
- Respect `prefers-reduced-motion`

**Example**:
```tsx
<div className="transition-all duration-200 ease-in-out hover:shadow-lg">
  {/* Card content */}
</div>
```

---

## 10. Error States (MANDATORY)

### 10.1 Error Display Hierarchy

1. **Inline errors**: Next to form field (immediate)
2. **Toast notifications**: Top-right corner (transient)
3. **Alert boxes**: Above content (persistent)
4. **Error page**: Full page for critical errors

### 10.2 Error Message Format

**User-friendly** (what went wrong + how to fix):
```tsx
<Alert variant="destructive">
  <AlertTitle>Upload Failed</AlertTitle>
  <AlertDescription>
    File "report.exe" was rejected because executables are not allowed.
    <br />
    Please upload: PDF, PNG, JPG, JSON, CSV, YAML, or Markdown files.
  </AlertDescription>
</Alert>
```

**Technical details** (collapsible):
```tsx
<details className="mt-2">
  <summary className="text-xs cursor-pointer">Technical details</summary>
  <pre className="text-xs mt-2 p-2 bg-muted rounded">
    {JSON.stringify(error, null, 2)}
  </pre>
</details>
```

---

## 11. Color System (MANDATORY)

**Status colors**:
```javascript
const STATUS_COLORS = {
  uploaded: 'yellow',    // 🟡 Pending
  processing: 'blue',    // 🔵 In progress
  completed: 'green',    // 🟢 Success
  failed: 'red',         // 🔴 Error
  candidate: 'orange',   // 🟠 Needs review
  confirmed: 'green',    // 🟢 Approved
  rejected: 'gray',      // ⚪ Discarded
};
```

**Confidence colors** (gradient):
- 0-50%: Red (discard)
- 50-75%: Yellow (candidate)
- 75-90%: Light green (good)
- 90-100%: Dark green (excellent)

---

## 12. Component Selection Table

| Need | shadcn Component | Alternative |
|------|------------------|-------------|
| Button | Button | Native button (NO) |
| Input | Input | Native input (NO) |
| Form | Form + FormField | react-hook-form (YES) |
| Table | Table | @tanstack/react-table (YES) |
| Dropdown | Select or DropdownMenu | Native select (NO) |
| Modal | Dialog | Native dialog (NO) |
| Toast | Toast or Sonner | react-toastify (NO) |
| Progress | Progress | Custom div (NO) |
| Badge | Badge | Custom span (NO) |
| Card | Card | Custom div (NO) |
| Tabs | Tabs | Custom (NO) |
| Tooltip | Tooltip | Custom (NO) |

**Rule**: ALWAYS use shadcn component if available

---

## 13. Implementation Mandate

**Phase 5 MUST**:
- ✅ Use shadcn/ui components exclusively
- ✅ Follow modern, sleek aesthetic
- ✅ Implement error validation in UI
- ✅ Use best component for each task
- ✅ Keep labels simple (2-4 words)
- ✅ Progressive disclosure (details on demand)
- ✅ Show real-time progress
- ✅ Handle errors gracefully with user-friendly messages
- ✅ No overdo (no excessive text, animations, or colors)

**If Phase 5 implementation violates these principles, code review will score <95% and fail.**

---

## 14. Example: Perfect Upload Component

```tsx
'use client';

import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function UploadArea() {
  const { getRootProps, getInputProps } = useDropzone({
    multiple: true,
    maxFiles: 20,
    maxSize: 50 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      // ... etc
    },
    onDrop: handleUpload
  });

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className="border-2 border-dashed cursor-pointer hover:border-primary transition-colors"
      >
        <CardContent className="flex flex-col items-center gap-4 p-12">
          <Upload className="w-12 h-12 text-muted-foreground" />
          <p className="text-lg font-medium">Drop files here</p>
          <p className="text-sm text-muted-foreground">
            Up to 20 files, 500MB total
          </p>
          <input {...getInputProps()} />
        </CardContent>
      </Card>

      {/* Progress for each file */}
      {files.map(file => (
        <Card key={file.id}>
          <CardContent className="flex items-center gap-4 p-4">
            <StatusIcon status={file.status} />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.filename}</p>
              <p className="text-sm text-muted-foreground">
                {file.progress.message}
              </p>
            </div>
            <Progress value={file.progress.percent} className="w-24" />
            <Badge variant={STATUS_VARIANTS[file.status]}>
              {file.status}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**This is A+ UI code: Clean, modern, simple, functional.**

---

## ENFORCEMENT

**Phase 5 implementation MUST achieve 95%+ quality score.**

**UI-specific deductions**:
- Using native HTML elements instead of shadcn: -10 points
- No error validation: -8 points
- No progress indicators: -8 points
- Overcomplicated labels: -5 points
- No accessibility: -10 points
- Ugly styling: -5 points
- Not using best component for task: -8 points

**Code reviewer will check**: shadcn usage, error handling, labels, progress, simplicity
