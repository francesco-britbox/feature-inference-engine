# Phase 7.6 Investigation Summary
**Date**: 2026-02-02
**Status**: ✅ Complete - Ready for Implementation

---

## 📋 **Fact-Checked Findings**

### **1. Export from Home Page** ❌ NOT IMPLEMENTED

**Current State**:
- Home page has "View Features" button
- Must navigate: Home → Features → [Feature] → Export → Download
- **5 clicks total**

**What's Missing**:
- No inline export on home page
- No export button on features list page
- No quick access to platform selector

**Recommended Solution**:
- Add "Quick Export" section on home page
- Show top 3 confirmed features
- Inline platform selector + download buttons per feature
- **Reduces to 2-3 clicks**

---

### **2. Document Deletion** ❌ PARTIALLY MISSING

**Current State**:
- ✅ `DELETE /api/features/[id]` exists (can delete features)
- ❌ `DELETE /api/documents/[id]` MISSING (cannot delete documents)
- ❌ No documents management UI

**Database Facts**:
```
Total documents: 17
Status: All "completed" (0 unprocessed)
Cascade rules: ✅ documents → evidence (CASCADE)
                ✅ documents → processing_jobs (CASCADE)
```

**What Needs Implementation**:
1. `DELETE /api/documents/[id]` endpoint
2. Delete file storage: `app/docs/[id]/`
3. `/documents` management page with delete buttons
4. Confirmation dialog

---

### **3. Settings with Danger Zone** ❌ NOT IMPLEMENTED

**Current State**:
- ❌ No `/settings` page
- ❌ No admin tools
- ❌ No "delete all" functionality

**Database to Clear** (8 tables):
```
documents:          17 records
evidence:          109 records (1.2 MB)
features:            7 records
feature_evidence:   33 relationships
feature_outputs:     0 records
processing_jobs:    17 jobs
enrichment_sources:  0 records
guideline_cache:     0 records
```

**File Storage to Clear**:
```
app/docs/: 37 MB (17 folders)
```

**What Needs Implementation**:
1. `/settings` page with system info
2. Danger Zone card with red styling
3. Text confirmation: "DELETE ALL DATA"
4. `POST /api/system/reset` endpoint
5. Delete all 8 tables in transaction
6. Delete all file storage
7. Clear activity logs
8. Double confirmation (input + browser alert)

---

### **4. PDF Extraction Issue** 🔴 CONFIRMED BROKEN

**Fact-Checked Evidence**:
```
3 PDFs uploaded:
- FXD-[WIP] Service Managers Matrix.pdf     → 0 evidence ❌
- FXD-[WIP] Service Manager DTO Matrix.pdf  → 0 evidence ❌
- BBIEng-Application API.pdf                → 0 evidence ❌

Status: "completed" (no errors logged)
File size: 232 KB (Service Managers Matrix)
Pages: 3 pages
Text extractable: YES ✅ (verified with pdftotext)
Sample text: "Service Managers Matrix", "SM Roadmap", "Configuration"
```

**Root Cause Analysis**:

**TEST 1**: PDF has text layer ✅
```bash
pdftotext original.pdf -
# Result: Text extracted successfully
# Content: "Service Managers Matrix", "SM Roadmap", etc.
```

**TEST 2**: PdfExtractor returns empty on error
```typescript
// lib/services/extractors/PdfExtractor.ts:76-78
catch (error) {
  this.log.error({...}, 'PDF/Markdown extraction failed');
  return []; // ❌ SILENT FAILURE
}
```

**Likely Causes** (needs investigation):
1. ✅ Text extraction works (verified)
2. ⚠️ Chunking may produce 0 chunks (empty text?)
3. ⚠️ LLM call may fail (rate limit? empty response?)
4. ⚠️ Evidence parsing may fail (invalid JSON?)
5. ❌ Error is caught and returns empty array (silent failure)

**Why No Error Logged**:
- PdfExtractor catches ALL errors and returns `[]`
- ExtractionService marks document as "completed" even with 0 evidence
- No distinction between "no evidence found" vs "extraction failed"

**Fix Needed**:
```typescript
// Option 1: Add detailed logging
const text = await this.extractTextFromPdf(filePath);
logger.info({ documentId, textLength: text.length }, 'PDF text extracted');

if (text.length === 0) {
  throw new Error('PDF contains no extractable text');
}

const chunks = this.chunkText(text, MAX_TOKENS_PER_CHUNK);
logger.info({ documentId, chunkCount: chunks.length }, 'Text chunked');

if (chunks.length === 0) {
  throw new Error('Chunking produced 0 chunks');
}

// Option 2: Don't catch errors silently
catch (error) {
  this.log.error({...}, 'PDF extraction failed');
  throw error; // Re-throw instead of returning []
}
```

---

## Phase 7.6 Implementation Plan

### **Section 7.6.1: Quick Export** (1 hour)
**Files**:
- `app/page.tsx` (+120 lines)
- `app/features/page.tsx` (+10 lines)

**Features**:
- Top 3 features on home page
- Inline platform selector
- JSON/MD/CSV download buttons
- Export button on features list

---

### **Section 7.6.2: Document Deletion** (2 hours)
**Files**:
- `app/api/documents/[id]/route.ts` (NEW, 150 lines)
- `app/documents/page.tsx` (NEW, 200 lines)
- `app/upload/page.tsx` (+15 lines)

**Features**:
- DELETE /api/documents/[id] endpoint
- Cascade deletes evidence + jobs
- Delete file storage
- Documents management UI
- Delete buttons with confirmation

---

### **Section 7.6.3: Settings & Danger Zone** (2 hours)
**Files**:
- `app/settings/page.tsx` (NEW, 250 lines)
- `app/api/system/reset/route.ts` (NEW, 120 lines)
- `app/page.tsx` (+5 lines - settings link)

**Features**:
- Settings page with system info
- Danger zone with red styling
- Text confirmation: "DELETE ALL DATA"
- DELETE all 8 tables in transaction
- Delete all file storage (37 MB)
- Clear activity logs
- Double confirmation

---

### **Section 7.6.4: PDF Investigation** (1-2 hours)
**Files**:
- `lib/services/extractors/PdfExtractor.ts` (+30 lines logging)
- Investigation document

**Features**:
- Add detailed logging at each step
- Identify exact failure point
- Fix silent failure
- Handle scanned PDFs gracefully
- Test with known-good PDF

---

## Total Scope

**New Files**: 4 files (~720 lines)
**Modified Files**: 4 files (~165 lines)
**Total Code**: ~885 lines

**Time**: 6-8 hours (1 day)
**Complexity**: Medium (mostly CRUD + UI)
**Risk**: Medium (destructive operations require careful implementation)

---

## Success Criteria Checklist

### Quick Export
- [ ] Home page shows top 3 features with export UI
- [ ] Platform selector per feature
- [ ] Download buttons (JSON, MD, CSV)
- [ ] Export from features list page

### Document Deletion
- [ ] DELETE /api/documents/[id] works
- [ ] Deletes DB + files + cascades
- [ ] /documents page lists all documents
- [ ] Delete buttons with confirmation
- [ ] Highlights 0-evidence documents

### Settings & Danger Zone
- [ ] /settings page accessible
- [ ] Shows system stats
- [ ] Danger zone requires "DELETE ALL DATA" text
- [ ] Button disabled until exact match
- [ ] Double confirmation
- [ ] Deletes all tables + files
- [ ] Transaction atomicity
- [ ] Redirects after reset

### PDF Fix
- [ ] Identify root cause
- [ ] Add logging
- [ ] Fix silent failure
- [ ] Test with text PDF → extracts evidence
- [ ] Handle scanned PDFs

---

## Current Issues Summary

| Issue | Status | Severity | Fix Time |
|-------|--------|----------|----------|
| No export from home | Missing | Medium | 1 hour |
| No document delete | Missing | Medium | 2 hours |
| No settings page | Missing | Low | 2 hours |
| No danger zone | Missing | Low | (included above) |
| PDF extracts 0 items | Bug | High | 1-2 hours |
| PDF fails silently | Bug | High | (included above) |

---

## Recommended Implementation Order

**Priority 1** (Critical - 2 hours):
1. PDF extraction fix (1-2 hours) - Data quality issue

**Priority 2** (High UX - 3 hours):
1. Quick export from home (1 hour) - Major UX improvement
2. Document deletion (2 hours) - Cleanup capability

**Priority 3** (Admin Tools - 2 hours):
1. Settings + Danger Zone (2 hours) - System management

---

**Phase 7.6 Plan**: ✅ **COMPLETE AND READY**

**Document**: `/docs/08_PHASE_7_6_SYSTEM_MANAGEMENT.md` (965 lines)

**Ready to implement?** 🚀
