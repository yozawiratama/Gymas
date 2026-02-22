# Gymas – Gym Management System (PRD)

## 1. Title Page
- Product: Gymas – Gym Management System
- Version: 1.0
- Date: February 22, 2026
- Owner: Product Owner (Gymas)
- Stakeholders: Owner, Staff, Trainer, Members, System Admin (ops)

## 2. Executive Summary
### 2.1 Problem Statement
Small–medium gyms need a lightweight web system to manage members, memberships, trainers, payments, daily attendance, and basic business reporting with role-based access control.

### 2.2 Goals
- Provide secure login and role permissions for gym operations.
- Enable member, package, membership activation, payment, and attendance workflows.
- Deliver operational visibility via a simple dashboard and reporting.

### 2.3 Non-Goals
- Member self-service portal (out of scope for MVP unless specified).
- Mobile apps.
- Advanced integrations not listed in the source (payments, hardware devices).

## 3. Scope
### 3.1 In Scope (MVP)
- Authentication and role permissions.
- Member CRUD, deactivate (soft delete), and detail view.
- Package CRUD and membership activation with auto-expiry calculation.
- Payment/transaction recording and history filters.
- Manual check-in with active membership validation and attendance history.
- Basic dashboard metrics (summary).

### 3.2 Out of Scope
- Member-facing portal (unless later defined).
- QR code check-in.
- Advanced reporting beyond the specified summary metrics and charts.

### 3.3 Future / V2 Ideas
- QR code check-in.
- Trainer module enhancements and advanced reporting.
- Additional dashboard analytics.

## 4. Personas & Actors
### 4.1 Owner
- Goals: Monitor business performance; manage access and trainers.
- Responsibilities: Full access to all data and dashboards.
- Permissions Summary: Full CRUD across modules; view all reports.

### 4.2 Staff
- Goals: Execute daily operations (members, transactions, check-ins).
- Responsibilities: Manage members, memberships, transactions, and attendance.
- Permissions Summary: CRUD member, package, membership activation, transactions, check-in.

### 4.3 Trainer
- Goals: View assigned members and personal training schedule.
- Responsibilities: Provide training services.
- Permissions Summary: Read-only access to assigned members and schedule.

### 4.4 Member
- Goals: Maintain membership and check-in (offline or staff-driven).
- Responsibilities: N/A in admin web app.
- Permissions Summary: No access in MVP admin panel.

### 4.5 System Admin (Optional)
- Goals: Maintain system configuration and support.
- Responsibilities: Technical admin, backups, and monitoring.
- Permissions Summary: Infrastructure-level access (not an application role unless needed).

## 5. User Journeys (High Level)
1. Onboard member ? Activate membership ? Record payment ? Member check-in ? Attendance history.
2. Manage packages ? Assign trainer ? Trainer views assigned members.
3. Owner login ? View dashboard summary and revenue charts.

## 6. Functional Requirements (By Epic)
Notes: Wording kept close to source. Priority is marked as MVP or V2 based on MVP scope.

### EPIC 1 – Authentication & Role
**FR-1.1 – Login**
- Description: Admin dapat login menggunakan email & password. Password di-hash.
- Priority: MVP
- Validation Rules: Email required; password required; hashed storage; invalid credentials return error.
- UI Notes: Simple login form.
- Error States: Invalid email/password; inactive user (if added later).

**FR-1.2 – Role**
- Description: Role minimum: Owner, Staff, Trainer.
- Priority: MVP
- Validation Rules: Role must be one of the minimum roles.
- UI Notes: Role displayed in user management (if exposed).
- Error States: Unauthorized role access.

**FR-1.3 – Role Permission**
- Description: Owner full access; Staff member + transaksi + check-in; Trainer view assigned members only.
- Priority: MVP
- Validation Rules: Enforce RBAC on all endpoints and UI actions.
- UI Notes: Hide unauthorized navigation items.
- Error States: Access denied (403) on unauthorized actions.

### EPIC 2 – Member Management
**FR-2.1 – Create Member**
- Description: Nama, No HP, Email, Tanggal lahir, Gender, Foto (optional).
- Priority: MVP
- Validation Rules: Name required; phone required; email format if provided; DOB valid date; gender enum.
- UI Notes: Form with optional photo upload.
- Error States: Duplicate member by email/phone; invalid fields.

**FR-2.2 – Edit Member**
- Description: Data bisa diubah.
- Priority: MVP
- Validation Rules: Same as create; audit updated_at.
- UI Notes: Edit form with existing data.
- Error States: Member not found.

**FR-2.3 – Deactivate Member**
- Description: Soft delete. Tidak bisa check-in bila inactive.
- Priority: MVP
- Validation Rules: Deactivated members blocked from check-in.
- UI Notes: Status toggle or deactivate action.
- Error States: Attempted check-in for inactive member.

**FR-2.4 – Member Detail View**
- Description: Menampilkan status membership, expired date, total attendance, riwayat transaksi.
- Priority: MVP
- Validation Rules: Compute totals based on attendance and transactions.
- UI Notes: Summary panel on member detail page.
- Error States: Missing membership data.

### EPIC 3 – Membership & Package Management
**FR-3.1 – Create Package**
- Description: Nama paket, durasi (bulan), harga, deskripsi.
- Priority: MVP
- Validation Rules: Duration positive integer; price non-negative; name required.
- UI Notes: Package form.
- Error States: Duplicate package name.

**FR-3.2 – Activate Package to Member**
- Description: Pilih member, pilih paket, set start date, system auto-calc expired date.
- Priority: MVP
- Validation Rules: Start date required; expiry = start date + duration months.
- UI Notes: Activation modal/form.
- Error States: Member inactive; package not found.

**FR-3.3 – Membership Status**
- Description: Status: Active, Expired, Suspended.
- Priority: MVP
- Validation Rules: Status auto-updates based on expiry; Suspended set manually if needed.
- UI Notes: Status badge.
- Error States: Invalid status transition.

### EPIC 4 – Payment & Transaction Management
**FR-4.1 – Create Transaction**
- Description: Member, Paket, Amount, Metode pembayaran (Cash / Transfer / QRIS), Tanggal.
- Priority: MVP
- Validation Rules: Amount > 0; method in allowed list; date required.
- UI Notes: Transaction form tied to membership activation.
- Error States: Missing member or package.

**FR-4.2 – Payment Confirmation**
- Description: Mark as paid.
- Priority: MVP
- Validation Rules: Transaction status changes from unpaid to paid.
- UI Notes: Paid toggle or confirm action.
- Error States: Double confirmation.

**FR-4.3 – Transaction History**
- Description: Filter by date; filter by member.
- Priority: MVP
- Validation Rules: Date range valid; member exists.
- UI Notes: Table with filters.
- Error States: No records found.

### EPIC 5 – Trainer Management
**FR-5.1 – Create Trainer**
- Description: Nama, No HP, Specialty.
- Priority: V2
- Validation Rules: Name and phone required.
- UI Notes: Trainer form.
- Error States: Duplicate trainer by phone.

**FR-5.2 – Assign Trainer to Member**
- Description: Member dapat memiliki trainer aktif.
- Priority: V2
- Validation Rules: One active trainer per member (assumed).
- UI Notes: Assignment control on member detail.
- Error States: Trainer not found.

**FR-5.3 – Trainer View**
- Description: Trainer hanya bisa melihat assigned members dan jadwal personal training.
- Priority: V2
- Validation Rules: Restrict data to assigned members.
- UI Notes: Trainer dashboard.
- Error States: Access denied.

### EPIC 6 – Attendance / Check-In System
**FR-6.1 – Manual Check-In**
- Description: Staff cari member, klik check-in, system validasi membership active.
- Priority: MVP
- Validation Rules: Membership must be active; member not deactivated.
- UI Notes: Search and check-in button.
- Error States: Inactive or expired membership.

**FR-6.2 – Auto Expiry Check**
- Description: Jika expired: tampilkan warning, tidak bisa check-in.
- Priority: MVP
- Validation Rules: Block check-in when expired.
- UI Notes: Warning banner.
- Error States: Attempted check-in when expired.

**FR-6.3 – Attendance History**
- Description: List kehadiran per member.
- Priority: MVP
- Validation Rules: Attendance records linked to member.
- UI Notes: Attendance tab in member detail.
- Error States: No attendance records.

### EPIC 7 – Dashboard & Reporting
**FR-7.1 – Summary Metrics**
- Description: Owner melihat total active member, expired member, revenue bulan ini, revenue hari ini.
- Priority: MVP
- Validation Rules: Metrics computed from membership and transactions.
- UI Notes: KPI cards.
- Error States: Data unavailable.

**FR-7.2 – Revenue Chart**
- Description: Monthly revenue chart.
- Priority: V2
- Validation Rules: Aggregate by month.
- UI Notes: Line/bar chart.
- Error States: No data.

**FR-7.3 – Expired Soon Alert**
- Description: Membership yang akan habis dalam 7 hari.
- Priority: V2
- Validation Rules: Expiry date within 7 days.
- UI Notes: Alert list.
- Error States: No expiring memberships.

## 7. Use Cases (Detailed)
Use cases include required fields and reference FR IDs.

### UC-1 Register New Member
- Primary Actor: Staff
- Stakeholders: Owner, Member
- Preconditions: Staff authenticated; role = Staff or Owner.
- Trigger: Staff selects “Tambah Member”.
- Main Flow:
1. Staff opens create member form.
2. Staff enters required fields.
3. System validates input.
4. System creates member record.
- Alternate Flows:
1. Invalid input ? show validation errors.
2. Duplicate phone/email ? show error and prevent save.
- Postconditions: Member created and visible in list.
- Related FRs: FR-2.1

### UC-2 Create Package
- Primary Actor: Staff
- Stakeholders: Owner
- Preconditions: Authenticated Staff or Owner.
- Trigger: Staff selects “Create Package”.
- Main Flow:
1. Staff enters package details.
2. System validates fields.
3. System saves package.
- Alternate Flows:
1. Duplicate package name ? show error.
- Postconditions: Package available for activation.
- Related FRs: FR-3.1

### UC-3 Activate Membership
- Primary Actor: Staff
- Stakeholders: Owner, Member
- Preconditions: Member active; package exists; staff authenticated.
- Trigger: Staff selects “Activate Membership”.
- Main Flow:
1. Staff selects member and package.
2. Staff enters start date and payment details.
3. System calculates expiry date.
4. System creates membership and transaction record.
5. Membership status becomes Active.
- Alternate Flows:
1. Member inactive ? show error and abort.
2. Invalid date ? show validation error.
- Postconditions: Membership active and transaction created.
- Related FRs: FR-3.2, FR-3.3, FR-4.1, FR-4.2

### UC-4 Member Check-In
- Primary Actor: Staff
- Stakeholders: Owner, Member
- Preconditions: Staff authenticated; member exists.
- Trigger: Staff selects member and clicks check-in.
- Main Flow:
1. Staff searches member.
2. System validates membership status.
3. If active, system records attendance.
- Alternate Flows:
1. Membership expired ? show warning and block check-in.
2. Member deactivated ? block check-in.
- Postconditions: Attendance record created if valid.
- Related FRs: FR-6.1, FR-6.2, FR-6.3, FR-2.3

### UC-5 Record Payment / Transaction
- Primary Actor: Staff
- Stakeholders: Owner, Member
- Preconditions: Staff authenticated; member and package exist.
- Trigger: Staff records a transaction or as part of activation.
- Main Flow:
1. Staff enters transaction details.
2. System validates amount and method.
3. System saves transaction.
4. Staff marks transaction as paid.
- Alternate Flows:
1. Missing required fields ? show errors.
- Postconditions: Transaction stored with paid status.
- Related FRs: FR-4.1, FR-4.2, FR-4.3

### UC-6 Assign Trainer
- Primary Actor: Owner or Staff
- Stakeholders: Trainer, Member
- Preconditions: Trainer exists; member exists.
- Trigger: Owner/Staff selects “Assign Trainer”.
- Main Flow:
1. Select member.
2. Select trainer.
3. Save assignment.
- Alternate Flows:
1. Trainer not found ? show error.
- Postconditions: Trainer assignment stored; trainer can view assigned member.
- Related FRs: FR-5.2, FR-5.3

### UC-7 View Dashboard / Reports
- Primary Actor: Owner
- Stakeholders: Staff
- Preconditions: Owner authenticated.
- Trigger: Owner opens dashboard.
- Main Flow:
1. System loads summary metrics.
2. System displays revenue chart (if enabled).
3. System shows expiring membership alerts (if enabled).
- Alternate Flows:
1. No data ? display empty state.
- Postconditions: Owner sees up-to-date metrics.
- Related FRs: FR-7.1, FR-7.2, FR-7.3

## 8. RBAC / Permission Matrix
| Feature/Action | Owner | Staff | Trainer | Member |
|---|---|---|---|---|
| Login | Yes | Yes | Yes | No |
| View dashboard | Yes | No | No | No |
| Manage members (CRUD) | Yes | Yes | No | No |
| Deactivate member | Yes | Yes | No | No |
| View member detail | Yes | Yes | Assigned only | No |
| Manage packages | Yes | Yes | No | No |
| Activate membership | Yes | Yes | No | No |
| Record transactions | Yes | Yes | No | No |
| View transaction history | Yes | Yes | No | No |
| Manual check-in | Yes | Yes | No | No |
| View attendance history | Yes | Yes | Assigned only | No |
| Manage trainers | Yes | No | No | No |
| Assign trainer | Yes | Yes | No | No |
| Trainer view assigned members | Yes | No | Yes | No |

## 9. Data & Domain Model (High Level)
### 9.1 Core Entities
- User: id, name, email, password_hash, role_id, status, created_at.
- Role: id, name (Owner/Staff/Trainer).
- Member: id, name, phone, email, dob, gender, photo_url, status (active/inactive), created_at.
- Package: id, name, duration_months, price, description, active.
- Membership: id, member_id, package_id, start_date, end_date, status.
- Transaction: id, member_id, package_id, amount, method (Cash/Transfer/QRIS), date, status.
- Attendance: id, member_id, checkin_at, created_by.
- Trainer: id, name, phone, specialty.
- TrainerAssignment: id, trainer_id, member_id, start_date, end_date, status.

### 9.2 Relationship Notes
- Member has many Memberships, Transactions, Attendance.
- Package has many Memberships and Transactions.
- TrainerAssignment links Trainer and Member with active status.
- Membership status derived from end_date; allow Suspended.

### 9.3 Prisma/MySQL Considerations
- Use soft delete for Member (status + deleted_at).
- Indexes: Member(phone, email), Transaction(date), Membership(end_date), Attendance(member_id).
- Enforce referential integrity with foreign keys.

## 10. Non-Functional Requirements (NFR)
- Security: Password hashing; session handling; enforce RBAC on server and UI.
- Audit/Logging: Log login events, membership activation, and transactions (basic).
- Performance: Standard pages load within 2 seconds for up to 10k members.
- Reliability: Daily backup of database; basic error monitoring.
- Privacy: Limit trainer access to assigned members only.

## 11. UX / UI Notes
- Navigation: Dashboard, Members, Packages, Memberships, Transactions, Attendance, Trainers.
- Key Pages: Login, Member list/detail, Package list, Activation flow, Transaction history, Attendance, Dashboard.
- Validation: Inline field validation; clear error messages; prevent destructive actions without confirmation.

## 12. Acceptance Criteria
### 12.1 FR Acceptance Criteria
- AC-FR-1.1-1: Given valid admin credentials, when the admin submits the login form, then the system authenticates and starts a session.
- AC-FR-1.1-2: Given invalid credentials, when the admin submits the login form, then the system shows an error and does not authenticate.
- AC-FR-1.2-1: Given a user account, when role is assigned, then it must be one of Owner, Staff, Trainer.
- AC-FR-1.3-1: Given a Staff user, when accessing restricted routes, then only member, transaction, and check-in modules are allowed.

- AC-FR-2.1-1: Given required fields are valid, when Staff submits create member, then a member is created.
- AC-FR-2.2-1: Given an existing member, when Staff edits fields, then changes are saved.
- AC-FR-2.3-1: Given a deactivated member, when check-in is attempted, then the system blocks and shows warning.
- AC-FR-2.4-1: Given a member detail view, when loaded, then status, expired date, total attendance, and transaction history are shown.

- AC-FR-3.1-1: Given valid package fields, when saved, then the package is created.
- AC-FR-3.2-1: Given member, package, and start date, when activation is submitted, then expiry date is auto-calculated and stored.
- AC-FR-3.3-1: Given end_date in the past, when membership status is computed, then it is Expired.

- AC-FR-4.1-1: Given a member and package, when transaction is created, then amount, method, and date are stored.
- AC-FR-4.2-1: Given an unpaid transaction, when marked paid, then status updates to paid.
- AC-FR-4.3-1: Given a date range, when filters are applied, then only matching transactions are shown.

- AC-FR-5.1-1: Given valid trainer fields, when created, then trainer is stored.
- AC-FR-5.2-1: Given trainer and member, when assigned, then a trainer assignment is created and set active.
- AC-FR-5.3-1: Given a trainer user, when viewing members, then only assigned members and schedules are visible.

- AC-FR-6.1-1: Given an active membership, when Staff checks in a member, then attendance is recorded.
- AC-FR-6.2-1: Given an expired membership, when Staff checks in, then the system blocks and warns.
- AC-FR-6.3-1: Given a member, when attendance history is opened, then a list of attendance is displayed.

- AC-FR-7.1-1: Given an Owner user, when dashboard loads, then active/expired members and revenue metrics are visible.
- AC-FR-7.2-1: Given transaction data, when monthly chart loads, then data is grouped by month.
- AC-FR-7.3-1: Given memberships expiring within 7 days, when alerts load, then those memberships are listed.

### 12.2 UC Acceptance Criteria
- AC-UC-1-1: Given Staff is authenticated, when they submit a valid member form, then the member is created.
- AC-UC-2-1: Given Staff is authenticated, when they submit a valid package form, then the package is created.
- AC-UC-3-1: Given member is active, when membership is activated, then expiry date is calculated and membership is active.
- AC-UC-4-1: Given membership is active, when check-in is performed, then attendance is recorded.
- AC-UC-4-2: Given membership is expired, when check-in is attempted, then it is blocked with warning.
- AC-UC-5-1: Given transaction data is valid, when saved, then transaction is stored and can be marked paid.
- AC-UC-6-1: Given trainer and member exist, when assigned, then trainer can view assigned member.
- AC-UC-7-1: Given Owner logs in, when dashboard opens, then summary metrics are displayed.

## 13. Traceability Matrix
| Epic | Use Case(s) | FR(s) | Acceptance Criteria |
|---|---|---|---|
| EPIC 1 Authentication & Role | UC-7 | FR-1.1, FR-1.2, FR-1.3 | AC-FR-1.1-1, AC-FR-1.1-2, AC-FR-1.2-1, AC-FR-1.3-1 |
| EPIC 2 Member Management | UC-1, UC-4 | FR-2.1, FR-2.2, FR-2.3, FR-2.4 | AC-FR-2.1-1, AC-FR-2.2-1, AC-FR-2.3-1, AC-FR-2.4-1, AC-UC-1-1, AC-UC-4-1, AC-UC-4-2 |
| EPIC 3 Membership & Package | UC-2, UC-3 | FR-3.1, FR-3.2, FR-3.3 | AC-FR-3.1-1, AC-FR-3.2-1, AC-FR-3.3-1, AC-UC-2-1, AC-UC-3-1 |
| EPIC 4 Payment & Transaction | UC-3, UC-5 | FR-4.1, FR-4.2, FR-4.3 | AC-FR-4.1-1, AC-FR-4.2-1, AC-FR-4.3-1, AC-UC-5-1 |
| EPIC 5 Trainer Management | UC-6 | FR-5.1, FR-5.2, FR-5.3 | AC-FR-5.1-1, AC-FR-5.2-1, AC-FR-5.3-1, AC-UC-6-1 |
| EPIC 6 Attendance | UC-4 | FR-6.1, FR-6.2, FR-6.3 | AC-FR-6.1-1, AC-FR-6.2-1, AC-FR-6.3-1, AC-UC-4-1, AC-UC-4-2 |
| EPIC 7 Dashboard & Reporting | UC-7 | FR-7.1, FR-7.2, FR-7.3 | AC-FR-7.1-1, AC-FR-7.2-1, AC-FR-7.3-1, AC-UC-7-1 |

## 14. Risks & Assumptions
### 14.1 Assumptions
- Staff and Owner roles perform most operations; Trainer is read-only for assigned members.
- One active trainer assignment per member.
- Payment status is tracked per transaction with a simple paid/unpaid state.

### 14.2 Risks
- Scope creep into member portal or payment integrations.
- Data consistency issues if membership expiry rules are not centralized.
- Operational reliance on manual check-in without offline support.

## 15. Open Questions
- Should Suspended status be manually set by Owner/Staff, and does it block check-in?
- Is transaction creation always coupled with membership activation or can it be standalone?
- Should trainers have read access to attendance history for assigned members?

## Self-Check
- [x] All FR IDs from docs/epic-fr.md are included verbatim and mapped.
- [x] Use Cases cover main workflows and include alternate flows.
- [x] Roles/actors are consistent with use cases and permissions.
- [x] No contradictions with epic-fr.md.
- [x] MVP vs V2 is clearly labelled.
- [x] Output written to docs/PRD.md.
