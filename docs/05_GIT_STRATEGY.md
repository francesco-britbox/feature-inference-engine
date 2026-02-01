# Git Strategy
## Branching, Commits, and PRs

---

## 1. Branch Structure

### 1.1 Main Branches

```
main              # Production-ready code (protected)
    ↓
develop           # Integration branch (default branch)
    ↓
phase/*           # Phase-level feature branches
    ↓
feature/*         # Individual feature branches
```

### 1.2 Branch Types

| Type | Pattern | Example | Merged To |
|------|---------|---------|-----------|
| Main | `main` | `main` | N/A (protected) |
| Develop | `develop` | `develop` | `main` |
| Phase | `phase/<number>-<name>` | `phase/2-extraction` | `develop` |
| Feature | `feature/<description>` | `feature/pdf-extractor` | Phase branch |
| Hotfix | `hotfix/<description>` | `hotfix/confidence-bug` | `main` + `develop` |
| Docs | `docs/<description>` | `docs/update-readme` | `develop` |

---

## 2. Workflow

### 2.1 Standard Development Flow

```bash
# 1. Start new phase
git checkout develop
git pull origin develop
git checkout -b phase/2-extraction

# 2. Create feature branch from phase
git checkout -b feature/pdf-extractor

# 3. Make changes, commit
git add lib/services/PdfExtractor.ts
git commit -m "feat(extraction): add PDF text extraction"

# 4. Push feature branch
git push origin feature/pdf-extractor

# 5. Create PR: feature/pdf-extractor → phase/2-extraction
# (Review, approve, merge)

# 6. When phase is complete, PR: phase/2-extraction → develop
# (Review, approve, merge)

# 7. For releases, PR: develop → main
# (Tag release)
```

### 2.2 Working on Multiple Features in Parallel

```bash
# Phase branch
git checkout -b phase/2-extraction

# Feature 1 (can work in parallel)
git checkout -b feature/pdf-extractor

# Feature 2 (can work in parallel)
git checkout phase/2-extraction
git checkout -b feature/csv-extractor

# Both features PR into phase/2-extraction
# Phase PRs into develop when complete
```

---

## 3. Commit Conventions

### 3.1 Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Example**:
```
feat(extraction): add PDF text extraction with chunking

- Implemented pdf-parse integration
- Added 500-token chunking strategy
- Created test fixtures for PDFs

Closes #42
```

### 3.2 Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(inference): add DBSCAN clustering` |
| `fix` | Bug fix | `fix(confidence): correct formula calculation` |
| `refactor` | Code refactoring | `refactor(db): optimize evidence queries` |
| `test` | Add/update tests | `test(extraction): add PDF extractor tests` |
| `docs` | Documentation | `docs(readme): update setup instructions` |
| `chore` | Maintenance | `chore(deps): update dependencies` |
| `style` | Code formatting | `style(extraction): fix linter warnings` |
| `perf` | Performance improvement | `perf(embeddings): batch API calls` |

### 3.3 Scopes

| Scope | Description |
|-------|-------------|
| `extraction` | Evidence extraction logic |
| `inference` | Feature inference engine |
| `correlation` | Relationship building |
| `assembly` | Output generation |
| `ui` | Frontend components |
| `api` | API routes |
| `db` | Database schema/queries |
| `docker` | Docker configuration |
| `ai` | OpenAI integration |

### 3.4 Commit Examples

```bash
# Good commits
feat(extraction): add OpenAI Vision integration for screenshots
fix(inference): handle empty evidence clusters gracefully
refactor(db): extract query logic into repository pattern
test(api): add integration tests for upload endpoint
docs(architecture): update high-level design diagram
chore(docker): upgrade PostgreSQL to 16.1

# Bad commits (avoid)
git commit -m "update"
git commit -m "fix bug"
git commit -m "changes"
git commit -m "wip"
```

---

## 4. Pull Request Guidelines

### 4.1 PR Template

```markdown
## Description
Brief description of changes (1-2 sentences).

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation
- [ ] Test coverage

## Changes
- Bullet list of specific changes
- Include file paths for major changes

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

### Test Steps
1. Step-by-step instructions to test
2. Expected results

## Database Changes
- [ ] No database changes
- [ ] Migrations included (list files)

## Dependencies
- [ ] No new dependencies
- [ ] New dependencies added (list with reason)

## Screenshots (if UI changes)
[Add screenshots]

## Checklist
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] No linter warnings
- [ ] Code reviewed by self
- [ ] Documentation updated
```

### 4.2 PR Title Format

```
<type>(<scope>): <description>

Examples:
feat(extraction): add PDF extractor with chunking
fix(inference): correct confidence score calculation
refactor(db): optimize feature-evidence queries
docs(setup): update Docker installation instructions
```

### 4.3 PR Review Process

**Before Creating PR**:
1. Self-review: Read through your own changes
2. Run tests: `pnpm test`
3. Check types: `pnpm typecheck`
4. Run linter: `pnpm lint`
5. Test manually: Follow test steps in PR description

**Reviewer Checklist**:
- [ ] Code follows project conventions
- [ ] Logic is sound and efficient
- [ ] Error handling is appropriate
- [ ] Tests cover new code
- [ ] No security issues
- [ ] Documentation updated

**Approval Requirements**:
- Feature → Phase: 1 approval (or self-merge if solo)
- Phase → Develop: 1 approval + all tests pass
- Develop → Main: 2 approvals + full test suite

---

## 5. Merge Strategy

### 5.1 Merge vs Squash vs Rebase

| Branch Type | Strategy | Reason |
|-------------|----------|--------|
| Feature → Phase | **Squash** | Clean history, one commit per feature |
| Phase → Develop | **Merge commit** | Preserve phase history |
| Develop → Main | **Merge commit** | Full history for releases |

### 5.2 Squash and Merge

```bash
# When merging feature PR (via GitHub)
# Select "Squash and merge"
# Edit commit message to be descriptive

# Result: Single commit in phase branch
feat(extraction): add PDF extractor with chunking

- Implemented pdf-parse integration
- Added 500-token chunking strategy
- Created test fixtures
```

### 5.3 Handling Conflicts

```bash
# Update your branch with latest phase branch
git checkout feature/pdf-extractor
git fetch origin
git rebase origin/phase/2-extraction

# Resolve conflicts
# ... edit files ...
git add .
git rebase --continue

# Force push (rebase rewrites history)
git push --force-with-lease origin feature/pdf-extractor
```

---

## 6. Tagging and Releases

### 6.1 Semantic Versioning

```
MAJOR.MINOR.PATCH

Examples:
0.1.0  # Initial MVP
0.2.0  # Added feature inference
0.2.1  # Bug fix in confidence calculation
1.0.0  # First production release
```

### 6.2 Creating Releases

```bash
# After merging develop → main
git checkout main
git pull origin main

# Create annotated tag
git tag -a v0.1.0 -m "Release v0.1.0 - MVP with extraction and inference"

# Push tag
git push origin v0.1.0

# Create GitHub release (via UI or CLI)
gh release create v0.1.0 \
  --title "v0.1.0 - MVP Release" \
  --notes "Initial release with core features"
```

### 6.3 Version Tracking

Keep version in `package.json` and update with each release:

```json
{
  "name": "feature-inference-engine",
  "version": "0.1.0"
}
```

---

## 7. Git Hooks

### 7.1 Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linter
pnpm lint-staged

# Run type check
pnpm typecheck

# If any fail, commit is blocked
```

### 7.2 Commit Message Hook

```bash
# .husky/commit-msg
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Validate commit message format
npx --no -- commitlint --edit $1
```

### 7.3 Lint-staged Configuration

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml}": [
      "prettier --write"
    ]
  }
}
```

---

## 8. Common Git Commands

### 8.1 Daily Workflow

```bash
# Start work
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# Make changes
git add .
git commit -m "feat(scope): description"

# Push to remote
git push origin feature/my-feature

# Update feature branch with latest develop
git fetch origin
git rebase origin/develop
git push --force-with-lease origin feature/my-feature
```

### 8.2 Useful Commands

```bash
# Stash changes temporarily
git stash
git stash pop

# Amend last commit (before pushing)
git add .
git commit --amend --no-edit

# Undo last commit (keep changes)
git reset --soft HEAD~1

# View commit history
git log --oneline --graph --all

# Check which branch you're on
git status
git branch

# Delete local branch
git branch -d feature/old-feature

# Delete remote branch
git push origin --delete feature/old-feature

# View changes
git diff
git diff --staged
```

---

## 9. Repository Setup

### 9.1 Initial Setup

```bash
# Initialize repo
git init
git add .
git commit -m "chore: initial commit"

# Create develop branch
git checkout -b develop

# Push to remote
git remote add origin git@github.com:username/feature-inference-engine.git
git push -u origin main
git push -u origin develop

# Set develop as default branch (in GitHub settings)
```

### 9.2 Branch Protection Rules

**For `main`**:
- Require pull request before merging
- Require 2 approvals
- Require status checks to pass (CI)
- Require branches to be up to date
- Do not allow force pushes

**For `develop`**:
- Require pull request before merging
- Require 1 approval
- Require status checks to pass
- Do not allow force pushes

---

## 10. .gitignore

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Next.js
.next/
out/
build/
dist/

# Environment variables
.env
.env.local
.env.production.local

# Database
*.db
*.sqlite

# Logs
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Uploaded files
/docs/*
!/docs/.gitkeep

# Test coverage
coverage/
.nyc_output/

# Temporary files
*.tmp
.temp/
```

---

## 11. Best Practices

### 11.1 Do's

✅ Commit frequently with clear messages
✅ One feature per branch
✅ Keep PRs small and focused (<500 lines when possible)
✅ Write descriptive PR descriptions
✅ Test before pushing
✅ Rebase before merging to keep history clean
✅ Delete branches after merging

### 11.2 Don'ts

❌ Don't commit directly to `main` or `develop`
❌ Don't force push to shared branches
❌ Don't use `git add .` without reviewing changes
❌ Don't commit secrets or credentials
❌ Don't leave TODO comments (create issues)
❌ Don't merge without approval
❌ Don't commit commented-out code
❌ Don't use vague commit messages

---

## 12. Emergency Procedures

### 12.1 Reverting a Bad Merge

```bash
# If bad commit is on main
git checkout main
git revert <commit-hash>
git push origin main

# If bad merge to develop
git checkout develop
git revert -m 1 <merge-commit-hash>
git push origin develop
```

### 12.2 Recovering Lost Work

```bash
# View reflog (history of HEAD)
git reflog

# Recover lost commit
git checkout <commit-hash>
git checkout -b recovery-branch
```

### 12.3 Fixing Pushed Commits

```bash
# If you pushed to your feature branch only
git rebase -i HEAD~3  # Interactive rebase last 3 commits
# Edit, squash, or drop commits
git push --force-with-lease origin feature/my-feature

# ⚠️ NEVER force push to main or develop
```
