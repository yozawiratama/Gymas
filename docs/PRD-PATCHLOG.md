# PRD Patch Log

Date: February 22, 2026

## Summary
- Added missing use cases for auth, member edit/detail, and create trainer (V2).
- Documented RBAC ambiguity with explicit assumption and open question; aligned Permission Matrix with assumption.
- Expanded acceptance criteria for FR-1.3 and FR-3.3; tagged FR-5.3 AC as V2.
- Marked trainer schedule data model as V2 and clarified related assumptions.
- Updated traceability matrix to achieve full FR-to-UC and AC mapping.

## Sections Modified
- 1. Title Page
- 4. Personas & Actors
- 7. Use Cases (Detailed)
- 8. RBAC / Permission Matrix
- 9. Data & Domain Model (High Level)
- 12. Acceptance Criteria
- 13. Traceability Matrix
- 14. Risks & Assumptions
- 15. Open Questions

## Use Cases Added/Updated
- UC-0 Login & Access Control (new)
- UC-8 Edit Member & View Member Detail (new)
- UC-9 Create Trainer (V2) (new)

## Assumptions / Open Questions Added
- Staff permission scope expanded per epic use cases; requires stakeholder confirmation vs FR-1.3.
- Trainer schedule visibility deferred to V2 pending a minimal schedule data model decision.
- System Admin labeled as operational (non-application) role.
- Performance, backups, monitoring, and audit logging treated as operational assumptions.

## Decision Pass – February 22, 2026
- RBAC decision applied: Staff can activate memberships using existing packages and assign trainers; package/trainer master data remain Owner-only; Owner has full access and settings.
- Trainer schedule decision applied: schedule view is V2; MVP includes assigned members view only; no schedule entity in data model.
- Sections updated: Scope, Personas & Actors, Use Cases, RBAC / Permission Matrix, Functional Requirements (Epic 5), Acceptance Criteria, Traceability Matrix, Risks & Assumptions, Open Questions.

