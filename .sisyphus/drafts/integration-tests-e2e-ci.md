# Draft: Integration Tests E2E CI

## Requirements (confirmed)

- Create integration tests for these flows:
  - User registration -> login -> create account -> add transaction
  - Create budget -> add transactions -> check budget status
  - Add stock -> update prices -> check portfolio value
- Use Playwright for E2E tests
- Target test location: `apps/web/tests/e2e/`
- Include login flow coverage
- Include transaction creation coverage
- Include budget creation coverage
- Run tests in CI/CD pipeline using GitHub Actions

## Technical Decisions

- Planning mode only: produce an execution plan, not implementation
- Initial assumption: E2E coverage will be anchored in the web app unless exploration disproves it

## Research Findings

- Initial repo probe: no existing `.sisyphus/` artifacts found at workspace root
- Background exploration launched for app flow mapping and test/CI infrastructure

## Open Questions

- Whether registration and portfolio valuation flows are currently implemented end-to-end in the UI
- Whether Playwright and GitHub Actions are already configured or must be introduced
- Whether tests should run against seeded local data, mocked services, or isolated test database state

## Scope Boundaries

- INCLUDE: E2E/integration test planning, Playwright coverage, CI workflow planning
- EXCLUDE: direct source-code implementation during planning
