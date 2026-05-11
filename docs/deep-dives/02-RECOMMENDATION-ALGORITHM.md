# Recommendation Algorithm Deep Dive

**Document Version:** 1.0
**Last Updated:** 2026-05-11

---

## Table of Contents
1. [Algorithm Overview](#algorithm-overview)
2. [Data Preparation](#data-preparation)
3. [Collaborative Filtering](#collaborative-filtering)
4. [Content-Based Filtering](#content-based-filtering)
5. [Hybrid Scoring](#hybrid-scoring)
6. [Ranking & Diversity](#ranking--diversity)
7. [Implementation Code](#implementation-code)
8. [Performance Optimization](#performance-optimization)
9. [A/B Testing Framework](#ab-testing-framework)
10. [Evaluation Metrics](#evaluation-metrics)

---

## Algorithm Overview

### High-Level Flow

```
User Action (new hang, roster update)
         ↓
Extract User Preference Profile
         ↓
Find Similar Users (Collaborative)
         ↓
Extract Candidates from Similar Users
         ↓
Score Each Candidate (Hybrid)
         ↓
Rank & Diversify Results
         ↓
Store in recommendations table
         ↓
Present to User
```

### Core Principles

1. **Explainability**: Every recommendation must have clear reasoning
2. **Privacy**: Never expose raw data, only aggregates
3. **Diversity**: Don't show 20 similar recommendations
4. **Freshness**: Update recommendations as data changes
5. **Cold Start**: Handle new users gracefully

### Mathematical Foundation

**Hybrid Score** = α·CF_score + β·CB_score + γ·Social_score + δ·Temporal_score

Where:
- CF_score: Collaborative filtering score
- CB_score: Content-based score
- Social_score: Social proof from friends
- Temporal_score: Recency and timing factors
- α, β, γ, δ: Tunable weights (sum to 1.0)

Default weights:
- α = 0.40 (collaborative)
- β = 0.30 (content)
- γ = 0.20 (social)
- δ = 0.10 (temporal)

---

## Data Preparation

### User Feature Vector

```typescript
interface UserFeatureVector {
  // Basic Stats
  rosterSize: number
  totalHangs: number
  avgHangsPerPerson: number

  // Score Preferences
  avgAttractionScore: number
  avgPersonalityScore: number
  avgReliabilityScore: number
  stdDevAttraction: number
  stdDevPersonality: number
  stdDevReliability: number

  // Tier Distribution (normalized)
  tierDistribution: {
    S: number  // 0-1
    A: number
    B: number
    C: number
  }

  // Status Distribution
  statusDistribution: {
    New: number
    Chatting: number
    MetOnce: number
    Regular: number
  }

  // Behavioral Patterns
  avgDaysBetweenHangs: number
  hangSuccessRate: number // % of hangs that increased scores
  preferredHangTimes: string[] // ['Friday evening', 'Saturday afternoon']

  // Score Weights (inferred from hang outcomes)
  scoreWeights: {
    attraction: number  // 0-1, sum to 1
    personality: number
    reliability: number
  }

  // Top People Characteristics
  topPeopleAvgScores: {
    attraction: number
    personality: number
    reliability: number
  }
}
```

### Extracting User Features

```typescript
async function extractUserFeatures(userId: string): Promise<UserFeatureVector> {
  // Fetch user's roster
  const roster = await supabase
    .from('roster')
    .select('*')
    .eq('user_id', userId)
    .gte('attraction_score', 1) // exclude unrated

  // Fetch user's hangs
  const hangs = await supabase
    .from('hangs')
    .select('*')
    .eq('user_id', userId)
    .order('hang_date', { ascending: false })

  // Calculate basic stats
  const rosterSize = roster.length
  const totalHangs = hangs.length
  const avgHangsPerPerson = totalHangs / Math.max(rosterSize, 1)

  // Score statistics
  const attractionScores = roster.map(p => p.attraction_score)
  const personalityScores = roster.map(p => p.personality_score)
  const reliabilityScores = roster.map(p => p.reliability_score)

  const avgAttraction = mean(attractionScores)
  const avgPersonality = mean(personalityScores)
  const avgReliability = mean(reliabilityScores)

  const stdDevAttraction = standardDeviation(attractionScores)
  const stdDevPersonality = standardDeviation(personalityScores)
  const stdDevReliability = standardDeviation(reliabilityScores)

  // Tier distribution (normalized)
  const tierCounts = countBy(roster, 'tier')
  const tierDistribution = {
    S: (tierCounts.S || 0) / rosterSize,
    A: (tierCounts.A || 0) / rosterSize,
    B: (tierCounts.B || 0) / rosterSize,
    C: (tierCounts.C || 0) / rosterSize,
  }

  // Status distribution
  const statusCounts = countBy(roster, 'status')
  const statusDistribution = {
    New: (statusCounts.New || 0) / rosterSize,
    Chatting: (statusCounts.Chatting || 0) / rosterSize,
    MetOnce: (statusCounts['Met Once'] || 0) / rosterSize,
    Regular: (statusCounts.Regular || 0) / rosterSize,
  }

  // Behavioral patterns
  const hangDates = hangs.map(h => new Date(h.hang_date))
  const avgDaysBetweenHangs = calculateAvgDaysBetween(hangDates)

  const positiveHangs = hangs.filter(h =>
    h.attraction_change > 0 || h.personality_change > 0 || h.reliability_change > 0
  )
  const hangSuccessRate = positiveHangs.length / Math.max(totalHangs, 1)

  // Infer score weights from hang outcomes
  const totalPositiveChange = positiveHangs.reduce((sum, h) =>
    sum + Math.abs(h.attraction_change) + Math.abs(h.personality_change) + Math.abs(h.reliability_change),
    0
  )

  const scoreWeights = {
    attraction: positiveHangs.reduce((sum, h) => sum + Math.abs(h.attraction_change), 0) / totalPositiveChange,
    personality: positiveHangs.reduce((sum, h) => sum + Math.abs(h.personality_change), 0) / totalPositiveChange,
    reliability: positiveHangs.reduce((sum, h) => sum + Math.abs(h.reliability_change), 0) / totalPositiveChange,
  }

  // Top people characteristics (top 20%)
  const topRoster = roster
    .sort((a, b) => calculateCompositeScore(b) - calculateCompositeScore(a))
    .slice(0, Math.max(1, Math.ceil(rosterSize * 0.2)))

  const topPeopleAvgScores = {
    attraction: mean(topRoster.map(p => p.attraction_score)),
    personality: mean(topRoster.map(p => p.personality_score)),
    reliability: mean(topRoster.map(p => p.reliability_score)),
  }

  return {
    rosterSize,
    totalHangs,
    avgHangsPerPerson,
    avgAttractionScore: avgAttraction,
    avgPersonalityScore: avgPersonality,
    avgReliabilityScore: avgReliability,
    stdDevAttraction,
    stdDevPersonality,
    stdDevReliability,
    tierDistribution,
    statusDistribution,
    avgDaysBetweenHangs,
    hangSuccessRate,
    scoreWeights,
    topPeopleAvgScores,
  }
}
```

---

## Collaborative Filtering

### User-User Similarity

Calculate similarity between users based on their rating patterns.

#### Pearson Correlation

For users with overlapping roster entries:

```typescript
function calculatePearsonCorrelation(
  userA: RosterPerson[],
  userB: RosterPerson[]
): number {
  // Find common people (by name)
  const commonPeople = findCommonPeople(userA, userB)

  if (commonPeople.length < 2) {
    return 0 // Not enough overlap
  }

  const scoresA = commonPeople.map(p => calculateCompositeScore(p.fromA))
  const scoresB = commonPeople.map(p => calculateCompositeScore(p.fromB))

  const meanA = mean(scoresA)
  const meanB = mean(scoresB)

  let numerator = 0
  let denomA = 0
  let denomB = 0

  for (let i = 0; i < scoresA.length; i++) {
    const diffA = scoresA[i] - meanA
    const diffB = scoresB[i] - meanB
    numerator += diffA * diffB
    denomA += diffA * diffA
    denomB += diffB * diffB
  }

  const denominator = Math.sqrt(denomA * denomB)

  if (denominator === 0) return 0

  return numerator / denominator // Range: -1 to 1
}
```

#### Cosine Similarity

For users without overlapping roster (use feature vectors):

```typescript
function calculateCosineSimilarity(
  featuresA: UserFeatureVector,
  featuresB: UserFeatureVector
): number {
  // Convert features to vectors
  const vectorA = [
    featuresA.avgAttractionScore / 10,
    featuresA.avgPersonalityScore / 10,
    featuresA.avgReliabilityScore / 10,
    featuresA.tierDistribution.S,
    featuresA.tierDistribution.A,
    featuresA.tierDistribution.B,
    featuresA.tierDistribution.C,
    featuresA.hangSuccessRate,
  ]

  const vectorB = [
    featuresB.avgAttractionScore / 10,
    featuresB.avgPersonalityScore / 10,
    featuresB.avgReliabilityScore / 10,
    featuresB.tierDistribution.S,
    featuresB.tierDistribution.A,
    featuresB.tierDistribution.B,
    featuresB.tierDistribution.C,
    featuresB.hangSuccessRate,
  ]

  // Cosine similarity
  const dotProduct = vectorA.reduce((sum, val, i) => sum + val * vectorB[i], 0)
  const magnitudeA = Math.sqrt(vectorA.reduce((sum, val) => sum + val * val, 0))
  const magnitudeB = Math.sqrt(vectorB.reduce((sum, val) => sum + val * val, 0))

  if (magnitudeA === 0 || magnitudeB === 0) return 0

  return dotProduct / (magnitudeA * magnitudeB) // Range: 0 to 1
}
```

#### Finding Similar Users

```typescript
async function findSimilarUsers(
  userId: string,
  limit: number = 10
): Promise<SimilarUser[]> {
  // Get user's features
  const userFeatures = await extractUserFeatures(userId)

  // Get user's roster
  const userRoster = await getUserRoster(userId)

  // Get friends' features
  const friends = await getFriends(userId)

  // Calculate similarity with each friend
  const similarities = await Promise.all(
    friends.map(async (friend) => {
      const friendFeatures = await extractUserFeatures(friend.id)
      const friendRoster = await getUserRoster(friend.id)

      // Try Pearson first (if overlap exists)
      const commonPeople = findCommonPeople(userRoster, friendRoster)
      let similarity = 0

      if (commonPeople.length >= 2) {
        similarity = calculatePearsonCorrelation(userRoster, friendRoster)
        // Normalize from [-1, 1] to [0, 1]
        similarity = (similarity + 1) / 2
      } else {
        // Fall back to cosine similarity on features
        similarity = calculateCosineSimilarity(userFeatures, friendFeatures)
      }

      return {
        friend,
        similarity,
        features: friendFeatures,
        roster: friendRoster,
        overlapCount: commonPeople.length,
      }
    })
  )

  // Filter and sort
  return similarities
    .filter(s => s.similarity > 0.5) // Minimum similarity threshold
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
}
```

### Candidate Generation from Similar Users

```typescript
async function getCandidatesFromSimilarUsers(
  similarUsers: SimilarUser[],
  userId: string
): Promise<CandidatePerson[]> {
  const userRosterNames = await getUserRosterNames(userId)

  const candidates: Map<string, CandidatePerson> = new Map()

  for (const similar of similarUsers) {
    // Get high-quality people from this similar user
    const highQualityPeople = similar.roster.filter(person => {
      const compositeScore = calculateCompositeScore(person)
      return (
        compositeScore >= 7.0 && // High scores only
        !userRosterNames.includes(person.name) && // Not already in user's roster
        person.status !== 'Archived' // Active only
      )
    })

    for (const person of highQualityPeople) {
      const key = person.name.toLowerCase().trim()

      if (!candidates.has(key)) {
        candidates.set(key, {
          name: person.name,
          anonymizedTraits: {
            avgAttraction: person.attraction_score,
            avgPersonality: person.personality_score,
            avgReliability: person.reliability_score,
            compositeScore: calculateCompositeScore(person),
          },
          sourceFriends: [],
          sourceRosterIds: [],
          weightedScores: {
            attraction: 0,
            personality: 0,
            reliability: 0,
          },
          totalWeight: 0,
        })
      }

      const candidate = candidates.get(key)!

      // Add this friend as a source
      candidate.sourceFriends.push({
        friendId: similar.friend.id,
        friendName: similar.friend.display_name,
        similarity: similar.similarity,
      })

      candidate.sourceRosterIds.push(person.id)

      // Weighted average (weight by similarity)
      const weight = similar.similarity
      candidate.weightedScores.attraction += person.attraction_score * weight
      candidate.weightedScores.personality += person.personality_score * weight
      candidate.weightedScores.reliability += person.reliability_score * weight
      candidate.totalWeight += weight
    }
  }

  // Finalize weighted averages
  const candidateArray = Array.from(candidates.values())

  for (const candidate of candidateArray) {
    if (candidate.totalWeight > 0) {
      candidate.weightedScores.attraction /= candidate.totalWeight
      candidate.weightedScores.personality /= candidate.totalWeight
      candidate.weightedScores.reliability /= candidate.totalWeight
    }
  }

  return candidateArray
}
```

---

## Content-Based Filtering

### Person Profile Vector

```typescript
interface PersonProfile {
  attraction: number      // 0-10
  personality: number     // 0-10
  reliability: number     // 0-10
  compositeScore: number  // 0-10
  tier: string           // S, A, B, C
  hangCount: number
  avgHangOutcome: number // avg score change per hang
}
```

### Matching Candidates to User Preferences

```typescript
function calculateContentBasedScore(
  candidate: CandidatePerson,
  userFeatures: UserFeatureVector
): number {
  // 1. Score Similarity (how close to user's preferences)
  const attractionDiff = Math.abs(
    candidate.weightedScores.attraction - userFeatures.topPeopleAvgScores.attraction
  )
  const personalityDiff = Math.abs(
    candidate.weightedScores.personality - userFeatures.topPeopleAvgScores.personality
  )
  const reliabilityDiff = Math.abs(
    candidate.weightedScores.reliability - userFeatures.topPeopleAvgScores.reliability
  )

  // Normalize diffs to [0, 1] (max diff is 10)
  const attractionSimilarity = 1 - (attractionDiff / 10)
  const personalitySimilarity = 1 - (personalityDiff / 10)
  const reliabilitySimilarity = 1 - (reliabilityDiff / 10)

  // Weight by user's inferred preferences
  const weightedSimilarity =
    attractionSimilarity * userFeatures.scoreWeights.attraction +
    personalitySimilarity * userFeatures.scoreWeights.personality +
    reliabilitySimilarity * userFeatures.scoreWeights.reliability

  // 2. Absolute Quality Score
  const compositeScore = (
    candidate.weightedScores.attraction +
    candidate.weightedScores.personality +
    candidate.weightedScores.reliability
  ) / 30 // Normalize to [0, 1]

  // 3. Combine (70% similarity, 30% absolute quality)
  const contentScore = weightedSimilarity * 0.7 + compositeScore * 0.3

  return contentScore // Range: [0, 1]
}
```

---

## Hybrid Scoring

### Combining All Signals

```typescript
interface ScoringWeights {
  collaborative: number  // α
  contentBased: number   // β
  socialProof: number    // γ
  temporal: number       // δ
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  collaborative: 0.40,
  contentBased: 0.30,
  socialProof: 0.20,
  temporal: 0.10,
}

async function calculateHybridScore(
  candidate: CandidatePerson,
  userId: string,
  similarUsers: SimilarUser[],
  userFeatures: UserFeatureVector,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): Promise<RecommendationScore> {
  // 1. Collaborative Filtering Score
  // Based on how many similar users rated this person highly
  const collaborativeScore = calculateCollaborativeScore(candidate, similarUsers)

  // 2. Content-Based Score
  // Based on match with user's preference profile
  const contentScore = calculateContentBasedScore(candidate, userFeatures)

  // 3. Social Proof Score
  // Based on number and quality of friend endorsements
  const socialScore = calculateSocialProofScore(candidate)

  // 4. Temporal Score
  // Based on freshness of data, trending people, etc.
  const temporalScore = calculateTemporalScore(candidate)

  // Weighted combination
  const finalScore =
    collaborativeScore * weights.collaborative +
    contentScore * weights.contentBased +
    socialScore * weights.socialProof +
    temporalScore * weights.temporal

  // Generate reasoning
  const reasoning = generateReasoning(
    candidate,
    { collaborativeScore, contentScore, socialScore, temporalScore },
    userFeatures
  )

  return {
    confidence: finalScore,
    breakdown: {
      collaborative: collaborativeScore,
      contentBased: contentScore,
      socialProof: socialScore,
      temporal: temporalScore,
    },
    reasoning,
  }
}
```

### Collaborative Score

```typescript
function calculateCollaborativeScore(
  candidate: CandidatePerson,
  similarUsers: SimilarUser[]
): number {
  if (candidate.sourceFriends.length === 0) return 0

  // Weighted average of similar users' ratings
  let weightedSum = 0
  let totalWeight = 0

  for (const source of candidate.sourceFriends) {
    // Find this friend in similarUsers
    const similarUser = similarUsers.find(su => su.friend.id === source.friendId)
    if (!similarUser) continue

    // Weight is the similarity score
    const weight = similarUser.similarity

    // Rating is the composite score for this person
    const rating = candidate.anonymizedTraits.compositeScore / 10

    weightedSum += rating * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return 0

  const averageRating = weightedSum / totalWeight

  // Boost if multiple similar users rated
  const agreementBonus = Math.min(0.1, candidate.sourceFriends.length * 0.02)

  return Math.min(1.0, averageRating + agreementBonus)
}
```

### Social Proof Score

```typescript
function calculateSocialProofScore(candidate: CandidatePerson): number {
  const friendCount = candidate.sourceFriends.length

  // Base score from number of friends
  let score = 0

  if (friendCount === 1) score = 0.3
  else if (friendCount === 2) score = 0.6
  else if (friendCount >= 3) score = 0.9

  // Bonus if friends are highly similar to each other (consensus)
  if (friendCount >= 2) {
    const similarities = candidate.sourceFriends.map(sf => sf.similarity)
    const avgSimilarity = mean(similarities)
    const consensusBonus = avgSimilarity * 0.1
    score += consensusBonus
  }

  return Math.min(1.0, score)
}
```

### Temporal Score

```typescript
function calculateTemporalScore(candidate: CandidatePerson): number {
  // For now, simple heuristic based on recency
  // In the future, consider:
  // - Trending people (multiple friends added recently)
  // - Seasonal patterns
  // - Time-of-day preferences

  // Placeholder: higher score for people added recently by friends
  // (Would need to track when friends added people to roster)

  return 0.5 // Neutral for v1
}
```

### Reasoning Generation

```typescript
function generateReasoning(
  candidate: CandidatePerson,
  scores: {
    collaborativeScore: number
    contentScore: number
    socialScore: number
    temporalScore: number
  },
  userFeatures: UserFeatureVector
): RecommendationReasoning {
  const matchPoints: string[] = []
  const similarTo: string[] = []

  // Friend endorsements
  if (candidate.sourceFriends.length === 1) {
    matchPoints.push(
      `${candidate.sourceFriends[0].friendName} rated highly (${candidate.anonymizedTraits.compositeScore.toFixed(1)}/10)`
    )
  } else if (candidate.sourceFriends.length > 1) {
    const topFriends = candidate.sourceFriends
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(sf => sf.friendName)

    matchPoints.push(
      `${topFriends.join(', ')} all rated ${candidate.anonymizedTraits.compositeScore.toFixed(1)}/10 average`
    )
  }

  // Score matching
  const attractionMatch = Math.abs(
    candidate.weightedScores.attraction - userFeatures.topPeopleAvgScores.attraction
  ) < 1.5

  const personalityMatch = Math.abs(
    candidate.weightedScores.personality - userFeatures.topPeopleAvgScores.personality
  ) < 1.5

  const reliabilityMatch = Math.abs(
    candidate.weightedScores.reliability - userFeatures.topPeopleAvgScores.reliability
  ) < 1.5

  if (attractionMatch && personalityMatch && reliabilityMatch) {
    matchPoints.push('Closely matches your top-rated people across all dimensions')
  } else {
    if (personalityMatch) matchPoints.push('Similar personality to your favorites')
    if (reliabilityMatch) matchPoints.push('Similar values to people you rate highly')
    if (attractionMatch) matchPoints.push('Matches your preference for looks')
  }

  // High scores
  if (candidate.weightedScores.personality >= 8.5) {
    matchPoints.push('Exceptionally high personality score')
  }
  if (candidate.weightedScores.reliability >= 8.5) {
    matchPoints.push('Very strong values alignment')
  }

  // Social proof
  if (candidate.sourceFriends.length >= 3) {
    matchPoints.push(`${candidate.sourceFriends.length} friends with similar taste agree`)
  }

  return {
    matchPoints,
    similarTo, // Would need to compare with specific roster entries
    socialProof: `${candidate.sourceFriends.length} friend${candidate.sourceFriends.length === 1 ? '' : 's'} rated ${candidate.anonymizedTraits.compositeScore.toFixed(1)}/10 average`,
    predictedScores: {
      attraction: candidate.weightedScores.attraction,
      personality: candidate.weightedScores.personality,
      reliability: candidate.weightedScores.reliability,
    },
  }
}
```

---

## Ranking & Diversity

### Diversity Algorithm

Ensure recommendations aren't all similar:

```typescript
function diversifyRecommendations(
  recommendations: Recommendation[],
  targetCount: number = 10
): Recommendation[] {
  if (recommendations.length <= targetCount) {
    return recommendations
  }

  // Start with highest confidence
  const selected: Recommendation[] = [recommendations[0]]

  // For remaining slots, balance confidence with diversity
  const remaining = recommendations.slice(1)

  for (let i = 1; i < targetCount; i++) {
    let bestCandidate: Recommendation | null = null
    let bestScore = -Infinity

    for (const candidate of remaining) {
      // Skip if already selected
      if (selected.includes(candidate)) continue

      // Calculate diversity score
      const minDiversity = Math.min(
        ...selected.map(s => calculateDiversity(candidate, s))
      )

      // Combined score: 60% confidence, 40% diversity
      const combinedScore = candidate.confidence * 0.6 + minDiversity * 0.4

      if (combinedScore > bestScore) {
        bestScore = combinedScore
        bestCandidate = candidate
      }
    }

    if (bestCandidate) {
      selected.push(bestCandidate)
    } else {
      break
    }
  }

  return selected
}

function calculateDiversity(
  rec1: Recommendation,
  rec2: Recommendation
): number {
  // Calculate how different two recommendations are
  const scoreDiff = Math.abs(
    rec1.predictedScores.attraction - rec2.predictedScores.attraction +
    rec1.predictedScores.personality - rec2.predictedScores.personality +
    rec1.predictedScores.reliability - rec2.predictedScores.reliability
  ) / 30

  // Check if from same friends
  const sharedFriends = rec1.sourceFriends.filter(f1 =>
    rec2.sourceFriends.some(f2 => f2.friendId === f1.friendId)
  ).length

  const friendDiversity = 1 - (sharedFriends / Math.max(rec1.sourceFriends.length, rec2.sourceFriends.length))

  return (scoreDiff * 0.5 + friendDiversity * 0.5)
}
```

---

## Implementation Code

### Main Recommendation Service

```typescript
// lib/services/RecommendationService.ts

import { createClient } from '@/lib/supabase/server'

export class RecommendationService {
  private supabase = createClient()

  /**
   * Generate recommendations for a user
   */
  async generateRecommendations(
    userId: string,
    options: {
      limit?: number
      minConfidence?: number
      algorithmVersion?: number
    } = {}
  ): Promise<void> {
    const { limit = 20, minConfidence = 0.70, algorithmVersion = 1 } = options

    try {
      console.log(`Generating recommendations for user ${userId}`)

      // 1. Extract user features
      const userFeatures = await this.extractUserFeatures(userId)

      // Check if user has enough data
      if (userFeatures.rosterSize < 3) {
        console.log('User has insufficient data for recommendations')
        return
      }

      // 2. Find similar users
      const similarUsers = await this.findSimilarUsers(userId, 10)

      if (similarUsers.length === 0) {
        console.log('No similar users found')
        return
      }

      // 3. Get candidate people
      const candidates = await this.getCandidatesFromSimilarUsers(similarUsers, userId)

      if (candidates.length === 0) {
        console.log('No candidates found')
        return
      }

      // 4. Score each candidate
      const scoredRecommendations = await Promise.all(
        candidates.map(async (candidate) => {
          const score = await this.calculateHybridScore(
            candidate,
            userId,
            similarUsers,
            userFeatures
          )

          return {
            candidate,
            score,
          }
        })
      )

      // 5. Filter by confidence threshold
      const highConfidence = scoredRecommendations
        .filter(r => r.score.confidence >= minConfidence)

      if (highConfidence.length === 0) {
        console.log('No recommendations above confidence threshold')
        return
      }

      // 6. Sort by confidence
      highConfidence.sort((a, b) => b.score.confidence - a.score.confidence)

      // 7. Diversify
      const diversified = this.diversifyRecommendations(
        highConfidence.map(r => ({ ...r.candidate, ...r.score })),
        limit
      )

      // 8. Store in database
      await this.storeRecommendations(userId, diversified, algorithmVersion)

      console.log(`Generated ${diversified.length} recommendations`)
    } catch (error) {
      console.error('Error generating recommendations:', error)
      throw error
    }
  }

  /**
   * Store recommendations in database
   */
  private async storeRecommendations(
    userId: string,
    recommendations: any[],
    algorithmVersion: number
  ): Promise<void> {
    // Delete old recommendations
    await this.supabase
      .from('recommendations')
      .delete()
      .eq('user_id', userId)
      .lt('expires_at', new Date().toISOString())

    // Insert new recommendations
    const records = recommendations.map(rec => ({
      user_id: userId,
      recommended_person_name: rec.name,
      recommended_person_traits: rec.anonymizedTraits,
      confidence_score: rec.confidence,
      predicted_attraction: rec.predictedScores.attraction,
      predicted_personality: rec.predictedScores.personality,
      predicted_reliability: rec.predictedScores.reliability,
      predicted_composite: (
        rec.predictedScores.attraction +
        rec.predictedScores.personality +
        rec.predictedScores.reliability
      ) / 3,
      reasoning: rec.reasoning,
      match_factors: rec.reasoning.matchPoints,
      source_type: rec.sourceFriends.length > 1 ? 'friend_similar' : 'collaborative',
      source_user_ids: rec.sourceFriends.map(sf => sf.friendId),
      based_on_roster_ids: rec.sourceRosterIds,
      generation_version: algorithmVersion,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }))

    await this.supabase.from('recommendations').insert(records)
  }

  // ... other methods (extractUserFeatures, findSimilarUsers, etc.)
}
```

### Batch Job for Nightly Generation

```typescript
// lib/jobs/generateRecommendations.ts

import { RecommendationService } from '@/lib/services/RecommendationService'
import { createClient } from '@/lib/supabase/server'

export async function generateRecommendationsForAllUsers() {
  const supabase = createClient()
  const service = new RecommendationService()

  console.log('Starting nightly recommendation generation')

  // Get all users with privacy settings allowing recommendations
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('privacy_settings.allow_recommendations', true)

  if (!users) {
    console.log('No users found')
    return
  }

  console.log(`Generating for ${users.length} users`)

  let successCount = 0
  let errorCount = 0

  // Process in batches of 100
  const batchSize = 100
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)

    await Promise.allSettled(
      batch.map(async (user) => {
        try {
          await service.generateRecommendations(user.id)
          successCount++
        } catch (error) {
          console.error(`Error for user ${user.id}:`, error)
          errorCount++
        }
      })
    )

    // Brief pause between batches
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log(`Complete: ${successCount} success, ${errorCount} errors`)
}
```

---

## Performance Optimization

### Caching Strategy

```typescript
// Cache user features for 1 hour
const USER_FEATURES_CACHE = new Map<string, {
  features: UserFeatureVector
  timestamp: number
}>()

const CACHE_TTL = 60 * 60 * 1000 // 1 hour

function getCachedUserFeatures(userId: string): UserFeatureVector | null {
  const cached = USER_FEATURES_CACHE.get(userId)
  if (!cached) return null

  const age = Date.now() - cached.timestamp
  if (age > CACHE_TTL) {
    USER_FEATURES_CACHE.delete(userId)
    return null
  }

  return cached.features
}

function setCachedUserFeatures(userId: string, features: UserFeatureVector): void {
  USER_FEATURES_CACHE.set(userId, {
    features,
    timestamp: Date.now(),
  })
}
```

### Database Optimization

```sql
-- Materialized view for user features (refreshed daily)
CREATE MATERIALIZED VIEW user_feature_vectors AS
SELECT
  r.user_id,
  COUNT(*) as roster_size,
  AVG(r.attraction_score) as avg_attraction,
  AVG(r.personality_score) as avg_personality,
  AVG(r.reliability_score) as avg_reliability,
  STDDEV(r.attraction_score) as stddev_attraction,
  STDDEV(r.personality_score) as stddev_personality,
  STDDEV(r.reliability_score) as stddev_reliability,
  COUNT(CASE WHEN r.tier = 'S' THEN 1 END)::float / COUNT(*) as tier_s_ratio,
  COUNT(CASE WHEN r.tier = 'A' THEN 1 END)::float / COUNT(*) as tier_a_ratio,
  COUNT(CASE WHEN r.tier = 'B' THEN 1 END)::float / COUNT(*) as tier_b_ratio,
  COUNT(CASE WHEN r.tier = 'C' THEN 1 END)::float / COUNT(*) as tier_c_ratio
FROM roster r
WHERE r.attraction_score >= 1
GROUP BY r.user_id;

CREATE UNIQUE INDEX ON user_feature_vectors(user_id);

-- Refresh daily
REFRESH MATERIALIZED VIEW CONCURRENTLY user_feature_vectors;
```

### Parallel Processing

```typescript
// Generate recommendations for multiple users in parallel
async function generateBatch(userIds: string[]): Promise<void> {
  const service = new RecommendationService()

  // Process 10 users at a time
  const CONCURRENCY = 10

  for (let i = 0; i < userIds.length; i += CONCURRENCY) {
    const batch = userIds.slice(i, i + CONCURRENCY)

    await Promise.allSettled(
      batch.map(userId => service.generateRecommendations(userId))
    )
  }
}
```

---

## A/B Testing Framework

### Algorithm Versioning

```typescript
interface AlgorithmVariant {
  version: number
  name: string
  weights: ScoringWeights
  minConfidence: number
}

const ALGORITHM_VARIANTS: AlgorithmVariant[] = [
  {
    version: 1,
    name: 'baseline',
    weights: {
      collaborative: 0.40,
      contentBased: 0.30,
      socialProof: 0.20,
      temporal: 0.10,
    },
    minConfidence: 0.70,
  },
  {
    version: 2,
    name: 'social-heavy',
    weights: {
      collaborative: 0.30,
      contentBased: 0.25,
      socialProof: 0.35,
      temporal: 0.10,
    },
    minConfidence: 0.65,
  },
  {
    version: 3,
    name: 'collaborative-heavy',
    weights: {
      collaborative: 0.50,
      contentBased: 0.25,
      socialProof: 0.15,
      temporal: 0.10,
    },
    minConfidence: 0.75,
  },
]

function assignUserToVariant(userId: string): AlgorithmVariant {
  // Consistent hashing for stable assignment
  const hash = simpleHash(userId)
  const variantIndex = hash % ALGORITHM_VARIANTS.length
  return ALGORITHM_VARIANTS[variantIndex]
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}
```

### Tracking Metrics

```typescript
// Track recommendation performance
interface RecommendationMetrics {
  variantVersion: number
  userId: string
  recommendationId: string
  shown: boolean
  shownAt: Date | null
  clicked: boolean
  clickedAt: Date | null
  addedToRoster: boolean
  addedAt: Date | null
  userRating: number | null // 1-5 stars
  timeToAction: number | null // ms
}

async function trackRecommendationEvent(
  recommendationId: string,
  event: 'shown' | 'clicked' | 'added' | 'rated',
  data?: any
): Promise<void> {
  // Log to analytics service
  await analytics.track({
    event: `recommendation_${event}`,
    recommendationId,
    timestamp: new Date(),
    ...data,
  })
}
```

---

## Evaluation Metrics

### Offline Metrics

Test on historical data:

```typescript
async function evaluateAlgorithmOffline(
  variant: AlgorithmVariant,
  testUsers: string[]
): Promise<OfflineMetrics> {
  let totalPrecision = 0
  let totalRecall = 0
  let totalNDCG = 0
  let count = 0

  for (const userId of testUsers) {
    // Get historical roster additions
    const historicalAdditions = await getHistoricalRosterAdditions(userId)

    if (historicalAdditions.length < 3) continue

    // Hold out last 3 additions
    const testSet = historicalAdditions.slice(-3)
    const trainingSet = historicalAdditions.slice(0, -3)

    // Generate recommendations using training data only
    const recommendations = await generateWithTrainingData(userId, trainingSet, variant)

    // Calculate metrics
    const recommendedNames = recommendations.map(r => r.name)
    const actualNames = testSet.map(a => a.name)

    const truePositives = recommendedNames.filter(n => actualNames.includes(n)).length

    const precision = truePositives / recommendedNames.length
    const recall = truePositives / actualNames.length

    totalPrecision += precision
    totalRecall += recall
    count++
  }

  return {
    avgPrecision: totalPrecision / count,
    avgRecall: totalRecall / count,
    avgNDCG: totalNDCG / count,
    testUserCount: count,
  }
}
```

### Online Metrics

Track in production:

```typescript
interface OnlineMetrics {
  impressions: number          // Recommendations shown
  clicks: number               // Recommendations clicked
  conversions: number          // Recommendations added to roster
  avgConfidence: number        // Avg confidence of shown recommendations
  avgUserRating: number        // Avg user rating (1-5 stars)
  ctr: number                  // Click-through rate
  conversionRate: number       // Conversion rate
  avgTimeToAction: number      // Avg time from shown to added (ms)
}

async function getOnlineMetrics(
  variantVersion: number,
  startDate: Date,
  endDate: Date
): Promise<OnlineMetrics> {
  const { data: events } = await supabase
    .from('recommendation_events')
    .select('*')
    .eq('variant_version', variantVersion)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  // Calculate metrics from events
  const impressions = events.filter(e => e.event_type === 'shown').length
  const clicks = events.filter(e => e.event_type === 'clicked').length
  const conversions = events.filter(e => e.event_type === 'added').length

  return {
    impressions,
    clicks,
    conversions,
    ctr: clicks / impressions,
    conversionRate: conversions / impressions,
    // ... calculate other metrics
  }
}
```

### Success Criteria

Algorithm variant is considered successful if:

1. **Conversion Rate** > 15% (15% of shown recommendations added)
2. **Average User Rating** > 4.0 stars
3. **Click-Through Rate** > 40%
4. **Precision@10** > 0.20 (offline)
5. **User Satisfaction** > 80% (survey)

---

*End of Recommendation Algorithm Deep Dive*
