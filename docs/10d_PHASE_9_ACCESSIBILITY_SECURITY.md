# Phase 9.4: Accessibility & Security
## WCAG 2.1 AA + OWASP Top 10

> **Duration**: Week 11.4
> **Dependencies**: Phase 9.1 complete
> **Size**: Medium file - manageable for reading

---

## 1. WCAG 2.1 AA Accessibility

### 1.1 Feature Categorization

```typescript
type AccessibilityCategory =
  | 'media'          // Video, audio playback
  | 'form'           // Inputs, login, registration
  | 'navigation'     // Menus, tabs, links
  | 'interactive'    // Buttons, sliders, controls
  | 'content'        // Text, images, cards
  | 'notification';  // Alerts, toasts

function categorizeForAccessibility(feature: Feature): AccessibilityCategory {
  const evidenceTypes = feature.evidence.map(e => e.type);
  const content = feature.evidence.map(e => e.content).join(' ').toLowerCase();

  // Detection logic
  if (content.includes('video') || content.includes('audio') || content.includes('playback')) {
    return 'media';
  }

  if (evidenceTypes.includes('endpoint') && /login|signin|register|form/.test(content)) {
    return 'form';
  }

  if (content.includes('menu') || content.includes('navigation') || content.includes('tab')) {
    return 'navigation';
  }

  if (content.includes('button') || content.includes('slider') || content.includes('control')) {
    return 'interactive';
  }

  return 'content';  // Default
}
```

---

### 1.2 WCAG Requirements by Category

```typescript
const WCAG_BY_CATEGORY = {
  media: [
    // 1.2 Time-based Media
    'Must provide captions for prerecorded video (1.2.2 - Level A)',
    'Must provide audio descriptions for prerecorded video (1.2.3 - Level A)',
    'Must provide captions for live video (1.2.4 - Level AA)',
    'Must provide audio descriptions for prerecorded video (1.2.5 - Level AA)',

    // 1.4 Distinguishable
    'Must not auto-play audio that lasts more than 3 seconds (1.4.2)',
    'Must provide pause, stop, or volume control for auto-playing audio (1.4.2)',

    // 2.1 Keyboard Accessible
    'Must allow keyboard control of all video functions (2.1.1)',
    'Must not trap keyboard focus in video player (2.1.2)',

    // 2.2 Enough Time
    'Must pause media if time limit exists (2.2.1)',

    // 2.3 Seizures
    'Must not have flashing content more than 3 times per second (2.3.1)'
  ],

  form: [
    // 1.3 Adaptable
    'Must use programmatically determinable form labels (1.3.1)',
    'Must present form fields in logical order (1.3.2)',

    // 1.4 Distinguishable
    'Must have 4.5:1 contrast ratio for text (1.4.3)',

    // 2.1 Keyboard Accessible
    'Must be fully keyboard accessible (2.1.1)',
    'Must have visible focus indicators (2.4.7)',

    // 3.2 Predictable
    'Must not change context on focus (3.2.1)',
    'Must not change context on input (3.2.2)',

    // 3.3 Input Assistance
    'Must label all form fields (3.3.2)',
    'Must provide error identification (3.3.1)',
    'Must provide error suggestions (3.3.3)',
    'Must prevent errors for legal/financial submissions (3.3.4)',

    // 4.1 Compatible
    'Must use proper HTML form elements (4.1.2)',
    'Must associate labels with form controls (4.1.3)'
  ],

  navigation: [
    // 2.4 Navigable
    'Must provide skip to main content link (2.4.1)',
    'Must have descriptive page titles (2.4.2)',
    'Must have logical focus order (2.4.3)',
    'Must have clear link purpose (2.4.4)',
    'Must provide multiple ways to find pages (2.4.5)',
    'Must have descriptive headings and labels (2.4.6)',
    'Must have visible focus indicators (2.4.7)',

    // 2.1 Keyboard Accessible
    'Must be fully keyboard navigable (2.1.1)',
    'Must not trap keyboard focus (2.1.2)'
  ],

  interactive: [
    // 2.1 Keyboard Accessible
    'Must operate via keyboard (2.1.1)',
    'Must have large enough touch targets (2.5.5 - 44x44px minimum)',

    // 2.5 Input Modalities
    'Must not require specific pointer gestures (2.5.1)',
    'Must provide cancel mechanism for pointer down events (2.5.2)',
    'Must have visible label matching accessible name (2.5.3)',

    // 3.2 Predictable
    'Must not trigger changes on focus alone (3.2.1)'
  ],

  content: [
    // 1.1 Text Alternatives
    'Must provide alt text for images (1.1.1)',

    // 1.3 Adaptable
    'Must use proper heading hierarchy (1.3.1)',
    'Must have meaningful sequence when linearized (1.3.2)',

    // 1.4 Distinguishable
    'Must have 4.5:1 contrast ratio for normal text (1.4.3)',
    'Must have 3:1 contrast ratio for large text (1.4.3)',
    'Must allow text resize up to 200% (1.4.4)',
    'Must not use images of text unless essential (1.4.5)'
  ]
};

async function generateWCAGRequirements(feature: Feature): Promise<EnrichmentSource[]> {
  const category = categorizeForAccessibility(feature);
  const baseRequirements = WCAG_BY_CATEGORY[category] || [];

  // LLM: Add feature-specific requirements
  const prompt = `
Generate additional WCAG 2.1 AA requirements for: "${feature.name}"

Category: ${category}

Base requirements:
${baseRequirements.join('\n')}

Feature evidence:
${feature.evidence.map(e => e.content).join('\n')}

Return JSON with additional specific requirements:
{
  "requirements": [
    "Must provide keyboard shortcuts for play/pause (customizable)",
    "Must announce buffering state to screen readers"
  ]
}
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2
  });

  const additional = JSON.parse(response.choices[0].message.content).requirements;

  // Combine base + additional
  const all = [...baseRequirements, ...additional];

  return all.map(content => ({
    featureId: feature.id,
    sourceType: 'wcag',
    sourceName: 'WCAG 2.1 AA',
    sourceUrl: 'https://www.w3.org/WAI/WCAG21/quickref/',
    content,
    relevanceScore: 0.9,
    mandatory: false  // Advisory for private app, mandatory for public
  }));
}
```

---

## 2. OWASP Top 10 Security

### 2.1 Security Sensitivity Detection

```typescript
type SecurityCategory =
  | 'authentication'     // Login, passwords, sessions
  | 'data-input'         // Forms, file uploads
  | 'api'                // REST/GraphQL endpoints
  | 'payment'            // Billing, subscriptions
  | 'data-storage';      // User data, preferences

function detectSecurityCategories(feature: Feature): SecurityCategory[] {
  const categories = new Set<SecurityCategory>();
  const content = feature.evidence.map(e => e.content).join(' ').toLowerCase();

  const keywords = {
    authentication: ['login', 'password', 'auth', 'signin', 'session', 'token', 'jwt'],
    'data-input': ['form', 'input', 'submit', 'upload', 'textarea'],
    api: ['endpoint', 'api', 'request', 'response', 'post', 'get'],
    payment: ['payment', 'credit', 'billing', 'subscription', 'purchase'],
    'data-storage': ['database', 'store', 'save', 'user data', 'profile']
  };

  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(w => content.includes(w))) {
      categories.add(category as SecurityCategory);
    }
  }

  return Array.from(categories);
}
```

---

### 2.2 OWASP Requirements by Category

```typescript
const OWASP_BY_CATEGORY = {
  authentication: [
    // A01:2021 – Broken Access Control
    'Must enforce authentication before accessing protected resources',
    'Must implement role-based access control if multiple user types',

    // A02:2021 – Cryptographic Failures
    'Must hash passwords with bcrypt/argon2 (cost factor ≥12)',
    'Must never store passwords in plain text',
    'Must use HTTPS only (no HTTP)',
    'Must encrypt sensitive data at rest',

    // A03:2021 – Injection
    'Must use parameterized queries (prevent SQL injection)',
    'Must validate all authentication inputs',

    // A04:2021 – Insecure Design
    'Must implement rate limiting (5 attempts per 15 minutes)',
    'Must implement account lockout after failed attempts',
    'Must use secure session tokens (cryptographically random)',
    'Must implement session timeout (30 minutes inactivity)',

    // A05:2021 – Security Misconfiguration
    'Must not expose sensitive information in error messages',
    'Must disable directory listing'
  ],

  'data-input': [
    // A03:2021 – Injection
    'Must validate all user inputs (XSS prevention)',
    'Must sanitize HTML inputs',
    'Must use parameterized queries (SQL injection prevention)',
    'Must validate file uploads (type, size, content)',

    // A04:2021 – Insecure Design
    'Must implement CSRF tokens for state-changing operations',
    'Must implement input length limits',

    // A07:2021 – Identification and Authentication Failures
    'Must validate email format server-side',
    'Must validate phone format server-side'
  ],

  api: [
    // A01:2021 – Broken Access Control
    'Must authenticate all API requests',
    'Must authorize requests based on user permissions',

    // A04:2021 – Insecure Design
    'Must implement rate limiting per user/IP',
    'Must validate API keys',
    'Must use TLS 1.2+ for all API calls',

    // A08:2021 – Software and Data Integrity Failures
    'Must validate request signatures',
    'Must implement request/response logging',

    // A09:2021 – Security Logging and Monitoring Failures
    'Must log all authentication attempts',
    'Must log all API errors'
  ],

  payment: [
    // A02:2021 – Cryptographic Failures
    'Must encrypt all payment data in transit and at rest',
    'Must use tokenization (never store full card numbers)',

    // A04:2021 – Insecure Design
    'Must use certified payment gateway (Stripe, PayPal)',
    'Must implement 3D Secure (SCA) for EU payments',
    'Must validate payment amounts server-side',

    // A09:2021 – Security Logging
    'Must log all payment transactions',
    'Must implement fraud detection',

    // PCI-DSS overlap
    'Must comply with PCI-DSS Level 1 if processing >6M transactions/year'
  ]
};

async function generateOWASPRequirements(feature: Feature): Promise<EnrichmentSource[]> {
  const categories = detectSecurityCategories(feature);

  if (categories.length === 0) {
    return [{
      sourceType: 'owasp',
      sourceName: 'OWASP Assessment',
      content: 'No specific security requirements - feature does not handle sensitive operations',
      relevanceScore: 1.0,
      mandatory: false
    }];
  }

  // Collect requirements for all detected categories
  const requirements = categories.flatMap(cat => OWASP_BY_CATEGORY[cat] || []);

  // LLM: Prioritize and add feature-specific requirements
  const prompt = `
Analyze OWASP security requirements for: "${feature.name}"

Feature evidence:
${feature.evidence.map(e => e.content).join('\n')}

Security categories detected: ${categories.join(', ')}

Base requirements:
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Return JSON:
{
  "critical": [1, 2, 5],  // Most critical requirements (numbers)
  "recommended": [3, 7, 9],
  "additional": [
    "Must implement OAuth 2.0 with PKCE flow",
    "Must rotate JWT tokens every 15 minutes"
  ]
}
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1
  });

  const result = JSON.parse(response.choices[0].message.content);

  const sources: EnrichmentSource[] = [];

  // Critical requirements (mandatory)
  sources.push(...result.critical.map(i => ({
    featureId: feature.id,
    sourceType: 'owasp',
    sourceName: 'OWASP Top 10 (Critical)',
    sourceUrl: 'https://owasp.org/www-project-top-ten/',
    content: requirements[i - 1],
    relevanceScore: 1.0,
    mandatory: true
  })));

  // Recommended requirements
  sources.push(...result.recommended.map(i => ({
    featureId: feature.id,
    sourceType: 'owasp',
    sourceName: 'OWASP Top 10 (Recommended)',
    sourceUrl: 'https://owasp.org/www-project-top-ten/',
    content: requirements[i - 1],
    relevanceScore: 0.8,
    mandatory: false
  })));

  // Additional feature-specific
  sources.push(...result.additional.map(content => ({
    featureId: feature.id,
    sourceType: 'owasp',
    sourceName: 'OWASP Security Best Practices',
    content,
    relevanceScore: 0.85,
    mandatory: false
  })));

  return sources;
}
```

---

## 2. Complete Services

### 2.1 AccessibilityService

```typescript
// lib/services/enrichment/AccessibilityService.ts

export class AccessibilityService {
  async generateRequirements(feature: Feature): Promise<EnrichmentSource[]> {
    const category = categorizeForAccessibility(feature);
    const wcagRequirements = WCAG_BY_CATEGORY[category] || [];

    // Add feature-specific requirements via LLM
    const additional = await this.generateFeatureSpecificWCAG(feature, wcagRequirements);

    return [...wcagRequirements, ...additional].map(content => ({
      featureId: feature.id,
      sourceType: 'wcag',
      sourceName: 'WCAG 2.1 AA',
      sourceUrl: 'https://www.w3.org/WAI/WCAG21/quickref/',
      content,
      relevanceScore: 0.9,
      mandatory: false  // Advisory unless public-facing app
    }));
  }

  private async generateFeatureSpecificWCAG(
    feature: Feature,
    baseRequirements: string[]
  ): Promise<string[]> {
    const prompt = `
Generate additional WCAG 2.1 AA requirements specific to: "${feature.name}"

Base requirements already covered:
${baseRequirements.join('\n')}

Feature details:
- Type: ${feature.category}
- Evidence: ${feature.evidence.map(e => e.content).join(', ')}

Return JSON with 3-5 additional specific requirements:
{
  "requirements": [
    "Must provide keyboard shortcut legend (accessible via '?')",
    "Must announce video quality changes to screen readers"
  ]
}
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content).requirements;
  }
}
```

---

### 2.2 SecurityService

```typescript
// lib/services/enrichment/SecurityService.ts

export class SecurityService {
  async generateRequirements(feature: Feature): Promise<EnrichmentSource[]> {
    const categories = detectSecurityCategories(feature);

    if (categories.length === 0) {
      return this.noSecurityRequirements();
    }

    // Collect base OWASP requirements
    const baseRequirements = categories.flatMap(cat =>
      OWASP_BY_CATEGORY[cat] || []
    );

    // LLM: Prioritize and enhance
    const sources = await this.prioritizeAndEnhance(feature, baseRequirements);

    return sources;
  }

  private async prioritizeAndEnhance(
    feature: Feature,
    requirements: string[]
  ): Promise<EnrichmentSource[]> {
    const prompt = `
Prioritize OWASP security requirements for: "${feature.name}"

Requirements:
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Feature handles:
${feature.evidence.filter(e => e.type === 'endpoint').map(e => e.content).join('\n')}

Return JSON:
{
  "critical": [1, 2, 5],  // MUST have (app-breaking vulnerabilities)
  "high": [3, 7],         // SHOULD have (significant risk)
  "medium": [9, 12],      // NICE to have (defense in depth)
  "additional": [
    "Must implement Content Security Policy (CSP) headers",
    "Must validate JWT token expiration"
  ]
}
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content);

    const sources: EnrichmentSource[] = [];

    // Critical (mandatory)
    sources.push(...result.critical.map(i => ({
      featureId: feature.id,
      sourceType: 'owasp',
      sourceName: 'OWASP Top 10 - Critical',
      sourceUrl: 'https://owasp.org/Top10/',
      content: requirements[i - 1],
      relevanceScore: 1.0,
      mandatory: true
    })));

    // High priority
    sources.push(...result.high.map(i => ({
      featureId: feature.id,
      sourceType: 'owasp',
      sourceName: 'OWASP Top 10 - High Priority',
      content: requirements[i - 1],
      relevanceScore: 0.9,
      mandatory: false
    })));

    // Additional
    sources.push(...result.additional.map(content => ({
      featureId: feature.id,
      sourceType: 'owasp',
      sourceName: 'OWASP Security Best Practices',
      content,
      relevanceScore: 0.8,
      mandatory: false
    })));

    return sources;
  }
}
```

---

## 3. Testing

```typescript
describe('AccessibilityService', () => {
  it('should generate WCAG for video playback', async () => {
    const feature = {
      name: 'Video Playback',
      evidence: [
        { type: 'ui_element', content: 'Video player with play button' }
      ]
    };

    const requirements = await service.generateRequirements(feature);

    expect(requirements).toContainEqual(
      expect.objectContaining({
        sourceType: 'wcag',
        content: expect.stringContaining('captions')
      })
    );

    expect(requirements).toContainEqual(
      expect.objectContaining({
        content: expect.stringContaining('keyboard control')
      })
    );
  });
});

describe('SecurityService', () => {
  it('should generate OWASP for login feature', async () => {
    const feature = {
      name: 'User Login',
      evidence: [
        { type: 'endpoint', content: 'POST /api/auth/login' },
        { type: 'ui_element', content: 'Password input field' }
      ]
    };

    const requirements = await service.generateRequirements(feature);

    expect(requirements).toContainEqual(
      expect.objectContaining({
        sourceType: 'owasp',
        content: expect.stringContaining('hash passwords'),
        mandatory: true
      })
    );

    expect(requirements).toContainEqual(
      expect.objectContaining({
        content: expect.stringContaining('rate limiting')
      })
    );
  });
});
```

---

## File Size

**This file**: ~550 lines
**Status**: ✅ Manageable

**Next**: [10e_PHASE_9_EDGE_CASES.md](10e_PHASE_9_EDGE_CASES.md)
