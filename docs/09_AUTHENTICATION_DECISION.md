# Authentication Decision
## Is User Login Required?

---

## Question

**Does the inference engine app need user authentication (login)?**

---

## Analysis

### Current Architecture

**Deployment**: Local Docker containers
**Users**: Single user (you)
**Network**: localhost only, no public exposure
**Data**: Your documents, your features

### User's Context

**Statement**: "I am not providing any UI/UX"
**Interpretation**: Referring to OTT app features being extracted (Login feature, Playback feature), NOT the inference engine app itself

**Example features extracted**:
- "User Login" (feature in OTT app)
- "Playback Control" (feature in OTT app)
- These are OUTPUT of our system, not features OF our system

---

## Decision

### For MVP (Phases 0-7): ❌ **NO AUTHENTICATION**

**Why**:
- **Local deployment**: Only accessible from your machine
- **Single user**: Only you use it
- **No public access**: Docker containers not exposed
- **Overhead**: Auth adds complexity (NextAuth.js, user table, sessions)
- **Speed**: Faster development without auth

**Current plan says** (docs/01_ARCHITECTURE.md:375):
```
Local deployment (no auth needed)
```

**This is CORRECT for MVP.**

---

### For Future (Phase 9+): ✅ **ADD AUTHENTICATION**

**When needed**:
- Multi-user deployment
- Team collaboration
- Remote access
- Hosted version

**Technology**: NextAuth.js (already mentioned in Architecture doc:381)

**Schema additions**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track who uploaded/reviewed
ALTER TABLE documents ADD COLUMN uploaded_by UUID REFERENCES users(id);
ALTER TABLE features ADD COLUMN reviewed_by UUID REFERENCES users(id);
```

---

## Clarification

**"Login" in documentation refers to**:
1. ✅ **Example OTT feature** being extracted (User Login feature)
2. ✅ **Test fixture**: `login-screenshot.png`
3. ✅ **Example evidence**: "POST /api/auth/login endpoint"

**"Login" does NOT refer to**:
❌ Authentication for the inference engine app itself

---

## Current Status

**Inference engine app**: ❌ No login required (local, single-user)

**OTT app features extracted**: ✅ "User Login" is example feature that system will discover

---

## Summary

**Does app need login?** ❌ NO (for MVP)

**Is this a gap?** ❌ NO (this is intentional design decision)

**Is plan still solid?** ✅ YES (no auth is correct for local deployment)

**Future**: Add auth in Phase 9+ if deploying for multiple users
