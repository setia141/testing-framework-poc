# Mutation Test

Run mutation testing ONLY on files Claude has added or modified in this session. Auto-detects the stack, scopes mutation testing to changed files only, temporarily adds tooling to the build file, runs the analysis, reports the score, then reverts all build file changes.

## Step 0: Identify Changed Files First (CRITICAL)

Before doing anything else, run:
```bash
git diff --name-only HEAD
git diff --name-only --cached
```

If the repo has no commits yet:
```bash
git status --short
```

Collect only **source files Claude added or modified** — exclude test files, config files, and build files. These are the files to mutate.

**If no changed source files are found**, stop and report:
> "No changed source files detected. Mutation testing skipped — nothing to validate."

Convert file paths to the format each tool expects (see per-stack instructions below).

---

## Step 1: Detect Stack

Check for: `pom.xml` (Java), `*.csproj` or `*.sln` (.NET), `package.json` (Node.js), `pyproject.toml` or `requirements*.txt` (Python)

---

## Step 2: Add Mutation Tooling (Scoped to Changed Files Only)

### Java (pom.xml)

Convert changed `.java` file paths to class glob patterns:
- `src/main/java/com/example/OrderService.java` → `com.example.OrderService`
- `src/main/java/com/example/payment/*.java` → `com.example.payment.*`

Add inside `<build><plugins>`, scoped to those classes only:
```xml
<!-- MUTATION-TEST-START -->
<plugin>
    <groupId>org.pitest</groupId>
    <artifactId>pitest-maven</artifactId>
    <version>1.15.3</version>
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
    </configuration>
</plugin>
<!-- MUTATION-TEST-END -->
```

Run: `mvn test-compile org.pitest:pitest-maven:mutationCoverage -q`

Parse score from stdout line: `>> Generated X mutations Killed Y (Z%)`

Revert: remove lines between and including `<!-- MUTATION-TEST-START -->` and `<!-- MUTATION-TEST-END -->`

---

### .NET (*.csproj)

Changed file paths go directly into `mutate` list:
- `src/OrderService/PaymentProcessor.cs` → `src/OrderService/PaymentProcessor.cs`

Create `stryker-config.json` temporarily (do NOT modify csproj):
```json
{
  "stryker-config": {
    "mutate": [
      "src/OrderService/ChangedFile1.cs",
      "src/OrderService/ChangedFile2.cs"
    ],
    "reporters": ["progress", "json"],
    "thresholds": { "high": 80, "low": 60, "break": 0 }
  }
}
```

Run: `dotnet stryker --config-file stryker-config.json`

Parse score from stdout line containing `Mutation score:`

Revert: delete `stryker-config.json` only

---

### Node.js (package.json)

Auto-detect test runner from existing devDependencies (jest/mocha/jasmine).

Create `stryker.config.json` temporarily (do NOT modify package.json):
```json
{
  "testRunner": "<detected-runner>",
  "mutate": [
    "src/changedFile1.js",
    "src/changedFile2.js"
  ],
  "reporters": ["progress", "json"],
  "thresholds": { "high": 80, "low": 60, "break": 0 }
}
```

Run: `npx stryker run`

Parse score from stdout line containing `Mutation score:`

Revert: delete `stryker.config.json` only

---

### Python (pyproject.toml or mutmut.ini)

Build a comma-separated list of changed file paths:
- `src/order_service.py,src/payment/processor.py`

If `pyproject.toml` exists, append temporarily:
```toml
# MUTATION-TEST-START
[tool.mutmut]
paths_to_mutate = "src/order_service.py,src/payment/processor.py"
# MUTATION-TEST-END
```

If no `pyproject.toml`, create `mutmut.ini` temporarily:
```ini
[mutmut]
paths_to_mutate=src/order_service.py,src/payment/processor.py
```

Run: `mutmut run && mutmut results`

Parse score from mutmut results — count `KILLED` vs total

Revert: remove the `# MUTATION-TEST-START` ... `# MUTATION-TEST-END` block, or delete `mutmut.ini`

---

## Step 3: Report Results

```
MUTATION TEST RESULTS
=====================
Stack:           <detected stack>
Changed Files:   <list of files that were mutated>
Mutation Score:  <X>%
Killed:          <n> / <total>
Status:          <PASS ✓ if >=80% | WARN if 60-79% | FAIL ✗ if <60%>

Weakest Files:
  - <file>: <score>%  (survived mutations: <what logic was not caught>)

Recommendation:
  <specific test cases missing — e.g. "No test covers the case where discount=100">
```

---

## Threshold Guide

| Score | Meaning | Action |
|-------|---------|--------|
| 80%+  | Confident | Safe to merge |
| 60-79%| Acceptable | Improve before merging |
| <60%  | Weak tests | Do not merge — improve tests first |

---

## Rules

- **Never mutate files Claude did not change** — existing code is out of scope
- **Never leave build files modified** — always revert even if the run fails
- **Never modify package.json or pom.xml devDependencies permanently** — use config files only where possible (.NET, Node.js, Python)
- If mutation run fails due to compile errors, report the error and still revert
- Do not commit any mutation testing config or reports
- Reports land in `target/pit-reports` (Java), `StrykerOutput` (.NET/Node), `.mutmut-cache` (Python) — local only, safe to ignore
