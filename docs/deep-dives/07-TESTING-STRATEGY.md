# Testing Strategy Deep Dive

**Document Version:** 1.0
**Last Updated:** 2026-05-11

---

## Table of Contents
1. [Testing Philosophy](#testing-philosophy)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [API Testing](#api-testing)
6. [Database Testing](#database-testing)
7. [Performance Testing](#performance-testing)
8. [Security Testing](#security-testing)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Test Coverage Goals](#test-coverage-goals)

---

## Testing Philosophy

### Testing Pyramid

```
         ┌─────────────┐
         │     E2E     │  10% - Critical user flows
         │   (Slow)    │
         ├─────────────┤
         │ Integration │  30% - API + DB interactions
         │  (Medium)   │
         ├─────────────┤
         │    Unit     │  60% - Business logic
         │   (Fast)    │
         └─────────────┘
```

### Principles

1. **Fast Feedback**: Unit tests run in < 1s, full suite < 5min
2. **Isolation**: Tests don't depend on each other
3. **Repeatability**: Same results every time
4. **Clarity**: Test names describe what they test
5. **Coverage**: Focus on critical paths, not 100%

---

## Unit Testing

### Setup

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
npm install --save-dev jest-environment-jsdom
```

```typescript
// jest.config.js

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThresholds: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

### Testing Recommendation Algorithm

```typescript
// lib/services/__tests__/RecommendationService.test.ts

import { RecommendationService } from '../RecommendationService'
import { createMockUser, createMockRoster } from '@/lib/test-utils/mocks'

describe('RecommendationService', () => {
  let service: RecommendationService

  beforeEach(() => {
    service = new RecommendationService()
  })

  describe('extractUserFeatures', () => {
    it('should calculate average scores correctly', async () => {
      const roster = [
        { attraction_score: 8, personality_score: 9, reliability_score: 7 },
        { attraction_score: 6, personality_score: 7, reliability_score: 8 },
        { attraction_score: 10, personality_score: 8, reliability_score: 9 },
      ]

      const features = await service.extractUserFeatures('user-1', roster)

      expect(features.avgAttractionScore).toBe(8)
      expect(features.avgPersonalityScore).toBe(8)
      expect(features.avgReliabilityScore).toBe(8)
    })

    it('should calculate tier distribution', async () => {
      const roster = [
        { tier: 'S' },
        { tier: 'S' },
        { tier: 'A' },
        { tier: 'B' },
      ]

      const features = await service.extractUserFeatures('user-1', roster)

      expect(features.tierDistribution).toEqual({
        S: 0.5,
        A: 0.25,
        B: 0.25,
        C: 0,
      })
    })

    it('should handle empty roster', async () => {
      const features = await service.extractUserFeatures('user-1', [])

      expect(features.rosterSize).toBe(0)
      expect(features.avgAttractionScore).toBeNaN() // Or 0, depending on implementation
    })
  })

  describe('calculateUserSimilarity', () => {
    it('should return high similarity for users with similar tastes', () => {
      const userA = {
        avgAttractionScore: 8,
        avgPersonalityScore: 9,
        avgReliabilityScore: 7,
        tierDistribution: { S: 0.5, A: 0.3, B: 0.2, C: 0 },
        hangSuccessRate: 0.8,
      }

      const userB = {
        avgAttractionScore: 8.5,
        avgPersonalityScore: 8.5,
        avgReliabilityScore: 7.5,
        tierDistribution: { S: 0.4, A: 0.4, B: 0.2, C: 0 },
        hangSuccessRate: 0.75,
      }

      const similarity = service.calculateUserSimilarity(userA, userB)

      expect(similarity).toBeGreaterThan(0.8)
    })

    it('should return low similarity for users with different tastes', () => {
      const userA = {
        avgAttractionScore: 8,
        avgPersonalityScore: 9,
        avgReliabilityScore: 7,
        tierDistribution: { S: 0.8, A: 0.2, B: 0, C: 0 },
        hangSuccessRate: 0.9,
      }

      const userB = {
        avgAttractionScore: 4,
        avgPersonalityScore: 5,
        avgReliabilityScore: 4,
        tierDistribution: { S: 0, A: 0, B: 0.3, C: 0.7 },
        hangSuccessRate: 0.3,
      }

      const similarity = service.calculateUserSimilarity(userA, userB)

      expect(similarity).toBeLessThan(0.4)
    })
  })

  describe('calculateHybridScore', () => {
    it('should weigh collaborative filtering higher for multiple sources', async () => {
      const candidate = {
        name: 'Alex',
        sourceFriends: [
          { friendId: 'f1', similarity: 0.9 },
          { friendId: 'f2', similarity: 0.85 },
          { friendId: 'f3', similarity: 0.8 },
        ],
        weightedScores: {
          attraction: 9,
          personality: 8.5,
          reliability: 9,
        },
        anonymizedTraits: {
          compositeScore: 8.8,
        },
      }

      const score = await service.calculateHybridScore(
        candidate,
        'user-1',
        mockSimilarUsers,
        mockUserFeatures
      )

      expect(score.confidence).toBeGreaterThan(0.85)
      expect(score.breakdown.socialProof).toBeGreaterThan(0.8)
    })

    it('should generate appropriate reasoning', async () => {
      const candidate = {
        name: 'Taylor',
        sourceFriends: [{ friendId: 'f1', friendName: 'Mike', similarity: 0.9 }],
        weightedScores: {
          attraction: 8,
          personality: 9,
          reliability: 8,
        },
      }

      const score = await service.calculateHybridScore(
        candidate,
        'user-1',
        mockSimilarUsers,
        mockUserFeatures
      )

      expect(score.reasoning.matchPoints).toContain(
        expect.stringContaining('Mike')
      )
      expect(score.reasoning.socialProof).toContain('1 friend')
    })
  })

  describe('diversifyRecommendations', () => {
    it('should select diverse recommendations', () => {
      const recommendations = [
        {
          id: '1',
          name: 'Person1',
          confidence: 0.95,
          predictedScores: { attraction: 9, personality: 9, reliability: 8 },
        },
        {
          id: '2',
          name: 'Person2',
          confidence: 0.93,
          predictedScores: { attraction: 9, personality: 8.5, reliability: 8 },
        },
        {
          id: '3',
          name: 'Person3',
          confidence: 0.90,
          predictedScores: { attraction: 6, personality: 9, reliability: 9 },
        },
        {
          id: '4',
          name: 'Person4',
          confidence: 0.88,
          predictedScores: { attraction: 5, personality: 6, reliability: 9 },
        },
      ]

      const diversified = service.diversifyRecommendations(recommendations, 3)

      // Should include high confidence + diverse options
      expect(diversified).toHaveLength(3)
      expect(diversified[0].id).toBe('1') // Highest confidence
      expect(diversified).toContainEqual(
        expect.objectContaining({ id: '3' })
      ) // Different profile
    })
  })
})
```

### Testing React Components

```typescript
// components/discover/__tests__/RecommendationCard.test.tsx

import { render, screen, fireEvent, waitFor } from '@/lib/test-utils/testing'
import { RecommendationCard } from '../RecommendationCard'

describe('RecommendationCard', () => {
  const mockRecommendation = {
    id: 'rec-1',
    personName: 'Alex Rodriguez',
    confidenceScore: 0.92,
    predictedScores: {
      attraction: 8.5,
      personality: 9.0,
      reliability: 8.0,
      composite: 8.5,
    },
    reasoning: {
      matchPoints: [
        '3 friends rated 8.5/10 average',
        'Similar to your Sarah (9/10)',
        'High personality scores',
      ],
      similarTo: ['Sarah'],
      socialProof: '3 friends rated 8.5/10 average',
      predictedScores: { attraction: 8.5, personality: 9.0, reliability: 8.0 },
    },
    sourceType: 'friend_similar',
    sourceFriendCount: 3,
  }

  const mockOnAdd = jest.fn()
  const mockOnDismiss = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders recommendation details correctly', () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onAdd={mockOnAdd}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.getByText('Alex Rodriguez')).toBeInTheDocument()
    expect(screen.getByText('92% Match')).toBeInTheDocument()
    expect(screen.getByText('8.5')).toBeInTheDocument() // Composite score
  })

  it('shows match points', () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onAdd={mockOnAdd}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.getByText(/3 friends rated 8.5/)).toBeInTheDocument()
    expect(screen.getByText(/Similar to your Sarah/)).toBeInTheDocument()
  })

  it('calls onAdd when Add to Roster is clicked', async () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onAdd={mockOnAdd}
        onDismiss={mockOnDismiss}
      />
    )

    const addButton = screen.getByText('Add to Roster')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith('rec-1')
    })
  })

  it('calls onDismiss when Not Interested is clicked', async () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onAdd={mockOnAdd}
        onDismiss={mockOnDismiss}
      />
    )

    const dismissButton = screen.getByText('Not Interested')
    fireEvent.click(dismissButton)

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledWith('rec-1')
    })
  })

  it('expands to show all match points', () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onAdd={mockOnAdd}
        onDismiss={mockOnDismiss}
      />
    )

    // Initially shows only 2 match points
    expect(screen.queryByText('High personality scores')).not.toBeInTheDocument()

    // Click to expand
    const expandButton = screen.getByText(/Show \d+ more reason/)
    fireEvent.click(expandButton)

    // Now shows all match points
    expect(screen.getByText('High personality scores')).toBeInTheDocument()
  })

  it('disables buttons while loading', async () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onAdd={mockOnAdd}
        onDismiss={mockOnDismiss}
      />
    )

    const addButton = screen.getByText('Add to Roster')
    fireEvent.click(addButton)

    // Button should be disabled during loading
    expect(addButton).toBeDisabled()
    expect(screen.getByText('Adding...')).toBeInTheDocument()
  })
})
```

---

## Integration Testing

### API Integration Tests

```typescript
// __tests__/api/connections.test.ts

import { createMocks } from 'node-mocks-http'
import { POST } from '@/app/api/connections/request/route'
import { createTestUser, cleanupTestData } from '@/lib/test-utils/db'

describe('/api/connections/request', () => {
  let testUser1: any
  let testUser2: any

  beforeAll(async () => {
    testUser1 = await createTestUser({ username: 'testuser1' })
    testUser2 = await createTestUser({ username: 'testuser2' })
  })

  afterAll(async () => {
    await cleanupTestData([testUser1.id, testUser2.id])
  })

  it('should send friend request successfully', async () => {
    const { req } = createMocks({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUser1.token}`,
      },
      body: {
        friendId: testUser2.id,
      },
    })

    const response = await POST(req as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.status).toBe('pending')
  })

  it('should reject self-friend request', async () => {
    const { req } = createMocks({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUser1.token}`,
      },
      body: {
        friendId: testUser1.id, // Same as requester
      },
    })

    const response = await POST(req as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('INVALID_REQUEST')
  })

  it('should reject duplicate friend request', async () => {
    // Send first request
    await POST(
      createMocks({
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testUser1.token}`,
        },
        body: { friendId: testUser2.id },
      }).req as any
    )

    // Try to send again
    const response = await POST(
      createMocks({
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testUser1.token}`,
        },
        body: { friendId: testUser2.id },
      }).req as any
    )

    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('REQUEST_PENDING')
  })

  it('should enforce rate limiting', async () => {
    // Send 11 requests (limit is 10 per hour)
    const requests = Array(11)
      .fill(null)
      .map((_, i) =>
        POST(
          createMocks({
            method: 'POST',
            headers: {
              Authorization: `Bearer ${testUser1.token}`,
            },
            body: { friendId: `random-user-${i}` },
          }).req as any
        )
      )

    const responses = await Promise.all(requests)
    const lastResponse = responses[responses.length - 1]

    expect(lastResponse.status).toBe(429)
  })
})
```

### Database Integration Tests

```typescript
// lib/services/__tests__/ConnectionService.integration.test.ts

import { createClient } from '@/lib/supabase/server'
import { ConnectionService } from '../ConnectionService'
import { createTestUser, cleanupTestData } from '@/lib/test-utils/db'

describe('ConnectionService (Integration)', () => {
  let service: ConnectionService
  let supabase: any
  let user1: any
  let user2: any

  beforeAll(async () => {
    supabase = createClient()
    service = new ConnectionService()

    user1 = await createTestUser()
    user2 = await createTestUser()
  })

  afterAll(async () => {
    await cleanupTestData([user1.id, user2.id])
  })

  it('should create and retrieve friend connections', async () => {
    // Send request
    const connection = await service.sendFriendRequest(user1.id, user2.id)

    expect(connection.status).toBe('pending')

    // Retrieve pending requests
    const pending = await service.getPendingRequests(user2.id)

    expect(pending).toHaveLength(1)
    expect(pending[0].id).toBe(connection.id)
  })

  it('should accept friend request', async () => {
    // Create pending request
    const connection = await service.sendFriendRequest(user1.id, user2.id)

    // Accept request
    await service.acceptFriendRequest(user2.id, connection.id)

    // Verify connection is now accepted
    const friends = await service.getFriends(user1.id)

    expect(friends).toHaveLength(1)
    expect(friends[0].friend.id).toBe(user2.id)
  })

  it('should handle concurrent friend requests gracefully', async () => {
    // Both users send requests to each other simultaneously
    const [conn1, conn2] = await Promise.all([
      service.sendFriendRequest(user1.id, user2.id),
      service.sendFriendRequest(user2.id, user1.id),
    ])

    // Only one should succeed (or merge into single connection)
    const user1Friends = await service.getFriends(user1.id)
    const user2Friends = await service.getFriends(user2.id)

    // After accepting, both should see each other as friends
    if (conn1) await service.acceptFriendRequest(user2.id, conn1.id)
    if (conn2) await service.acceptFriendRequest(user1.id, conn2.id)

    const finalUser1Friends = await service.getFriends(user1.id)
    const finalUser2Friends = await service.getFriends(user2.id)

    expect(finalUser1Friends).toHaveLength(1)
    expect(finalUser2Friends).toHaveLength(1)
  })
})
```

---

## End-to-End Testing

### Playwright Setup

```bash
npm install --save-dev @playwright/test
npx playwright install
```

```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### E2E Test: Friend Request Flow

```typescript
// e2e/friend-request-flow.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Friend Request Flow', () => {
  test('complete friend request lifecycle', async ({ page, context }) => {
    // User 1: Login and send friend request
    await page.goto('/')
    await page.click('text=Continue with Google')
    // ... handle OAuth flow (use test accounts)

    // Navigate to friends page
    await page.click('text=Friends')

    // Add friend
    await page.click('text=+ Add Friend')
    await page.fill('input[name="username"]', 'testuser2')
    await page.click('text=Send Request')

    // Verify request sent
    await expect(page.locator('text=Request sent')).toBeVisible()

    // User 2: Open in new tab, login, and accept request
    const page2 = await context.newPage()
    await page2.goto('/')
    // ... login as user 2

    // Go to friends page
    await page2.click('text=Friends')

    // Should see pending request
    await expect(
      page2.locator('text=testuser1 wants to connect')
    ).toBeVisible()

    // Accept request
    await page2.click('text=Accept')

    // Verify friend appears in list
    await expect(page2.locator('text=testuser1')).toBeVisible()

    // Switch back to user 1
    await page.reload()
    await expect(page.locator('text=testuser2')).toBeVisible()
  })
})
```

### E2E Test: Recommendation Flow

```typescript
// e2e/recommendation-flow.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Recommendation Flow', () => {
  test('user receives and acts on recommendations', async ({ page }) => {
    // Setup: Login as user with sufficient roster data
    await page.goto('/')
    await loginAsTestUser(page, 'user_with_data')

    // Navigate to Discover page
    await page.click('text=Discover')

    // Wait for recommendations to load
    await expect(page.locator('[data-testid="recommendation-card"]')).toBeVisible()

    // Verify recommendation details
    const firstRec = page.locator('[data-testid="recommendation-card"]').first()
    await expect(firstRec.locator('text=/\\d+% Match/')).toBeVisible()
    await expect(firstRec.locator('text=/Predicted Scores/')).toBeVisible()

    // Add recommendation to roster
    await firstRec.locator('text=Add to Roster').click()

    // Fill in initial scores
    await page.fill('input[name="attraction_score"]', '8')
    await page.fill('input[name="personality_score"]', '9')
    await page.fill('input[name="reliability_score"]', '7')
    await page.click('text=Add to Roster')

    // Verify added to roster
    await page.click('text=Roster')
    await expect(page.locator('text=Alex Rodriguez')).toBeVisible()

    // Verify source attribution
    await page.click('text=Alex Rodriguez')
    await expect(page.locator('text=Added from: Mike\'s recommendation')).toBeVisible()
  })
})
```

---

## API Testing

### REST API Tests with Supertest

```typescript
// __tests__/api/recommendations.api.test.ts

import request from 'supertest'
import { createTestUser } from '@/lib/test-utils/db'

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000'

describe('Recommendations API', () => {
  let testUser: any

  beforeAll(async () => {
    testUser = await createTestUser()
  })

  describe('GET /api/recommendations', () => {
    it('should return recommendations for authenticated user', async () => {
      const response = await request(API_URL)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.meta).toHaveProperty('total')
      expect(response.body.meta).toHaveProperty('hasMore')
    })

    it('should reject unauthenticated requests', async () => {
      await request(API_URL)
        .get('/api/recommendations')
        .expect(401)
    })

    it('should support pagination', async () => {
      const page1 = await request(API_URL)
        .get('/api/recommendations?limit=5&offset=0')
        .set('Authorization', `Bearer ${testUser.token}`)

      const page2 = await request(API_URL)
        .get('/api/recommendations?limit=5&offset=5')
        .set('Authorization', `Bearer ${testUser.token}`)

      // Pages should have different items
      expect(page1.body.data).not.toEqual(page2.body.data)
    })

    it('should filter by confidence threshold', async () => {
      const response = await request(API_URL)
        .get('/api/recommendations?minConfidence=0.9')
        .set('Authorization', `Bearer ${testUser.token}`)

      expect(response.body.success).toBe(true)
      response.body.data.forEach((rec: any) => {
        expect(rec.confidenceScore).toBeGreaterThanOrEqual(0.9)
      })
    })
  })

  describe('POST /api/recommendations/refresh', () => {
    it('should generate new recommendations', async () => {
      const response = await request(API_URL)
        .post('/api/recommendations/refresh')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.count).toBeGreaterThan(0)
    })

    it('should enforce rate limiting', async () => {
      // Make 4 requests (limit is 3 per hour)
      await request(API_URL)
        .post('/api/recommendations/refresh')
        .set('Authorization', `Bearer ${testUser.token}`)

      await request(API_URL)
        .post('/api/recommendations/refresh')
        .set('Authorization', `Bearer ${testUser.token}`)

      await request(API_URL)
        .post('/api/recommendations/refresh')
        .set('Authorization', `Bearer ${testUser.token}`)

      // 4th request should be rate limited
      await request(API_URL)
        .post('/api/recommendations/refresh')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(429)
    })
  })
})
```

---

## Database Testing

### RLS Policy Testing

```sql
-- Test RLS policies for connections table

-- Setup test users
INSERT INTO auth.users (id, email) VALUES
  ('test-user-1', 'user1@test.com'),
  ('test-user-2', 'user2@test.com'),
  ('test-user-3', 'user3@test.com');

-- Test: User can see their own connections
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = 'test-user-1';

SELECT * FROM connections WHERE user_id = 'test-user-1';
-- Should return results

-- Test: User cannot see other users' connections
SELECT * FROM connections WHERE user_id = 'test-user-2';
-- Should return 0 rows (or error depending on policy)

-- Test: Friend can see connection
INSERT INTO connections (user_id, friend_id, status)
VALUES ('test-user-1', 'test-user-2', 'accepted');

SET LOCAL request.jwt.claims.sub = 'test-user-2';
SELECT * FROM connections WHERE user_id = 'test-user-1';
-- Should return the connection

-- Test: Non-friend cannot see connection
SET LOCAL request.jwt.claims.sub = 'test-user-3';
SELECT * FROM connections WHERE user_id = 'test-user-1';
-- Should return 0 rows

-- Cleanup
DELETE FROM connections WHERE user_id IN ('test-user-1', 'test-user-2');
DELETE FROM auth.users WHERE id LIKE 'test-user-%';
```

---

## Security Testing

### Penetration Testing Checklist

**Authentication:**
- [ ] SQL injection in login form
- [ ] Brute force protection
- [ ] Session fixation
- [ ] JWT token manipulation
- [ ] OAuth flow vulnerabilities

**Authorization:**
- [ ] Horizontal privilege escalation (access other users' data)
- [ ] Vertical privilege escalation (access admin functions)
- [ ] IDOR (Insecure Direct Object Reference)
- [ ] Path traversal

**Input Validation:**
- [ ] XSS in text fields
- [ ] HTML injection
- [ ] Command injection
- [ ] File upload vulnerabilities
- [ ] NoSQL/SQL injection

**API Security:**
- [ ] Rate limiting bypass
- [ ] CSRF protection
- [ ] API key exposure
- [ ] Mass assignment

**Testing Tools:**
- OWASP ZAP for automated scanning
- Burp Suite for manual testing
- SQLMap for SQL injection
- XSSer for XSS testing

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml

name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  security-scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Run npm audit
        run: npm audit --audit-level=moderate
```

---

## Test Coverage Goals

### Coverage Targets

| Component | Target Coverage |
|-----------|----------------|
| Recommendation Algorithm | 90% |
| API Routes | 85% |
| Services (Business Logic) | 85% |
| Components | 70% |
| Utilities | 80% |
| **Overall** | **75%** |

### Measuring Coverage

```bash
# Run tests with coverage
npm run test:coverage

# Generate HTML report
npm run test:coverage -- --coverage --coverageReporters=html

# View report
open coverage/index.html
```

### Critical Paths (Must Have 100% Coverage)

1. **Authentication & Authorization**
   - Login/logout flow
   - JWT token validation
   - RLS policy enforcement

2. **Payment Processing** (if applicable)
   - Payment handling
   - Subscription management

3. **Data Privacy**
   - Privacy settings enforcement
   - Data anonymization in recommendations
   - GDPR data export/deletion

4. **Security**
   - Input validation
   - SQL injection prevention
   - XSS protection

---

**Testing Checklist:**

- [ ] Unit tests for all services
- [ ] Integration tests for all API endpoints
- [ ] E2E tests for critical user flows
- [ ] RLS policies tested
- [ ] Security vulnerabilities scanned
- [ ] Performance tests passed
- [ ] Coverage targets met
- [ ] CI/CD pipeline configured
- [ ] Manual QA completed
- [ ] Accessibility tested (WCAG 2.1 AA)

---

*End of Testing Strategy Deep Dive*
