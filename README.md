# 📂 Rack Management System (RMS)

A modern Rack Management System built with **Next.js**, **TypeScript**, **Prisma**, and **PostgreSQL** to manage physical file records across multiple buildings, floors, departments, and racks.

The goal of this project is to replace the existing legacy software with a fast, clean, and easy-to-use internal application while keeping the feature set simple and practical.

---

# Project Goal

Help employees quickly locate physical files stored inside the organization.

Instead of manually searching through racks or relying on outdated software, users should be able to search a file and instantly know its exact physical location.

---

# Vision

The Rack Management System is designed to help employees locate
physical files within seconds.

The application is intentionally kept lightweight,
fast, and easy to maintain.

It is not intended to become a full Document Management System (DMS).
Only metadata about physical files is stored—not the file contents themselves.


# Out of Scope

The following features are intentionally excluded:

- Document uploads
- OCR
- AI search
- Email notifications
- Workflow approvals
- Digital signatures
- Multi-company support
- Mobile application
- Live collaboration

# Core Features

## Authentication

* Login
* Logout
* Change Password
* Session Management

---

## User Management

### Roles

* Admin
* User

### Permission Based Access

Admins can control permissions such as:

* View Records
* Create Records
* Update Records
* Delete Records
* Import Excel
* Export Excel
* Print Labels
* Manage Users
* Manage Departments
* Manage Racks

---

## User Scope

Users can be restricted to specific areas.

Example

```
Finance Department

or

Rack F-01
Rack F-02
Rack F-03
```

A user should only see records they are authorized to access.

---

# Physical Storage Hierarchy

```
Building
    ↓
Floor
    ↓
Department
    ↓
Rack
    ↓
Shelf (Optional)
    ↓
File
```
Files derive their location through database relationships rather than storing duplicated Building/Floor/Rack information.

Example

```
Head Office

2nd Floor

Finance Department

Rack F-03

Shelf B

Employee Salary Register
```

---

# Building Management

Admin can

* Add Building
* Edit Building
* Delete Building
* View Buildings

Example

```
Head Office

Branch Office

Warehouse
```

---

# Floor Management

Each building contains multiple floors.

Example

```
Ground Floor

First Floor

Second Floor
```

---

# Department Management

Example

* HR
* Finance
* IT
* Administration
* Sales

CRUD operations supported.

---

# Rack Management

Each rack belongs to

* Building
* Floor
* Department

Rack Information

* Rack Number
* Rack Name
* Description
* Status

---

# Shelf Management (Optional)

Each rack may contain multiple shelves.

Example

```
Rack F-03

Shelf A

Shelf B

Shelf C
```

---

## File Management

Each file stores:

- File Number
- File Name
- Description
- Financial Year
- Storage Location (Rack/Shelf)
- Status
- Created By
- Updated By
- Created Date
- Updated Date

The complete location (Building → Floor → Department → Rack → Shelf) is derived through database relationships and displayed in the user interface.


# File Description

A permanent description of the file.

Example

```
Contains salary revisions,
employee contracts,
promotion letters,
and appraisal reports.
```

---

# File Status

* Available
* Checked Out
* Archived
* Missing

---

# Search

The search should be extremely fast.

Search by

* File Number
* File Name
* Description
* Department
* Building
* Floor
* Rack
* Shelf
* Financial Year

Filters

* Department
* Building
* Floor
* Rack
* FY
* Status

---

# Dashboard

Simple overview.

Display

* Total Files
* Total Departments
* Total Buildings
* Total Floors
* Total Racks
* Recently Added Files
* Recently Updated Files

---

# Excel Import

Support importing records from Excel.

Workflow

```
Upload

↓

Validate

↓

Preview Errors

↓

Import
```

Show

* Total Records
* Valid Records
* Invalid Records

Example Errors

```
Department Missing

Rack Not Found

Duplicate File Number
```

---

# Excel Export

Allow exporting

* All Records
* Selected Department
* Selected Rack
* Current Search
* Reports

---

# Label Printing

Generate printable file labels.

Include

* File Name
* File Number
* Financial Year
* Department
* Building
* Floor
* Rack
* Shelf
* QR Code (Future)

---

# Reports

Generate reports for

* Files by Department
* Files by Rack
* Files by Building
* Files by Financial Year
* Archived Files
* Missing Files

Export reports to Excel.

---

# Bulk Operations

Support

* Bulk Delete
* Bulk Move
* Bulk Update
* Bulk Label Printing

---

# Duplicate Detection

Prevent duplicate file numbers during

* Manual Entry
* Excel Import

---

# Audit Log

Record every important action.

Track

* User
* Action
* Previous Value
* New Value
* Date & Time

Example

```
Rack

Old

F-03

New

F-07
```

---

# Activity History

Every file maintains its own history.

Example

```
Created

↓

Moved to Rack

↓

Description Updated

↓

Archived
```

---

# Soft Delete

Instead of permanently deleting records

```
Delete

↓

Recycle Bin

↓

Restore

↓

Permanent Delete
```

---

# Archive

Old files can be archived.

Archive should still allow searching.

---

# Borrow / Check-Out

Track when a file leaves its rack.

Store

* Taken By
* Department
* Taken Date
* Expected Return Date
* Remarks

---

# Notifications

Simple notifications only.

Example

```
Record Created

Excel Imported

Labels Generated

Record Updated
```

---

# Settings

Admin can configure

* Company Name
* Default Financial Year
* Label Size
* Excel Template
* Printer Settings

---

# Suggested Tech Stack

Frontend

* Next.js (App Router)
* React
* TypeScript
* Tailwind CSS
* shadcn/ui

Backend

* Next.js Server Actions / API Routes
* Prisma ORM
* PostgreSQL

Validation

* Zod
* React Hook Form

Utilities

* ExcelJS
* SheetJS
* react-to-print

---

# Database Tables

```
Users

Roles

Permissions

UserPermissions

Buildings

Floors

Departments

Racks

Shelves

Files

AuditLogs

ActivityLogs

FinancialYears
```

---

# Project Structure

```
Dashboard

├── Files
│      ├── Search
│      ├── Add
│      ├── Edit
│      ├── Labels
│
├── Buildings
│
├── Floors
│
├── Departments
│
├── Racks
│
├── Shelves
│
├── Users
│
├── Reports
│
├── Import / Export
│
└── Settings
```

---

# Future Enhancements

* QR Code labels
* Barcode support
* Capacity tracking for racks
* File tags
* Global search shortcut
* Dark mode
* Mobile responsive UI
* Advanced filtering
* Dashboard analytics

---

# Development Philosophy

* Keep the interface clean.
* Prioritize speed over unnecessary features.
* Make searching for files effortless.
* Keep every module simple and intuitive.
* Design for maintainability and scalability.
* Build features only when they solve a real business problem.

---

# Version Roadmap

## Version 1.0

* Authentication
* User Management
* Buildings
* Floors
* Departments
* Racks
* Shelves
* File Records
* Search
* Excel Import
* Excel Export
* Label Printing
* Reports
* Permissions
* Audit Logs
* Soft Delete

## Version 1.1

* Borrow / Check-Out
* QR Code Labels
* Activity History
* Bulk Operations

## Version 2.0

* Capacity Tracking
* File Tags
* Advanced Reports
* Dashboard Analytics
* Barcode Scanner Support

---

# Primary Objective

> **"Help any employee locate any physical file within seconds."**

Every feature in this project should contribute to achieving that goal. If a proposed feature does not make file management easier, faster, or more reliable, it should be reconsidered.
