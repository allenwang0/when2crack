# How to Use the Improve App Skill

## Quick Start

To start improving your app, simply invoke the skill:

```
/improve-app
```

Claude will automatically:
1. Scan your codebase for issues
2. Categorize them by priority (P0-P3)
3. Propose the top items to fix
4. Wait for your approval
5. Implement the fixes iteratively
6. Track progress

## Usage Modes

### Standard Mode (Comprehensive)
```
/improve-app
```
Analyzes all aspects: TypeScript, performance, security, code quality

### Focused Modes
```
/improve-app focus:typescript
```
Only analyzes and fixes TypeScript-related issues

```
/improve-app focus:performance
```
Only tackles performance optimizations

```
/improve-app focus:security
```
Only addresses security vulnerabilities

### Quick Wins Mode
```
/improve-app quick
```
Only proposes small, easy fixes that can be done quickly

### Continue Previous Session
```
/improve-app continue
```
Resumes from the last iteration where you left off

## Typical Workflow

### First Session
1. Run `/improve-app`
2. Review the discovery report
3. Approve the top 3-5 items
4. Watch Claude implement them
5. Verify the fixes work
6. Decide whether to continue

### Subsequent Sessions
1. Run `/improve-app continue`
2. Review what's next in the priority queue
3. Approve next batch
4. Repeat until satisfied

## What Gets Fixed

The skill targets these categories:

### Priority 0 (Critical)
- Security vulnerabilities
- Broken core functionality
- Data loss risks
- Runtime errors

### Priority 1 (High)
- TypeScript errors
- Performance issues
- Poor user experience
- Significant bugs

### Priority 2 (Medium)
- Code quality issues (console.logs, @ts-ignore)
- Technical debt
- Minor bugs
- Missing error handling

### Priority 3 (Low)
- Documentation
- Optimizations
- Nice-to-have improvements

## Progress Tracking

The skill maintains progress in:
- `FIXES_NEEDED.md` - Issues and completion status
- Commit messages - Clear description of what was fixed

## Tips for Best Results

1. **Start with standard mode** to get a full picture
2. **Approve 3-5 items per iteration** - keeps changes focused
3. **Test after each iteration** - catch regressions early
4. **Use focused modes** when you have specific concerns
5. **Run in quick mode** before releases for fast polish

## Example Session

```
You: /improve-app

Claude: [Scans codebase]
# Improvement Discovery Report

## Critical Issues (P0)
- None found

## High Priority (P1)
- [TS-001]: 11 @ts-ignore comments masking type errors
- [PERF-001]: MutationObserver in onboarding causing performance issues
- [BUILD-001]: ignoreBuildErrors: true in next.config.ts

## Medium Priority (P2)
- [LOG-001]: 91 console.log statements in production code
- [TYPE-002]: Implicit any types in 8 files

## Proposed First Iteration
1. [BUILD-001] Remove ignoreBuildErrors and fix underlying issues - Medium
2. [TS-001] Fix and remove @ts-ignore comments - Small
3. [LOG-001] Clean up console.log statements - Small

Shall I proceed with these fixes?

You: Yes, let's do it.

Claude: [Implements fixes]
✅ Fixed next.config.ts TypeScript configuration
✅ Resolved 11 @ts-ignore comments
✅ Removed 91 console.log statements

All tests passing. Ready for next iteration?

You: What's next?

Claude: [Proposes next batch...]
```

## Customization

You can modify the skill behavior by editing:
`.claude/skills/improve-app.md`

Change:
- Priority definitions
- Focus areas
- Output format
- Process steps

## Support

If the skill encounters issues:
1. Check that all dependencies are installed
2. Ensure TypeScript is configured correctly
3. Try a focused mode instead of standard mode
4. Ask Claude to explain what it's stuck on

Happy improving!
