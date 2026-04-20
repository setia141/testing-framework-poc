# Mutation Test

Validate the quality of tests written by Claude by running mutation testing — scoped exclusively to files Claude added or modified in this session. Temporarily injects mutation tooling into the existing build file, runs analysis, reports findings, then reverts all build file changes.

---

## Step 0: Identify Changed Source Files (REQUIRED FIRST)

Run all three commands:
```bash
git diff --name-only HEAD
git diff --name-only --cached
git status --short
```

Collect files that are:
- Added or modified (A, M in git status)
- Source code files only — exclude test files (`*Test*`, `*Spec*`, `test_*`, `*_test*`), build files (`pom.xml`, `*.csproj`, `package.json`, `pyproject.toml`), and config files

**If not in a git repository:**
Stop and report:
> "This directory is not a git repository. Run `git init` and stage your files so git diff can identify what Claude changed."

**If no changed source files found:**
Stop and report:
> "No changed source files detected. Mutation testing skipped. Ensure Claude's new source files are staged (but not yet committed) before running /mutation-test."

Proceed only when you have a confirmed list of changed source file paths.

---

## Step 1: Detect Stack

Check for build files in priority order:
1. `pom.xml` → Java (Maven + PIT)
2. `*.csproj` or `*.sln` → .NET (Stryker.NET)
3. `package.json` → Node.js (Stryker JS)
4. `pyproject.toml` or `requirements*.txt` → Python (mutmut)

If multiple build files exist, pick the most specific one (e.g., `pom.xml` takes priority over `package.json` in a Java project).

---

## Step 2: Add Mutation Tooling (Scoped to Changed Files Only)

### Java — pom.xml

Convert each changed `.java` file to its fully-qualified class name:
```
src/main/java/com/example/OrderService.java  →  com.example.OrderService
src/main/java/com/example/payment/Processor.java  →  com.example.payment.Processor
```

Add inside `<build><plugins>`, scoped to those classes:
```xml
<!-- MUTATION-TEST-START -->
<plugin>
    <groupId>org.pitest</groupId>
    <artifactId>pitest-maven</artifactId>
    <version>1.15.3</version>
    <dependencies>
        <dependency>
            <groupId>org.pitest</groupId>
            <artifactId>pitest-junit5-plugin</artifactId>
            <version>1.2.1</version>
        </dependency>
    </dependencies>
    <configuration>
        <targetClasses>
            <param>com.example.ChangedClass1</param>
            <param>com.example.ChangedClass2</param>
        </targetClasses>
        <outputFormats>
            <outputFormat>HTML</outputFormat>
            <outputFormat>XML</outputFormat>
        </outputFormats>
        <mutationThreshold>0</mutationThreshold>
        <failWhenNoMutations>false</failWhenNoMutations>
    </configuration>
</plugin>
<!-- MUTATION-TEST-END -->
```

Run:
```bash
mvn test-compile org.pitest:pitest-maven:mutationCoverage
```

Parse score from stdout: `>> Generated X mutations Killed Y (Z%)`
Also check `target/pit-reports/mutations.xml` for per-mutation detail.

Revert: remove lines between and including `<!-- MUTATION-TEST-START -->` and `<!-- MUTATION-TEST-END -->`

---

### .NET — *.csproj

Find the `.csproj` file. Add inside `<Project>`, scoped to changed files:
```xml
<!-- MUTATION-TEST-START -->
<ItemGroup>
  <StrykerMutateFiles Include="src/OrderService/ChangedFile1.cs" />
  <StrykerMutateFiles Include="src/OrderService/ChangedFile2.cs" />
</ItemGroup>
<!-- MUTATION-TEST-END -->
```

Build the `--mutate` args from the `Include` values above, then run:
```bash
dotnet tool install --global dotnet-stryker 2>/dev/null; dotnet stryker --mutate "src/OrderService/ChangedFile1.cs" --mutate "src/OrderService/ChangedFile2.cs" --reporter progress --reporter json --break-at 0
```

Parse score from stdout line containing `Mutation score:`

Revert: remove lines between and including `<!-- MUTATION-TEST-START -->` and `<!-- MUTATION-TEST-END -->` from the `.csproj`

---

### Node.js — package.json

Auto-detect test runner from existing `devDependencies`:
- Contains `jest` → `"@stryker-mutator/jest-runner"`
- Contains `mocha` → `"@stryker-mutator/mocha-runner"`
- Contains `jasmine` → `"@stryker-mutator/jasmine-runner"`

Add to `devDependencies` in `package.json` (record the exact keys added so they can be removed on revert):
```json
"@stryker-mutator/core": "^9.0.0",
"@stryker-mutator/jest-runner": "^9.0.0"
```

Also add a `"stryker"` config section at the top level of `package.json`:
```json
"stryker": {
  "testRunner": "jest",
  "mutate": [
    "src/changedFile1.js",
    "src/changedFile2.js"
  ],
  "reporters": ["progress", "json"],
  "thresholds": { "high": 80, "low": 60, "break": 0 }
}
```

Also add a `"jest"` config section to restrict test discovery to the project's test folder, preventing Jest from accidentally running tests inside Stryker's sandbox copies:
```json
"jest": {
  "roots": ["<rootDir>/tests"]
}
```

Note: use `roots` rather than `testPathIgnorePatterns` — the ignore-pattern approach blocks Jest inside Stryker's own sandbox, causing mutation runs to fail with "no tests found".

Run:
```bash
npm install && npx stryker run
```

Parse score from stdout line containing `Mutation score:`

Revert:
1. Remove `"@stryker-mutator/core"` and `"@stryker-mutator/<runner>"` from `devDependencies` in `package.json`
2. Remove the `"stryker"` section from `package.json`
3. Remove the `"jest"` section from `package.json` only if it was not present before — if a `"jest"` config already existed, restore it to its original state
4. Run `npm install` to restore `package-lock.json`

---

### Python — pyproject.toml

Build comma-separated list of changed file paths:
`src/order_service.py,src/payment/processor.py`

If `pyproject.toml` exists, append a temporary block:
```toml
# MUTATION-TEST-START
[tool.mutmut]
paths_to_mutate = "src/order_service.py,src/payment/processor.py"

[project.optional-dependencies]
mutation = ["mutmut"]
# MUTATION-TEST-END
```

If `pyproject.toml` does not exist, create it:
```toml
[project]
name = "mutation-test-temp"
version = "0.0.1"

# MUTATION-TEST-START
[tool.mutmut]
paths_to_mutate = "src/order_service.py,src/payment/processor.py"

[project.optional-dependencies]
mutation = ["mutmut"]
# MUTATION-TEST-END
```

Run:
```bash
pip install -e ".[mutation]" -q && mutmut run && mutmut results
```

**Windows note**: mutmut does not support Windows natively. Use WSL or Docker:
```bash
# WSL
wsl bash -c "pip install mutmut -q && mutmut run && mutmut results"
# Docker
docker run --rm -v ${PWD}:/app -w /app python:3.13 bash -c "pip install mutmut -q && mutmut run && mutmut results"
```

Parse score: count lines with `KILLED` vs total from `mutmut results` output.

Revert: remove the `# MUTATION-TEST-START` ... `# MUTATION-TEST-END` block from `pyproject.toml`. If `pyproject.toml` was created fresh (did not exist before), delete it entirely.

---

## Step 3: Diagnose Failures & Confirm Fixes

Before reporting, run the test suite normally to check for failing tests:

```bash
# Java
mvn test

# .NET
dotnet test

# Node.js
npm test

# Python
pytest   # or: python -m pytest
```

For each failing test, cross-reference it against the survived mutants list. Analyse the code, the test name, the other branches, and the naming conventions to form a recommendation. Present each issue one at a time.

### Confidence levels

Assign a confidence level to your recommendation before presenting it:

- **HIGH** — naming, symmetry, or sibling branches make intent unambiguous (e.g. a function with LARGE/MEDIUM/SMALL tiers where the top tier returns the wrong label is clearly a typo)
- **MEDIUM** — one interpretation is more likely than the other, but reasonable doubt exists
- **LOW** — Claude cannot determine whether the code or the test is wrong without domain knowledge — user must decide, no default is assumed

### Issue summary format

```
ISSUE FOUND
===========
File:        <file> line <n>
Symptom:     Test "<test name>" is failing
Observed:    <what the code currently does>
Expected:    <what the test expects>

Recommendation: Fix the code  [HIGH CONFIDENCE]
Reasoning:  <plain-English explanation — reference naming, sibling branches,
             design intent, or any other signal that informed the recommendation>

Planned fix:
-  <current line>
+  <proposed line>

Proceed?
  [Y] Apply recommended fix
  [N] Skip — leave everything as-is, note in report
  [O] Override — fix the test instead
```

Wait for the user's response before touching any file.

### On user response

**User responds [Y]:**
- Apply the planned fix exactly as shown
- Re-run tests to confirm they pass
- Continue to the next issue

**User responds [N]:**
- Leave both code and test unchanged
- Note the skipped issue in the final report
- Continue to the next issue

**User responds [O] (override):**
- Show the exact test change you plan to make
- Wait for a second confirmation before applying
- Apply, re-run tests, continue to the next issue

**Confidence is LOW:**
- Do not show a planned fix
- Do not show [Y] as an option
- Present [N] and [O] only, and ask the user to explain their intent before proceeding

Process all issues before moving to Step 4.

---

## Step 4: Report Results

Always report in this exact format:

```
MUTATION TEST RESULTS
=====================
Stack:           <detected stack and tool>
Changed Files:   <list of source files that were mutated>
Mutation Score:  <X>%
Killed:          <n> / <total> mutations
Status:          PASS ✓   (score >= 80%)
                 WARN ⚠   (score 60–79%)
                 FAIL ✗   (score < 60%)

Issues Found & Resolved:
  - <file> line <n>: <what was wrong> → recommended: fix code / fix test → outcome: applied / overridden / skipped

Survived Mutations (bugs your tests missed):
  - <file> line <n>: <what was mutated> — <what test is missing>

Missing Tests:
  - <specific test case description>
  - <specific test case description>

Next Step:
  PASS: Tests are solid. Safe to commit and raise PR.
  WARN: Add the missing tests above, re-run /mutation-test before merging.
  FAIL: Tests provide false confidence. Rewrite the listed tests before merging.
```

---

## Step 5: Revert Build Files

After reporting (whether pass, warn, or fail — and even if the run crashed or a user confirmation is still pending):

1. Remove any `<!-- MUTATION-TEST-START -->` ... `<!-- MUTATION-TEST-END -->` blocks from `pom.xml` or `.csproj`
2. Remove `"@stryker-mutator/core"`, `"@stryker-mutator/<runner>"`, and `"stryker"` keys from `package.json` if added; run `npm install`
3. Remove any `# MUTATION-TEST-START` ... `# MUTATION-TEST-END` block from `pyproject.toml`; delete `pyproject.toml` entirely if it was created fresh

Confirm revert by showing the final state of any modified build file.

---

## Threshold Guide

| Score | Status | Action |
|-------|--------|--------|
| 80%+  | PASS   | Safe to merge |
| 60–79%| WARN   | Improve tests before merging |
| < 60% | FAIL   | Rewrite tests — do not merge |

---

## Safety Rules

- **Never mutate files that were not changed by Claude** — existing code is always out of scope
- **Never leave build files modified** — revert even if the mutation run fails or crashes
- **Never add `dashboard` to reporters** — results stay local only
- **Never commit** mutation reports, config files, or tool output directories
- **Always modify the existing build file** — never create standalone mutation config files (`stryker-config.json`, `stryker.config.json`, `mutmut.ini`)
- Output directories (`target/pit-reports`, `StrykerOutput`, `.mutmut-cache`) are local only and safe to gitignore
