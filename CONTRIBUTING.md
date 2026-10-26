# Contributing to Pulse

Thank you for your interest in contributing to **Pulse**! We welcome bug reports, feature suggestions, documentation improvements, and code contributions.

## Code of Conduct

Please be respectful, constructive, and welcoming to all contributors and community members.

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/thefraggle/pulse.git
   cd pulse
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma db push
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Linting and Building:**
   Make sure all tests and lint checks pass before submitting a pull request:
   ```bash
   cd frontend
   npm run lint
   npm run build
   ```

## Pull Request Guidelines

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(...)`: New features
   - `fix(...)`: Bug fixes
   - `refactor(...)`: Code restructuring
   - `docs(...)`: Documentation updates
   - `chore(...)`: Maintenance and dependency updates
3. Avoid committing `.env` files, secrets, or SQLite database files (`*.db`, `*.db-wal`).
4. Ensure your PR description clearly explains the *why* and *what* of your changes.

## Reporting Issues

If you find a bug or have a suggestion, please check existing issues first. If not found, feel free to open a new issue with steps to reproduce and system details.
