# HYTRAIN Security & Code Review Report

**Date:** January 2026
**Reviewer:** AI-Powered Code Review
**Application:** HYTRAIN - HYROX Fitness Training App
**Stack:** Next.js 16, NextAuth.js, Prisma ORM, PostgreSQL, TypeScript

---

## Executive Summary

This report documents a comprehensive security and architecture review of the HYTRAIN codebase. The application demonstrates solid foundations with proper authentication patterns and ORM usage, but several areas require attention to meet production security standards.

### Issue Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 1 | Requires immediate attention |
| HIGH | 4 | Should be addressed this sprint |
| MEDIUM | 8 | Plan for next sprint |
| LOW | 7 | Address when convenient |

### Overall Assessment

The codebase follows modern best practices in many areas but lacks defense-in-depth security measures common in production applications. Priority should be given to rate limiting and input validation.

---

## Critical Issues

### 1. Missing Rate Limiting on Authentication Endpoints

**File:** `src/app/api/auth/register/route.ts`
**Lines:** 5-52
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)
**CVSS Score:** 8.1 (High)

#### Problem

The registration endpoint has no rate limiting, allowing:
- Brute force attacks on existing accounts
- Mass account creation (spam/abuse)
- Credential stuffing attacks
- Resource exhaustion (DoS)

#### Current Code

```typescript
// src/app/api/auth/register/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;
    // No rate limiting - unlimited requests allowed
```

#### Recommended Fix

Install Upstash Rate Limit:
```bash
npm install @upstash/ratelimit @upstash/redis
```

Implement rate limiting:
```typescript
// src/app/api/auth/register/route.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 requests per hour per IP
  analytics: true,
});

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for') ??
             request.headers.get('x-real-ip') ??
             'anonymous';

  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    );
  }

  // ... rest of handler
}
```

#### Environment Variables Required

```env
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

---

## High Priority Issues

### 2. Weak Password Policy

**File:** `src/app/auth/signup/page.tsx`
**Lines:** 26-28
**CWE:** CWE-521 (Weak Password Requirements)

#### Problem

Password validation only enforces minimum 8 characters. Modern security standards recommend stronger requirements to prevent dictionary attacks and credential stuffing.

#### Current Code

```typescript
// src/app/auth/signup/page.tsx
if (password.length < 8) {
  setError('Password must be at least 8 characters');
  return;
}
```

#### Recommended Fix

```typescript
// src/lib/validation.ts
export interface PasswordValidationResult {
  valid: boolean;
  error: string | null;
}

export function validatePassword(password: string): PasswordValidationResult {
  const minLength = 12;
  const requirements = [
    { test: (p: string) => p.length >= minLength, message: `Password must be at least ${minLength} characters` },
    { test: (p: string) => /[A-Z]/.test(p), message: 'Password must contain at least one uppercase letter' },
    { test: (p: string) => /[a-z]/.test(p), message: 'Password must contain at least one lowercase letter' },
    { test: (p: string) => /[0-9]/.test(p), message: 'Password must contain at least one number' },
    { test: (p: string) => /[^A-Za-z0-9]/.test(p), message: 'Password must contain at least one special character' },
  ];

  for (const req of requirements) {
    if (!req.test(password)) {
      return { valid: false, error: req.message };
    }
  }

  return { valid: true, error: null };
}

// Usage in signup page:
import { validatePassword } from '@/lib/validation';

const { valid, error } = validatePassword(password);
if (!valid) {
  setError(error);
  return;
}
```

---

### 3. Missing Server-Side Password Validation

**File:** `src/app/api/auth/register/route.ts`
**Lines:** 10-15
**CWE:** CWE-20 (Improper Input Validation)

#### Problem

Server only checks if password exists, not its strength. Client-side validation can be bypassed using curl, Postman, or browser dev tools.

#### Current Code

```typescript
// src/app/api/auth/register/route.ts
if (!email || !password) {
  return NextResponse.json(
    { error: 'Email and password are required' },
    { status: 400 }
  );
}
// No password strength validation
```

#### Recommended Fix

Install Zod for schema validation:
```bash
npm install zod
```

Implement server-side validation:
```typescript
// src/app/api/auth/register/route.ts
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
  name: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;
    // ... rest of handler
```

---

### 4. Timing Attack Vulnerability in Authentication

**File:** `src/lib/auth.ts`
**Lines:** 30-38
**CWE:** CWE-208 (Observable Timing Discrepancy)

#### Problem

Different code paths for "user not found" vs "invalid password" can leak information through timing differences. An attacker can determine if an email exists by measuring response times.

#### Current Code

```typescript
// src/lib/auth.ts
const user = await prisma.user.findUnique({
  where: { email: credentials.email },
});

if (!user || !user.password) {
  throw new Error('Invalid credentials'); // Fast path - no bcrypt
}

const isValid = await bcrypt.compare(credentials.password, user.password);
// bcrypt.compare takes ~100ms, detectable difference

if (!isValid) {
  throw new Error('Invalid credentials');
}
```

#### Recommended Fix

```typescript
// src/lib/auth.ts
const user = await prisma.user.findUnique({
  where: { email: credentials.email },
});

// Always perform bcrypt comparison to maintain constant time
// Use a dummy hash if user doesn't exist
const passwordToCompare = user?.password ||
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.S6WwOODnkXTyTa'; // dummy hash

const isValid = await bcrypt.compare(credentials.password, passwordToCompare);

// Check both conditions after timing-constant comparison
if (!user || !user.password || !isValid) {
  throw new Error('Invalid credentials');
}

return {
  id: user.id,
  email: user.email,
  name: user.name,
};
```

---

### 5. Missing Test Coverage

**Severity:** HIGH
**CWE:** CWE-1068 (Inconsistency Between Implementation and Documented Design)

#### Problem

No automated tests found in the codebase. This increases risk of regressions and makes refactoring dangerous.

#### Recommended Action

Install testing dependencies:
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom @types/jest
```

Create test configuration:
```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

Priority test files to create:
1. `src/lib/__tests__/validation.test.ts` - Password/input validation
2. `src/lib/__tests__/workout-generator.test.ts` - Core business logic
3. `src/app/api/__tests__/auth.test.ts` - Authentication endpoints
4. `src/components/__tests__/RaceSimulator.test.tsx` - Timer functionality

---

## Medium Priority Issues

### 6. Missing CSRF Protection

**Files:** All API routes in `src/app/api/`
**CWE:** CWE-352 (Cross-Site Request Forgery)

#### Problem

State-changing API endpoints rely solely on session cookies. While NextAuth's JWT strategy provides some protection, explicit CSRF tokens would be more robust.

#### Recommended Fix

For sensitive operations, implement CSRF tokens:
```typescript
// src/lib/csrf.ts
import { randomBytes } from 'crypto';

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken;
}
```

Or ensure cookies use `SameSite=Strict`:
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Set-Cookie',
            value: 'SameSite=Strict; Secure; HttpOnly',
          },
        ],
      },
    ];
  },
};
```

---

### 7. Missing Email Format Validation (Server-Side)

**File:** `src/app/api/auth/register/route.ts`
**Lines:** 7-8

#### Current Code

```typescript
const { email, password, name } = body;
// No email format validation
```

#### Recommended Fix

Already included in the Zod schema from Issue #3, but if not using Zod:

```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!email || !emailRegex.test(email)) {
  return NextResponse.json(
    { error: 'Valid email address is required' },
    { status: 400 }
  );
}
```

---

### 8. Missing Content Security Policy

**File:** `src/app/layout.tsx` or `middleware.ts`
**CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers)

#### Problem

No CSP headers configured, leaving the application vulnerable to XSS if any injection point is discovered.

#### Recommended Fix

Create middleware for security headers:
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://prod.spline.design",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://prod.spline.design",
      "frame-src 'self' https://prod.spline.design",
    ].join('; ')
  );

  // Other security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};
```

---

### 9. Non-Atomic Database Operations

**File:** `src/app/api/equipment/route.ts`
**Lines:** 76-88
**CWE:** CWE-362 (Race Condition)

#### Problem

Delete-then-create operations are not wrapped in a transaction, risking partial updates on failure.

#### Current Code

```typescript
// Delete all existing
await prisma.userEquipment.deleteMany({
  where: { userId: session.user.id },
});

// Create new - if this fails, user has no equipment!
const equipment = await prisma.userEquipment.createMany({
  data: body.map((item) => ({
    userId: session.user.id,
    equipmentId: item.equipmentId,
    available: item.available,
  })),
});
```

#### Recommended Fix

```typescript
const equipment = await prisma.$transaction(async (tx) => {
  // Delete within transaction
  await tx.userEquipment.deleteMany({
    where: { userId: session.user.id },
  });

  // Create within same transaction
  return tx.userEquipment.createMany({
    data: body.map((item: { equipmentId: string; available: boolean }) => ({
      userId: session.user.id,
      equipmentId: item.equipmentId,
      available: item.available,
    })),
  });
});
// If either operation fails, both are rolled back
```

---

### 10. Missing Input Sanitization for Enum Values

**File:** `src/app/api/race-goal/route.ts`
**Lines:** 43-53

#### Problem

Division and experience values are not validated against allowed values, allowing arbitrary strings to be stored.

#### Current Code

```typescript
if (
  typeof targetTime !== 'number' ||
  typeof division !== 'string' ||  // Any string accepted
  typeof fiveKTime !== 'number' ||
  typeof experience !== 'string'   // Any string accepted
) {
```

#### Recommended Fix

```typescript
const VALID_DIVISIONS = ['men_open', 'men_pro', 'women_open', 'women_pro'] as const;
const VALID_EXPERIENCE = ['beginner', 'intermediate', 'advanced'] as const;

type Division = typeof VALID_DIVISIONS[number];
type Experience = typeof VALID_EXPERIENCE[number];

function isValidDivision(value: string): value is Division {
  return VALID_DIVISIONS.includes(value as Division);
}

function isValidExperience(value: string): value is Experience {
  return VALID_EXPERIENCE.includes(value as Experience);
}

// In handler:
if (
  typeof targetTime !== 'number' || targetTime < 30 || targetTime > 300 ||
  typeof division !== 'string' || !isValidDivision(division) ||
  typeof fiveKTime !== 'number' || fiveKTime < 10 || fiveKTime > 60 ||
  typeof experience !== 'string' || !isValidExperience(experience)
) {
  return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
}
```

---

### 11. Missing Request Body Size Limits

**Files:** All API routes
**CWE:** CWE-400 (Uncontrolled Resource Consumption)

#### Problem

No explicit body size limits. Large payloads could cause memory exhaustion.

#### Recommended Fix

```javascript
// next.config.js
module.exports = {
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
};
```

Or in individual routes:
```typescript
export async function POST(request: NextRequest) {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB
    return NextResponse.json(
      { error: 'Request body too large' },
      { status: 413 }
    );
  }
  // ...
}
```

---

### 12. Type Assertions Without Full Validation

**File:** `src/lib/storage.ts`
**Lines:** 60-64

#### Problem

Type assertions bypass TypeScript's type checking, potentially allowing invalid data.

#### Current Code

```typescript
function validateRaceGoal(parsed: unknown): RaceGoal | null {
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'targetTime' in parsed
    // ... partial checks
  ) {
    return parsed as RaceGoal;  // Unsafe assertion
  }
  return null;
}
```

#### Recommended Fix

```typescript
function validateRaceGoal(parsed: unknown): RaceGoal | null {
  if (typeof parsed !== 'object' || parsed === null) return null;

  const obj = parsed as Record<string, unknown>;

  // Validate all required properties and their types
  if (
    typeof obj.targetTime !== 'number' ||
    typeof obj.division !== 'string' ||
    typeof obj.fiveKTime !== 'number' ||
    typeof obj.experience !== 'string' ||
    !VALID_DIVISIONS.includes(obj.division as Division) ||
    !VALID_EXPERIENCE.includes(obj.experience as Experience)
  ) {
    return null;
  }

  return {
    targetTime: obj.targetTime,
    division: obj.division as Division,
    fiveKTime: obj.fiveKTime,
    experience: obj.experience as Experience,
  };
}
```

---

### 13. Race Condition in Session Count

**File:** `src/app/api/sessions/route.ts`
**Lines:** 46-62

#### Problem

Count and delete operations are not atomic; concurrent requests could exceed the session limit.

#### Recommended Fix

Use a transaction or implement optimistic locking:
```typescript
await prisma.$transaction(async (tx) => {
  const sessionCount = await tx.workoutSession.count({
    where: { userId: session.user.id },
  });

  if (sessionCount >= MAX_SESSIONS) {
    // Delete oldest in same transaction
    const oldest = await tx.workoutSession.findFirst({
      where: { userId: session.user.id },
      orderBy: { date: 'asc' },
    });

    if (oldest) {
      await tx.workoutSession.delete({
        where: { id: oldest.id },
      });
    }
  }

  // Create new session
  return tx.workoutSession.create({
    data: { /* ... */ },
  });
});
```

---

## Low Priority Issues

### 14. Missing React.memo Optimization

**File:** `src/components/RaceSimulator.tsx`
**Lines:** 9-43

SVG icon components re-render unnecessarily:
```typescript
// Add React.memo to prevent unnecessary re-renders
const RankingIconSVG = React.memo(function RankingIconSVG({
  icon,
  className = "w-6 h-6"
}: { icon: RankingIcon; className?: string }) {
  // ... implementation
});
```

---

### 15. Mixed Storage Logic in Components

**File:** `src/components/RaceSimulator.tsx`
**Lines:** 253-284

Components directly import and call storage functions. Consider using callbacks or context for better testability and separation of concerns.

---

### 16. Missing API Documentation

Consider adding JSDoc comments or implementing OpenAPI/Swagger documentation for API routes.

---

## Positive Findings

The codebase demonstrates several security best practices:

| Practice | Implementation | Status |
|----------|---------------|--------|
| Password Hashing | bcrypt with cost factor 12 | Excellent |
| SQL Injection Prevention | Prisma ORM parameterized queries | Excellent |
| Session Verification | All API routes check session | Good |
| Secure ID Generation | crypto.randomUUID() | Good |
| Safe JSON Parsing | try-catch blocks in storage | Good |
| No XSS Vectors | No dangerouslySetInnerHTML | Good |
| Type Safety | TypeScript throughout | Good |
| Session Limits | MAX_SESSIONS constant | Good |
| Cascade Deletes | Proper FK cascades in Prisma | Good |

---

## Implementation Roadmap

### Week 1 (Critical)
- [ ] Implement rate limiting on `/api/auth/register`
- [ ] Implement rate limiting on NextAuth sign-in
- [ ] Add server-side password validation with Zod
- [ ] Fix timing attack in authentication

### Week 2-3 (High/Medium)
- [ ] Add Content Security Policy headers
- [ ] Wrap delete/create operations in transactions
- [ ] Add input validation for enum values
- [ ] Set up Jest and write initial tests
- [ ] Add request body size limits

### Month 1 (Medium/Low)
- [ ] Achieve 50% test coverage on critical paths
- [ ] Add React.memo optimizations
- [ ] Implement API documentation
- [ ] Security audit of all API endpoints

---

## Testing Checklist

After implementing fixes, verify:

- [ ] `npm run build` completes without errors
- [ ] Rate limiting blocks after 5 registration attempts
- [ ] Weak passwords are rejected on both client and server
- [ ] Invalid enum values return 400 errors
- [ ] Database transactions rollback on partial failure
- [ ] CSP headers present in browser dev tools
- [ ] All existing functionality still works

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [CWE Database](https://cwe.mitre.org/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
