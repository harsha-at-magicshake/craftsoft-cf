# Craftsoft Database Schema (v2)

## Overview
This folder contains the complete, organized SQL schema for the Craftsoft database.
Each file represents one table, with all related RLS policies, indexes, triggers, and functions.

## Features
- ✅ **Secure by Default**: All RLS policies use proper security checks (no `USING (true)` for INSERT/UPDATE/DELETE)
- ✅ **Active Admin Checks**: All admin operations require `status = 'ACTIVE'`
- ✅ **Search Path Hardened**: All functions have `SET search_path = public`
- ✅ **Organized**: One file per table, numbered for dependency order

## File Structure

| File | Table | Description |
|------|-------|-------------|
| `00_setup.sql` | - | Extensions, Realtime config, helper functions |
| `01_admins.sql` | admins | Admin users & authentication |
| `02_services.sql` | services | Specialized services offered |
| `03_courses.sql` | courses | Training programs |
| `04_tutors.sql` | tutors | Trainer profiles |
| `05_students.sql` | students | Student records |
| `06_inquiries.sql` | inquiries | Leads & inquiries |
| `07_payments.sql` | payments | Payment transactions |
| `08_receipts.sql` | receipts | Payment receipts |
| `09_activities.sql` | activities | Audit log |
| `10_settings.sql` | settings | Global settings |
| `11_clients.sql` | clients | Service clients |
| `12_student_otps.sql` | student_otps | OTP for student login |
| `13_user_sessions.sql` | user_sessions | Admin session management |
| `14_v-history.sql` | version_history | Platform roadmap & milestones |

## Execution Order

Run files in numerical order to respect foreign key dependencies:

```bash
# Fresh database setup
00_setup.sql        # Run first (extensions, helpers)
01_admins.sql       # No dependencies
02_services.sql     # No dependencies
03_courses.sql      # No dependencies
04_tutors.sql       # No dependencies
05_students.sql     # No dependencies
06_inquiries.sql    # No dependencies
11_clients.sql      # No dependencies (run before 08_receipts)
07_payments.sql     # Depends on: students, courses, services
08_receipts.sql     # Depends on: payments, students, clients, courses, services
09_activities.sql   # Depends on: admins
10_settings.sql     # No dependencies
12_student_otps.sql # Depends on: students
13_user_sessions.sql # Depends on: admins
14_v-history.sql    # No dependencies
```

## Security Model

### RLS Policy Naming Convention
- `anon_*` - Policies for anonymous users (website visitors)
- `admin_*` - Policies for authenticated admins
- `public_*` - Policies for public/anon read access

### Policy Patterns Used

| Pattern | Usage |
|---------|-------|
| `admin_read_*` | Active admins can SELECT |
| `admin_insert_*` | Active admins can INSERT |
| `admin_update_*` | Active admins can UPDATE |
| `admin_delete_*` | Active admins can DELETE |
| `admin_manage_*` | Active admins can ALL (CRUD) |
| `public_read_*` | Anyone can SELECT |
| `anon_insert_*` | Anonymous INSERT with validation |

### Security Checks
All admin policies include:
```sql
EXISTS (
    SELECT 1 FROM admins 
    WHERE id = auth.uid() AND status = 'ACTIVE'
)
```

### Function Security
All functions include:
```sql
SET search_path = public
```

## Migration from Old Schema

If you're migrating from the old `sql_scripts` folder:

1. **Backup your data** first
2. The new schema drops and recreates policies, not tables
3. Use `CREATE TABLE IF NOT EXISTS` to preserve existing data
4. Review policies if you have custom modifications

## Post-Setup: Dashboard Configuration

After running SQL scripts, enable these in Supabase Dashboard:

1. **Leaked Password Protection**
   - Go to: Authentication → Settings → Security
   - Enable "Leaked password protection"

2. **Realtime** (optional, run 00_setup.sql after tables exist)
   - Tables: activities, payments, receipts, user_sessions, inquiries
