# Project scaffold with health endpoint and Docker image

## Parent

PRD: docs/prd/shared-draw.md (user stories 41, 42)

## State

Completed

## What to build

A TypeScript project with Hono, SQLite, a test runner and a Dockerfile. The running container answers a health endpoint. This proves the toolchain, the test setup and the packaging end-to-end.

## Acceptance criteria

- [ ] A test hitting the health endpoint in-process passes
- [ ] npm test runs the test suite
- [ ] The Docker image builds and the container serves the health endpoint
- [ ] The SQLite file location is configurable and intended for a mounted volume

## Blocked by

None - can start immediately
