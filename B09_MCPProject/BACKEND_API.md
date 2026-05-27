# B09 MCP Backend API Summary

## Deploy checklist

1. Run SQL scripts (see below)
2. Restart **user-service**, **organizational-service**, **mentoring-service**
3. Re-login test accounts to refresh Redis permissions

## SQL scripts (order)

**common-user**
- `sys_operation_log.sql`
- `sys_feedback.sql`
- `add_support_staff_role.sql`
- `seed_test_accounts.sql`

**organization-service-database**
- `orgANDUnit.sql` (if empty)

**mentoring-service**
- `mcp_schema_extension.sql`

## Test accounts (password `123456`)

| Username | Role |
|----------|------|
| test_admin | ADMIN |
| test_support | SUPPORT_STAFF |
| test_fc | FACULTY_CONSULTANT |

---

## User-Service `/api/user`

| Method | Path | Roles |
|--------|------|-------|
| GET | `/login` | public |
| GET | `/students/all` | SUPPORT_STAFF |
| GET | `/logs` | SUPPORT_STAFF, ADMIN |
| GET | `/logs/faculty?studentIds=` | FACULTY_CONSULTANT |
| POST | `/feedback` | authenticated |
| GET | `/feedback` | ADMIN, SUPPORT_STAFF |
| CRUD | `/admin/faculty-consultants` | ADMIN |
| CRUD | `/admin/supporting-staff` | ADMIN |

## Message `/api/message` (requires `message:communicate`)

| Method | Path |
|--------|------|
| POST | `/send` |
| GET | `/list`, `/unread-count`, `/{id}` |

## Organizational-Service `/api/org`

| Method | Path | Roles |
|--------|------|-------|
| CRUD | `/admin/units`, `/admin/units/import-excel` | ADMIN |
| GET | `/mentors/search` | FACULTY_CONSULTANT |
| GET | `/students/search` | SUPPORT_STAFF, FACULTY_CONSULTANT |
| GET | `/student/{id}` | MENTOR, COORDINATOR, FACULTY_CONSULTANT |

## Mentoring-Service `/api/mentoring`

| Area | Path prefix |
|------|-------------|
| Records | `/records` |
| Groups | `/groups` |
| Import | `/import/mcp-allocation`, `/import/coordinators` |
| Cases | `/cases` |
| Appointments | `/appointments` |
| Export Word | `/export/group/{id}`, `/export/student/{id}`, `/export/consultant` (FC 筛选) |
| Student records | `GET /api/mentoring/student/my-records`, `GET /api/mentoring/student/records/{recordId}` |

**MCP 小组标识：** `groupKey` = 组织 UUID（唯一）；`groupId` / `groupLabel` = 展示标签如 `2024-2025-Y1`（同学年可多组，靠导师+专业区分）。路径参数 `{groupId}` 传标签，服务内部解析为 `groupKey`。
| Student | `/student/group-status`, `/student/my-mentor` |
