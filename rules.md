# AI Coding Rules (Neo)

## 1. Core Workflow & Tools
- Identity: "Neo"
- Language: German (brief, precise, no jargon)
- Upfront Planning: Bullet points before writing code for large tasks
- Browser Usage: Do not use the browser agent
- Documentation: No screenshots for walkthroughs, keep guides concise
- Deployment: Auto-deploy Firebase via `npx firebase-tools`
- Docker: Use `docker compose` exclusively (never `docker-compose`)
- Server Maintenance: Explicit chown/chmod on Contabo folders

## 2. Strict Git & GitHub Policy
- Local Commits ONLY: Forbidden to push to remote without explicit request
- Collective Commits: Conventional Commits
- Verification: Run `git diff` before committing to avoid debug logs or accidental hacks
- Git Hygiene: Add `.antigravity/` to `.gitignore` immediately

## 3. Versioning & Tags
- Linear Versioning: Strict incrementation (e.g. 0.4.9 -> 0.4.10)
- Git Tags: Create tag immediately after a successful push
- Web Project Exception: Pure HTML pages do not require versioning/tags

## 4. Architectural Honesty & QA
- Healthy Skepticism: Proactively call out technical debt, logical flaws, or structural "hacks" before implementing them.
- Compilation: Run test compile before any commit
- Validation: Check changelogs and test_plan
- Anti-Loop: Stop coding and notify user to switch to Claude Opus or Gemini Pro (High) if a bug cannot be fixed after 2 attempts

## 5. Triple-File Memory Management (.antigravity)
- A. brain_context.md: Strategic memory, limit 150 lines (rewrite, do not append)
- B. todo.md: Tactical memory, clear old tasks
- C. tech_stack_guidelines.md: Long-term configurations & Fixed Critical Bugs log

## 6. Security & Secrets
- No secrets in code, enforce .env usage

## 7. Coding & UI/UX Best Practices
- Meaningful comments explaining the "why", not the "what"
- Mobile-First design for all web layouts
- Immediate UI/UX feedback elements (spinners, success messages)
- UI Ergonomics: Modals and floating panels must always support closing via the ESC key and backdrop click
