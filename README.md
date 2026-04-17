# Claude Mutation Testing Framework

A plug-and-play Claude slash command that automatically validates the quality of tests written by Claude — without requiring deployment, secrets, or changes to your existing codebase structure.

---

## The Problem

When your development team uses Claude to build features, Claude writes both the source code and the tests. The risk is that **Claude's tests can verify Claude's own assumptions** rather than catching real bugs. Standard code coverage tells you which lines were executed — not whether the tests would catch a fault if the logic were wrong.

Teams end up asking: *"Claude wrote 90% coverage — but can I actually trust these tests before merging?"*

---

## The Solution

**Mutation testing** injects artificial bugs (mutations) into your source code and checks whether your tests catch them. If tests still pass with a bug injected, the tests are not validating real behavior.

This framework provides:

- A Claude slash command `/mutation-test` that runs mutation testing automatically
- Scoped to **only the files Claude changed** in the current session — existing code is never touched
- Zero permanent changes to your build files — everything is reverted after the run
- Works across Java, Node.js, Python, and .NET
- Can be injected into any existing Claude pipeline

---

## How It Works

```
Claude writes feature + tests
          │
          ▼
/mutation-test is invoked
          │
          ▼
Step 1: git diff --name-only HEAD
        → Identifies only files Claude added/modified
        → Excludes test files, config, build files
          │
          ▼
Step 2: Temporarily add mutation tooling to build file
        → Scoped to changed source files only
        → Existing code is never in scope
          │
          ▼
Step 3: Run mutation tests locally
        → No deployment needed
        → No secrets needed
        → No network calls (except fetching tool packages)
          │
          ▼
Step 4: Report score + specific gaps
        → Which mutations survived (what bugs went undetected)
        → Which test cases are missing
          │
          ▼
Step 5: Revert all build file changes
        → Repository left exactly as before
          │
          ▼
Score >= 80%? → Safe to merge
Score  < 80%? → Claude improves tests, re-runs
```

---

## Benefits

### For Development Teams
- **Confidence without deployment** — validate logic correctness locally before any environment promotion
- **No secrets exposure** — mutation testing runs on source code only, never touches infrastructure
- **Immediate feedback** — Claude gets the score and fixes weak tests in the same session
- **Stack agnostic** — one command works across Java, Node.js, Python, .NET

### For Tech Leads / Architects
- **Objective merge gate** — replace subjective test review with a measurable score
- **Scoped to Claude's changes** — does not create noise on existing legacy code
- **Zero process change** — teams keep their existing workflows; this slots in as one command
- **Composable** — inject into any existing Claude pipeline as a validation phase

### For Engineering Managers
- **Visible quality signal** — mutation score is a concrete metric per feature/PR
- **Reduces rework** — catches logic gaps before they reach QA or production
- **Scales with AI adoption** — as more code is Claude-generated, this scales with it

---

## Mutation Score Interpretation

| Score | Status | Meaning | Action |
|-------|--------|---------|--------|
| 80%+  | PASS   | Tests catch most injected bugs | Safe to merge |
| 60–79%| WARN   | Some logic paths unverified | Improve tests before merge |
| < 60% | FAIL   | Tests provide false confidence | Rewrite tests, do not merge |

### Real Example (from this repo's Java sample)

```
MUTATION TEST RESULTS
=====================
Stack:           Java (Maven + PIT)
Changed Files:   src/main/java/com/example/OrderService.java
Mutation Score:  81% (17/21 killed)
Status:          PASS ✓

Survived Mutations:
  - Line 9:  discount boundary (>100) not tested — no test for discountPercent=101
  - Line 19: classifyOrder MEDIUM range not tested — no test for total=500
  - Line 24: isEligibleForFreeShipping never tested for false return

Recommendation:
  Add test: calculateTotal(10, 1, 101) should throw
  Add test: classifyOrder(500) should return "MEDIUM"
  Add test: isEligibleForFreeShipping(10, false) should return false
```

---

## Prerequisites

| Stack | Required | Version |
|-------|----------|---------|
| Java | Maven | 3.6+ |
| Java | JDK | 17+ |
| Node.js | Node + npm | 18+ |
| Python | Python + pip | 3.9+ |
| .NET | .NET SDK | 8.0+ |

The mutation tools themselves (PIT, Stryker, mutmut) are fetched automatically during the run and do not need to be pre-installed.

---

## Quick Start

### 1. Copy the command into your repo

```bash
mkdir -p .claude/commands
curl -o .claude/commands/mutation-test.md \
  https://raw.githubusercontent.com/your-org/claude-mutation-framework/main/.claude/commands/mutation-test.md
```

Or manually copy `.claude/commands/mutation-test.md` from this repo into your project root.

### 2. Open Claude Code in your repo

```bash
cd your-project
claude
```

### 3. Have Claude build a feature, then run

```
/mutation-test
```

That's it. Claude detects the stack, runs mutation tests on only its changed files, reports the score, and reverts the build files.

---

## Team Adoption Guide

### Step 1: Pilot with one team

Copy `.claude/commands/mutation-test.md` into one repo. Run it at the end of the next Claude-assisted feature. Share the score in the PR description.

### Step 2: Set the merge gate

Add to your PR template:

```markdown
## Claude-Generated Code Checklist
- [ ] `/mutation-test` score >= 80% (attach screenshot or paste output)
```

This creates a visible quality signal without blocking anyone automatically.

### Step 3: Inject into your Claude pipeline (optional)

If your team uses a Claude pipeline for migrations, scaffolding, or refactoring, add to the validate phase:

```markdown
## Phase 4: Validate

<your existing validation steps>

After all validation steps above, run /mutation-test.
Only proceed to reporting if mutation score is 80%+.
If score is below 80%, stop and list the specific test improvements needed.
```

### Step 4: Distribute across teams

The command is a single markdown file. Share it via your internal repo, wiki, or onboarding docs. No tooling changes required on the team side.

---

## Pipeline Integration

If you have an existing Claude command pipeline with phases, inject `/mutation-test` into the validate phase:

```
Phase 1: Discover    → unchanged
Phase 2: Analyze     → unchanged
Phase 3: Apply       → unchanged
Phase 4: Validate    → ADD: run /mutation-test after existing checks
Phase 5: Report      → ADD: include mutation score in report
```

### Hard block variant (recommended for production code)

```markdown
## Phase 4: Validate
<existing steps>

Run /mutation-test on all files changed in Phase 3.
If mutation score is below 80%, STOP. Do not proceed to Phase 5.
Report: "Pipeline blocked — mutation score: X%. Improve tests and re-run."
```

### Soft warn variant (useful during adoption)

```markdown
## Phase 4: Validate
<existing steps>

Run /mutation-test on all files changed in Phase 3.
Include the score in the Phase 5 report. Flag as WARNING if below 80%.
```

---

## Security & Safety

| Concern | Answer |
|---------|--------|
| Does this send code externally? | No. All mutation tools run locally. |
| Does this need secrets? | No. Mutation testing operates on source code only. |
| Does Stryker upload results? | Only if `dashboard` reporter is configured. This command uses `progress` and `json` only. |
| Does it modify my build permanently? | No. All changes are reverted after the run. |
| What if the run crashes? | The command reverts build files even on failure. |
| Does Claude see my secrets? | No. Secrets never appear in source code or test code under this pattern. |

The only network activity is fetching mutation tool packages from public registries (Maven Central, npm, PyPI) — identical to any normal `mvn install` or `npm install`.

---

## Troubleshooting

### "No changed source files detected"

The repo has no staged or unstaged source changes visible to `git diff HEAD`. This means either:
- The source file was already committed before running `/mutation-test`
- You're not in a git repository

**Fix**: Ensure Claude's new source files are staged but not committed when you run `/mutation-test`. The command is designed to run before `git commit`.

### "Mutation score is 0% / all mutations survived"

Usually means tests compiled but didn't actually run, or the test runner isn't connected to the mutation tool config.

**Fix**: Run `mvn test` (or equivalent) manually first to confirm tests pass. Then re-run `/mutation-test`.

### Java: "No mutations found"

The `<targetClasses>` pattern didn't match. Check that the package name in `pom.xml` matches your actual class package.

### Node.js: "Cannot find test runner"

Stryker needs to know which test runner to use. Confirm `jest`, `mocha`, or `jasmine` appears in `devDependencies` of `package.json`.

### Python: "mutmut not found"

`pip install mutmut` failed silently. Run `pip install mutmut` manually and check for errors (often a Python version or permissions issue).

---

## Sample Projects

Four sample projects are included for testing the command end-to-end. Each simulates a Claude session where a source file was added (staged, not committed) with intentionally weak tests.

| Stack | Path | Intentional gaps |
|-------|------|-----------------|
| Java | `samples/java/` | Missing MEDIUM test, discount boundary, false shipping case |
| Node.js | `samples/nodejs/` | Same gaps as Java |
| Python | `samples/python/` | Same gaps as Java |
| .NET | `samples/dotnet/` | Same gaps as Java |

### Running the samples

```bash
# Copy command into sample
mkdir -p samples/java/.claude/commands
cp .claude/commands/mutation-test.md samples/java/.claude/commands/

# Open Claude Code in the sample
cd samples/java
claude

# Run
/mutation-test
```

Expected score: ~75–85% (the intentional gaps will show as survived mutations).

---

## Mutation Tools Reference

| Stack | Tool | Version | Docs |
|-------|------|---------|------|
| Java | PIT (Pitest) | 1.15.3 | https://pitest.org |
| .NET | Stryker.NET | 3.x | https://stryker-mutator.io/docs/stryker-net |
| Node.js | Stryker | 8.x | https://stryker-mutator.io/docs/stryker-js |
| Python | mutmut | 2.x | https://github.com/boxed/mutmut |

---

## File Structure

```
.
├── .claude/
│   └── commands/
│       └── mutation-test.md        ← The slash command (copy this to any repo)
├── samples/
│   ├── java/                       ← Maven + JUnit 5 sample
│   │   ├── pom.xml
│   │   └── src/
│   ├── nodejs/                     ← Jest sample
│   │   ├── package.json
│   │   └── src/
│   ├── python/                     ← pytest + pyproject.toml sample
│   │   ├── pyproject.toml
│   │   └── src/
│   └── dotnet/                     ← xUnit + .sln sample
│       ├── MutationTestSample.sln
│       └── src/
└── README.md
```

The only file you need to distribute to teams is `.claude/commands/mutation-test.md`.
