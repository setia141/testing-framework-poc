# Mutation Test

Validate the quality of tests written by Claude by running mutation testing — scoped exclusively to files Claude added or modified in this session. Temporarily adds mutation tooling to the build, runs analysis, reports findings, then reverts all build file changes.

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

### .NET — stryker-config.json (do NOT modify csproj)

Create `stryker-config.json` in the solution root:
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

Run:
```bash
dotnet stryker --config-file stryker-config.json
```

Parse score from stdout line containing `Mutation score:`

Revert: delete `stryker-config.json`

---

### Node.js — stryker.config.json (do NOT modify package.json)

Auto-detect test runner from `devDependencies`:
- Contains `jest` → testRunner: `"jest"`
- Contains `mocha` → testRunner: `"mocha"`
- Contains `jasmine` → testRunner: `"jasmine"`

Create `stryker.config.json`:
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

Run:
```bash
npx stryker run
```

Parse score from stdout line containing `Mutation score:`

Revert: delete `stryker.config.json`

---

### Python — pyproject.toml or mutmut.ini

Build comma-separated list of changed file paths:
`src/order_service.py,src/payment/processor.py`

**If `pyproject.toml` exists**, append a temporary block:
```toml
# MUTATION-TEST-START
[tool.mutmut]
paths_to_mutate = "src/order_service.py,src/payment/processor.py"
# MUTATION-TEST-END
```

**Otherwise**, create `mutmut.ini`:
```ini
[mutmut]
paths_to_mutate=src/order_service.py,src/payment/processor.py
```

Run:
```bash
pip install mutmut -q && mutmut run && mutmut results
```

Parse score: count lines with `KILLED` vs total from `mutmut results` output.

Revert: remove the `# MUTATION-TEST-START` ... `# MUTATION-TEST-END` block from `pyproject.toml`, or delete `mutmut.ini`

---

## Step 3: Report Results

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

## Step 4: Revert Build Files

After reporting (whether pass, warn, or fail — and even if the run crashed):

1. Remove any `<!-- MUTATION-TEST-START -->` ... `<!-- MUTATION-TEST-END -->` blocks from `pom.xml`
2. Delete `stryker-config.json` if it was created
3. Delete `stryker.config.json` if it was created
4. Delete `mutmut.ini` if it was created
5. Remove any `# MUTATION-TEST-START` ... `# MUTATION-TEST-END` block from `pyproject.toml`

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
- **Never modify** `package.json` devDependencies or `pom.xml` dependencies permanently — use standalone config files where possible (Node.js, .NET, Python)
- Output directories (`target/pit-reports`, `StrykerOutput`, `.mutmut-cache`) are local only and safe to gitignore
