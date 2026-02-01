# Phase 9.3: Legal & Compliance Research
## GDPR, CCPA, Copyright, Age Restrictions

> **Duration**: Week 11.3
> **Dependencies**: Phase 9.1 complete
> **Size**: Medium file - manageable for reading

---

## 1. Data Type Detection

### 1.1 Automatic Detection

```typescript
interface DataTypes {
  personal: boolean;      // Email, name, address, phone
  payment: boolean;       // Credit card, billing
  health: boolean;        // Medical, fitness data
  location: boolean;      // GPS, geolocation
  biometric: boolean;     // Fingerprint, Face ID
  children: boolean;      // Under 13 years old
  media: boolean;         // Video, audio content
}

function detectDataTypes(feature: Feature): DataTypes {
  const evidenceText = feature.evidence
    .map(e => e.content)
    .join(' ')
    .toLowerCase();

  return {
    personal: /email|name|address|phone|birth|profile/.test(evidenceText),
    payment: /payment|credit|billing|subscription|purchase/.test(evidenceText),
    health: /medical|health|fitness|workout/.test(evidenceText),
    location: /location|gps|geo|map/.test(evidenceText),
    biometric: /fingerprint|face.?id|biometric|touch.?id/.test(evidenceText),
    children: /child|kid|under.?13|coppa/.test(evidenceText),
    media: /video|audio|stream|playback|content/.test(evidenceText)
  };
}
```

---

## 2. GDPR Compliance (European Union)

### 2.1 When GDPR Applies

**Triggers**:
- Feature handles personal data (name, email, etc.)
- User is in EU/EEA
- Data is processed/stored

### 2.2 GDPR Requirements by Data Type

```typescript
const GDPR_REQUIREMENTS = {
  personal_data: [
    'Must obtain explicit user consent before collecting data (Art. 6)',
    'Must provide clear privacy policy explaining data usage (Art. 13)',
    'Must implement "Right to be Forgotten" - user can delete their data (Art. 17)',
    'Must allow data export (data portability) (Art. 20)',
    'Must encrypt personal data at rest and in transit (Art. 32)',
    'Must report data breaches within 72 hours (Art. 33)',
    'Must appoint Data Protection Officer if processing at scale (Art. 37)',
    'Must maintain data processing records (Art. 30)',
    'Must implement privacy by design and by default (Art. 25)'
  ],
  children_data: [
    'Must obtain parental consent for users under 16 (Art. 8)',
    'Must verify parental consent mechanism',
    'Must provide clear information to children in age-appropriate language'
  ],
  sensitive_data: [
    'Must have explicit consent for health/biometric data (Art. 9)',
    'Must implement additional security measures for sensitive data'
  ]
};

async function generateGDPRRequirements(feature: Feature): Promise<EnrichmentSource[]> {
  const dataTypes = detectDataTypes(feature);

  if (!dataTypes.personal && !dataTypes.children && !dataTypes.health) {
    return [{
      sourceType: 'gdpr',
      sourceName: 'GDPR Assessment',
      content: 'No GDPR requirements - feature does not handle personal data',
      relevanceScore: 1.0,
      mandatory: false
    }];
  }

  // Collect applicable requirements
  const requirements: string[] = [];

  if (dataTypes.personal) {
    requirements.push(...GDPR_REQUIREMENTS.personal_data);
  }

  if (dataTypes.children) {
    requirements.push(...GDPR_REQUIREMENTS.children_data);
  }

  if (dataTypes.health || dataTypes.biometric) {
    requirements.push(...GDPR_REQUIREMENTS.sensitive_data);
  }

  // LLM: Filter to most relevant for this specific feature
  const filtered = await filterByRelevance(feature, requirements);

  return filtered.map(req => ({
    featureId: feature.id,
    sourceType: 'gdpr',
    sourceName: 'GDPR Compliance',
    sourceUrl: 'https://gdpr.eu/checklist/',
    content: req.content,
    relevanceScore: req.score,
    mandatory: true  // GDPR is legally mandatory
  }));
}
```

---

## 3. CCPA Compliance (California)

### 3.1 When CCPA Applies

**Triggers**:
- Feature collects personal information
- App targets California residents
- Business meets CCPA thresholds

### 3.2 CCPA Requirements

```typescript
const CCPA_REQUIREMENTS = [
  'Must provide "Do Not Sell My Personal Information" link',
  'Must allow users to request deletion of their data',
  'Must allow users to request copy of their data',
  'Must disclose categories of personal information collected',
  'Must disclose third parties personal information is shared with',
  'Must not discriminate against users who exercise CCPA rights',
  'Must provide privacy policy at collection point',
  'Must honor Global Privacy Control (GPC) signals'
];

async function generateCCPARequirements(feature: Feature): Promise<EnrichmentSource[]> {
  const dataTypes = detectDataTypes(feature);

  if (!dataTypes.personal && !dataTypes.payment) {
    return [];  // CCPA only applies to personal info
  }

  // LLM: Select relevant requirements
  const prompt = `
Which CCPA requirements apply to: "${feature.name}"?

Feature handles: ${Object.entries(dataTypes).filter(([k, v]) => v).map(([k]) => k).join(', ')}

CCPA requirements:
${CCPA_REQUIREMENTS.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Return JSON: { "applicable": [1, 2, 5, 7] }
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1
  });

  const applicable = JSON.parse(response.choices[0].message.content).applicable;

  return applicable.map(i => ({
    featureId: feature.id,
    sourceType: 'ccpa',
    sourceName: 'CCPA Compliance',
    sourceUrl: 'https://oag.ca.gov/privacy/ccpa',
    content: CCPA_REQUIREMENTS[i - 1],
    relevanceScore: 1.0,
    mandatory: true
  }));
}
```

---

## 4. Copyright & Content Licensing

### 4.1 When Copyright Applies

**Triggers**:
- Feature involves video playback
- Feature involves audio playback
- Feature involves content delivery
- Feature involves user-generated content

### 4.2 Copyright Requirements

```typescript
async function generateCopyrightRequirements(feature: Feature): Promise<EnrichmentSource[]> {
  if (!isMediaFeature(feature)) {
    return [];
  }

  const requirements = [
    'Must verify content licensing rights before playback',
    'Must implement DRM (Digital Rights Management) for protected content',
    'Must display copyright notices as required by license',
    'Must implement geo-blocking if content rights are regional',
    'Must prevent unauthorized downloading or screen recording',
    'Must implement watermarking for premium content',
    'Must track and report content usage for royalty payments',
    'Must respect content creator attribution requirements'
  ];

  // LLM: Determine which apply
  const prompt = `
Which copyright requirements apply to: "${feature.name}"?

Feature evidence:
${feature.evidence.map(e => e.content).join('\n')}

Requirements:
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Return JSON:
{
  "applicable": [1, 2, 4],
  "additional": ["Must comply with DMCA takedown notices"]
}
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2
  });

  const result = JSON.parse(response.choices[0].message.content);

  const sources = result.applicable.map(i => ({
    featureId: feature.id,
    sourceType: 'legal',
    sourceName: 'Copyright Compliance',
    sourceUrl: 'https://www.copyright.gov/',
    content: requirements[i - 1],
    relevanceScore: 0.9,
    mandatory: true
  }));

  // Add additional requirements
  if (result.additional) {
    sources.push(...result.additional.map(content => ({
      featureId: feature.id,
      sourceType: 'legal',
      sourceName: 'Copyright Compliance',
      content,
      relevanceScore: 0.85,
      mandatory: true
    })));
  }

  return sources;
}

function isMediaFeature(feature: Feature): boolean {
  const mediaKeywords = ['video', 'audio', 'playback', 'stream', 'content', 'media'];
  const featureText = `${feature.name} ${feature.description}`.toLowerCase();

  return mediaKeywords.some(kw => featureText.includes(kw));
}
```

---

## 5. Age Restrictions & Content Rating

### 5.1 When Age Restrictions Apply

**Triggers**:
- Feature delivers video/audio content
- Feature allows user-generated content
- Feature has social features

### 5.2 Age Restriction Requirements

```typescript
async function generateAgeRestrictions(feature: Feature): Promise<EnrichmentSource[]> {
  if (!isMediaFeature(feature) && !isSocialFeature(feature)) {
    return [];
  }

  const requirements = [
    // COPPA (US - Children under 13)
    'Must obtain verifiable parental consent for users under 13 (COPPA)',
    'Must not collect personal info from children without consent (COPPA)',
    'Must provide parents ability to review/delete child data (COPPA)',

    // Content ratings
    'Must implement content rating system (MPAA/PEGI/etc.)',
    'Must display content ratings before playback',
    'Must implement parental controls for age-restricted content',
    'Must verify user age before showing 18+ content',

    // Regional
    'Must comply with regional age verification laws',
    'Must implement age gates for alcohol/gambling content',
    'Must restrict certain content by region (violence, adult content)'
  ];

  // LLM: Select applicable requirements
  const prompt = `
Which age restriction requirements apply to: "${feature.name}"?

Feature type: ${feature.category}
Feature evidence: ${feature.evidence.map(e => e.content).join(', ')}

Requirements:
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Return JSON: { "applicable": [1, 4, 5, 6] }
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1
  });

  const applicable = JSON.parse(response.choices[0].message.content).applicable;

  return applicable.map(i => ({
    featureId: feature.id,
    sourceType: 'legal',
    sourceName: 'Age Restrictions & Content Rating',
    content: requirements[i - 1],
    relevanceScore: 0.95,
    mandatory: true
  }));
}
```

---

## 6. PCI-DSS (Payment Data)

### 6.1 When PCI-DSS Applies

**Triggers**: Feature handles payment data (credit cards, billing)

### 6.2 Requirements

```typescript
const PCI_DSS_REQUIREMENTS = [
  'Must not store full credit card numbers (only last 4 digits)',
  'Must not store CVV/CVC security codes',
  'Must encrypt cardholder data at rest and in transit',
  'Must use TLS 1.2+ for payment processing',
  'Must tokenize payment methods (use payment gateway)',
  'Must implement strong access controls for payment data',
  'Must maintain audit logs for all payment transactions',
  'Must perform regular security scans and penetration tests',
  'Must use a certified payment processor (Stripe, PayPal, etc.)',
  'Must never log or display full credit card numbers'
];

async function generatePCIDSSRequirements(feature: Feature): Promise<EnrichmentSource[]> {
  const dataTypes = detectDataTypes(feature);

  if (!dataTypes.payment) {
    return [];
  }

  // All PCI-DSS requirements are mandatory for payment features
  return PCI_DSS_REQUIREMENTS.map(req => ({
    featureId: feature.id,
    sourceType: 'legal',
    sourceName: 'PCI-DSS Compliance',
    sourceUrl: 'https://www.pcisecuritystandards.org/',
    content: req,
    relevanceScore: 1.0,
    mandatory: true
  }));
}
```

---

## 7. Regional Regulations

### 7.1 Configuration

**From .env**:
```env
TARGET_MARKETS=US,EU,UK,CA,AU
```

### 7.2 Implementation

```typescript
async function generateRegionalRequirements(
  feature: Feature,
  targetMarkets: string[]
): Promise<EnrichmentSource[]> {
  const sources: EnrichmentSource[] = [];

  for (const market of targetMarkets) {
    switch (market) {
      case 'EU':
        sources.push(...await generateGDPRRequirements(feature));
        break;
      case 'US':
        sources.push(...await generateCCPARequirements(feature));
        sources.push(...await generateCOPPARequirements(feature));
        break;
      case 'UK':
        sources.push(...await generateUKDPARequirements(feature));
        break;
      case 'CA':
        sources.push(...await generatePIPEDARequirements(feature));
        break;
      // Add more regions as needed
    }
  }

  return sources;
}
```

---

## 8. Complete Legal Service

```typescript
// lib/services/enrichment/LegalComplianceService.ts

export class LegalComplianceService {
  async assessCompliance(
    feature: Feature,
    options: { targetMarkets: string[] }
  ): Promise<EnrichmentSource[]> {
    const dataTypes = detectDataTypes(feature);
    const sources: EnrichmentSource[] = [];

    // 1. GDPR (if EU market + personal data)
    if (options.targetMarkets.includes('EU') && dataTypes.personal) {
      sources.push(...await this.generateGDPRRequirements(feature));
    }

    // 2. CCPA (if US market + personal data)
    if (options.targetMarkets.includes('US') && dataTypes.personal) {
      sources.push(...await this.generateCCPARequirements(feature));
    }

    // 3. COPPA (if children data)
    if (dataTypes.children) {
      sources.push(...await this.generateCOPPARequirements(feature));
    }

    // 4. PCI-DSS (if payment data)
    if (dataTypes.payment) {
      sources.push(...await this.generatePCIDSSRequirements(feature));
    }

    // 5. Copyright (if media content)
    if (dataTypes.media) {
      sources.push(...await this.generateCopyrightRequirements(feature));
    }

    // 6. Age restrictions (if media/social)
    if (dataTypes.media || this.isSocialFeature(feature)) {
      sources.push(...await this.generateAgeRestrictions(feature));
    }

    return sources;
  }
}
```

---

## 9. Testing

```typescript
describe('LegalComplianceService', () => {
  it('should generate GDPR requirements for login feature', async () => {
    const feature = {
      name: 'User Login',
      evidence: [
        { content: 'Email input field' },
        { content: 'Password field' }
      ]
    };

    const requirements = await service.assessCompliance(feature, {
      targetMarkets: ['EU']
    });

    expect(requirements).toContainEqual(
      expect.objectContaining({
        sourceType: 'gdpr',
        content: expect.stringContaining('explicit consent'),
        mandatory: true
      })
    );
  });

  it('should generate PCI-DSS for payment feature', async () => {
    const feature = {
      name: 'Subscription Payment',
      evidence: [
        { content: 'Credit card input' },
        { content: 'Billing address' }
      ]
    };

    const requirements = await service.assessCompliance(feature, {
      targetMarkets: ['US']
    });

    expect(requirements).toContainEqual(
      expect.objectContaining({
        sourceType: 'legal',
        sourceName: 'PCI-DSS Compliance',
        mandatory: true
      })
    );
  });
});
```

---

## File Size

**This file**: ~400 lines
**Status**: ✅ Manageable

**Next**: [10d_PHASE_9_ACCESSIBILITY_SECURITY.md](10d_PHASE_9_ACCESSIBILITY_SECURITY.md)
