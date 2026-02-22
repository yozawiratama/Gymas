# QC PRD Coverage Report – Gymas

Date: February 22, 2026

## 1) Summary
- FR coverage: 22/22 = 100%
- UC mapping coverage: 16/22 = 72.7%
- AC coverage: 22/22 = 100% (with gaps in completeness noted below)
- Major blockers:
1. Missing use case mapping for core auth/role FRs (FR-1.1, FR-1.2, FR-1.3).
2. Missing use case mapping for FR-2.2, FR-2.4, FR-5.1.
3. RBAC ambiguity between FR-1.3 (Staff scope) and Staff permissions required by epic Use Case 2.

## 2) Coverage Matrix
| FR ID | Present in PRD | UC Mapped | AC Present | Severity | Fix |
|---|---|---|---|---|---|
| FR-1.1 | Y | N | Y | Critical | Add UC for login/access control and map FR-1.1; update traceability. |
| FR-1.2 | Y | N | Y | Critical | Add UC for login/access control and map FR-1.2; update traceability. |
| FR-1.3 | Y | N | Y | Critical | Add UC for login/access control and map FR-1.3; add ACs for Owner/Trainer RBAC. |
| FR-2.1 | Y | Y | Y | OK | None. |
| FR-2.2 | Y | N | Y | Major | Add UC for edit member or extend UC-1 and map FR-2.2. |
| FR-2.3 | Y | Y | Y | OK | None. |
| FR-2.4 | Y | N | Y | Major | Add UC for member detail view and map FR-2.4. |
| FR-3.1 | Y | Y | Y | OK | None. |
| FR-3.2 | Y | Y | Y | OK | None. |
| FR-3.3 | Y | Y | Y | Major | Add ACs for Active and Suspended status, not only Expired. |
| FR-4.1 | Y | Y | Y | OK | None. |
| FR-4.2 | Y | Y | Y | OK | None. |
| FR-4.3 | Y | Y | Y | OK | None. |
| FR-5.1 | Y | N | Y | Major | Add UC for create trainer and map FR-5.1 (V2). |
| FR-5.2 | Y | Y | Y | OK | None. |
| FR-5.3 | Y | Y | Y | Major | Add data model support for training schedule or mark as V2 assumption. |
| FR-6.1 | Y | Y | Y | OK | None. |
| FR-6.2 | Y | Y | Y | OK | None. |
| FR-6.3 | Y | Y | Y | OK | None. |
| FR-7.1 | Y | Y | Y | OK | None. |
| FR-7.2 | Y | Y | Y | OK | None. |
| FR-7.3 | Y | Y | Y | OK | None. |

## 3) Use Case Audit
- UC-1 Register New Member: All required fields present. FR mapping valid. Alternate flows present.
- UC-2 Create Package: All required fields present. FR mapping valid. Alternate flows present.
- UC-3 Activate Membership: All required fields present. FR mapping valid. Alternate flows present.
- UC-4 Member Check-In: All required fields present. FR mapping valid. Alternate flows present.
- UC-5 Record Payment / Transaction: All required fields present. FR mapping valid. Alternate flows present.
- UC-6 Assign Trainer: All required fields present. FR mapping valid. Alternate flows present.
- UC-7 View Dashboard / Reports: All required fields present. FR mapping valid. Alternate flows present.
- Missing UCs required for coverage: Login & Role (FR-1.1–FR-1.3), Edit Member (FR-2.2), Member Detail View (FR-2.4), Create Trainer (FR-5.1).

## 4) RBAC Audit
- Roles listed: Owner, Staff, Trainer, Member, System Admin (optional).
- Consistency issues:
1. FR-1.3 states Staff access = member + transaksi + check-in. PRD RBAC grants Staff manage packages and activate membership. Epic Use Case 2 requires Staff to activate membership, implying package access. This is a source ambiguity that must be explicitly resolved in PRD assumptions.
2. Trainer view includes schedule in FR-5.3, but no schedule entity exists in PRD data model.
- Member role is correctly marked as no access for admin web app.
- System Admin is not in epic-fr.md and should be tagged as assumption or removed from RBAC section.

## 5) Structural Completeness Audit
| Required Section | Status | Notes |
|---|---|---|
| Title Page | Pass | Present. |
| Executive Summary | Pass | Present. |
| Scope | Pass | Present. |
| Personas & Actors | Pass | Present. |
| User Journeys | Pass | Present. |
| Functional Requirements | Pass | Present with IDs. |
| Use Cases | Pass | Present; missing UCs for some FRs. |
| RBAC / Permission Matrix | Pass | Present; ambiguity noted. |
| Data & Domain Model | Pass | Present; schedule entity missing. |
| NFR | Pass | Present; several items are assumptions. |
| UX / UI Notes | Pass | Present. |
| Acceptance Criteria | Pass | Present; some ACs incomplete. |
| Traceability Matrix | Pass | Present but missing some FR-to-UC mappings. |
| Risks & Assumptions | Pass | Present; needs expanded assumptions. |
| Open Questions | Pass | Present. |

## 6) Findings & Recommendations

### Critical
1. Missing UC mapping for FR-1.1, FR-1.2, FR-1.3.
- Impact: Auth and RBAC are core; coverage rule violated.
- Suggested patch snippet:
```markdown
### UC-0 Login & Access Control
- Primary Actor: Owner/Staff/Trainer
- Stakeholders: Owner, Staff, Trainer
- Preconditions: User account exists.
- Trigger: User opens login page and submits credentials.
- Main Flow:
1. User enters email and password.
2. System validates credentials and role.
3. System creates session and redirects to allowed module.
- Alternate Flows:
1. Invalid credentials ? show error and deny access.
2. Role not permitted for target module ? show access denied.
- Postconditions: Authenticated session with enforced role permissions.
- Related FRs: FR-1.1, FR-1.2, FR-1.3
```
- Update Traceability Matrix: add UC-0 under EPIC 1.

2. Missing UC mapping for FR-2.2 and FR-2.4.
- Impact: Member edit and detail view not traceable to a UC.
- Suggested patch snippet:
```markdown
### UC-8 Edit Member & View Member Detail
- Primary Actor: Staff
- Stakeholders: Owner, Member
- Preconditions: Staff authenticated; member exists.
- Trigger: Staff opens member detail or edit action.
- Main Flow:
1. Staff opens member detail page.
2. System shows membership status, expiry, attendance total, transaction history.
3. Staff edits member fields and saves.
4. System validates and persists updates.
- Alternate Flows:
1. Invalid input ? show validation errors.
2. Member not found ? show error.
- Postconditions: Member detail displayed and updates saved if submitted.
- Related FRs: FR-2.2, FR-2.4
```
- Update Traceability Matrix: add UC-8 under EPIC 2.

### Major
1. Missing UC mapping for FR-5.1 (Create Trainer).
- Impact: V2 feature still requires UC traceability.
- Suggested patch snippet:
```markdown
### UC-9 Create Trainer
- Primary Actor: Owner
- Stakeholders: Trainer
- Preconditions: Owner authenticated.
- Trigger: Owner selects “Create Trainer”.
- Main Flow:
1. Owner enters trainer details.
2. System validates required fields.
3. System saves trainer.
- Alternate Flows:
1. Duplicate phone ? show error.
- Postconditions: Trainer created and available for assignment.
- Related FRs: FR-5.1
```
- Update Traceability Matrix: add UC-9 under EPIC 5.

2. RBAC ambiguity: FR-1.3 vs Staff permissions required by epic Use Case 2.
- Impact: Conflicting role scope can block MVP implementation.
- Suggested patch snippet:
```markdown
### 14.1 Assumptions
- Staff can manage packages and activate memberships as implied by epic Use Case 2, even though FR-1.3 lists member+transaksi+check-in only. Confirm final RBAC with stakeholders.
```

3. Trainer schedule data model missing for FR-5.3.
- Impact: Trainer view requires schedule data not defined.
- Suggested patch snippet:
```markdown
### 9.1 Core Entities
- TrainingSession: id, trainer_id, member_id, scheduled_at, duration_minutes, status.
```
- Alternative: mark schedule as V2 in FR-5.3 description and assumptions.

4. FR-3.3 acceptance criteria incomplete (only Expired).
- Impact: Status requirements not fully testable.
- Suggested patch snippet:
```markdown
- AC-FR-3.3-2: Given end_date in the future and not suspended, when membership status is computed, then it is Active.
- AC-FR-3.3-3: Given a membership is set to Suspended by staff, when status is computed, then it is Suspended and check-in is blocked.
```

### Minor
1. New NFRs introduced without explicit assumptions.
- Impact: Scope expectations may drift.
- Suggested patch snippet:
```markdown
### 14.1 Assumptions
- Performance target (2s page load for 10k members) is a provisional goal.
- Daily database backups and basic audit logging are operational assumptions.
```

2. System Admin role appears in PRD but not in epic-fr.md.
- Impact: Potential scope creep if treated as an application role.
- Suggested patch snippet:
```markdown
### 4.5 System Admin (Optional)
- Note: This is an operational role outside application RBAC, added as an assumption.
```

## 7) Appendix: Assumptions / V2 Features Found in PRD Not in epic-fr.md
- System Admin role described in Personas.
- Performance target of 2 seconds for up to 10k members.
- Daily backup and basic error monitoring.
- Audit logging scope for login, membership activation, and transactions.
- One active trainer assignment per member.
- Trainer schedule implied in FR-5.3 without defined data model (source gap).

## Self-Check
- [x] Every FR from epic-fr.md is listed in the coverage matrix.
- [x] Each “No” has a concrete proposed fix.
- [x] No modifications were made to PRD.md.
- [x] Output written to docs/QC-PRD-COVERAGE.md.
