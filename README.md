# TransitOps — Smart Transport Operations Platform

TransitOps is a unified logistics and fleet management console designed to replace spreadsheets-and-logbooks workflows with structured validation rules. It provides role-based workspaces for **Fleet Managers**, **Dispatchers**, **Safety Officers**, **Financial Analysts**, and a **Super Admin**.

---

## 📋 Problem Statement

Traditional fleet management operations rely on loose workflows like spreadsheets or manual logs. These methods fail due to:
* **Lack of Validation Constraints**: Inability to prevent vehicle cargo overloading, scheduling busy vehicles/drivers on concurrent trips, or assigning trips to drivers with expired commercial licenses or suspended statuses.
* **Siloed Workflows**: Different departments (finance, safety, scheduling, registry) require distinct visibility and authority scopes (RBAC) to perform operations securely without data pollution.
* **Complex Account Provisioning**: Lack of unified administration controls to audit active registrations, approve new signups, delete accounts, or edit authorization profiles on the fly.

---

## 🛠️ The Solution

TransitOps offers a multi-layered logistics console powered by:
1. **Strict Business Validation Rules**: Express backend validation layers preventing violation of fleet capacities, driver eligibility, and active vehicle maintenance statuses.
2. **Dynamic Developer-Friendly CORS Controls**: Development-mode CORS wildcard configurations matching any localhost port, preventing collisions when running multiple client sessions.
3. **Robust Database Bootstrapping**: Automated DB seeding, including persistent Super Admin syncing on start from `.env` parameters.
4. **Super Admin Console**: A central command interface for account oversight (global user listing, signup authorization, live role-reassignment, and account pruning).

---

## 📁 Project Folder Structure

```markdown
transitops-monorepo/
│
├── client/                     # Frontend Vite-React App
│   ├── src/
│   │   ├── assets/             # Assets & styles
│   │   ├── pages/              # Platform workspace pages
│   │   │   ├── Analytics.jsx   # Cost charts & usage analytics
│   │   │   ├── Dashboard.jsx   # Metrics, utilization gauge, recent trips
│   │   │   ├── Drivers.jsx     # Driver registry & license verification
│   │   │   ├── Expenses.jsx    # Refuel logs & expense entries
│   │   │   ├── Login.jsx       # Auth portal with shortcut selectors
│   │   │   ├── Maintenance.jsx # Maintenance logs scheduler
│   │   │   ├── Settings.jsx    # Depot variables & pending signups
│   │   │   ├── Signup.jsx      # New account request form
│   │   │   ├── SuperAdminConsole.jsx # [NEW] Global user administration
│   │   │   ├── Trips.jsx       # Dispatch router & trip planner
│   │   │   └── Vehicles.jsx    # Fleet asset registry
│   │   ├── services/           # Axios-based API helpers
│   │   ├── App.jsx             # React router & ProtectedRoute RBAC configuration
│   │   ├── index.css           # Vanilla CSS custom layout variables
│   │   └── main.jsx            # Entry point
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend Node/Express API Server
│   ├── config/
│   │   └── env.js              # Environment variable configurations
│   ├── middleware/
│   │   ├── auth.js             # JWT verification & RBAC authorize helpers
│   │   └── errorHandler.js     # Standard Express error catch blocks
│   ├── models/                 # Mongoose Database Schemas
│   │   ├── DepotSettings.js
│   │   ├── Driver.js
│   │   ├── Expense.js
│   │   ├── FuelLog.js
│   │   ├── MaintenanceLog.js
│   │   ├── Trip.js
│   │   ├── User.js
│   │   └── Vehicle.js
│   ├── routes/                 # Express API routes
│   │   ├── analytics.js
│   │   ├── auth.js             # Auth, Super Admin bootstrapping & user controls
│   │   ├── drivers.js
│   │   ├── expenses.js
│   │   ├── maintenance.js
│   │   ├── settings.js
│   │   ├── trips.js
│   │   └── vehicles.js
│   ├── scripts/
│   │   └── seed.js             # Database seeder (with mockup profiles)
│   ├── db.js                   # Mongoose connection routines
│   ├── package.json
│   ├── server.js               # Express application setup
│   └── test_rules.js           # Automated validation rules assertions suite
│
├── package.json                # Root workspaces package
└── README.md
```

---

## ⚙️ Project Setup

### 📋 Prerequisites
* **Node.js** (v24.0.0 or newer recommended)
* **NPM** (v11.0.0 or newer recommended)
* **Active Internet Connection** (first run downloads the ephemeral `mongodb-memory-server` binary if remote MongoDB URI is omitted)

### 🚀 Installation
From the root directory:
```powershell
# Set execution bypass (Windows PowerShell) if script loading is blocked
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process;

# Install all monorepo dependencies
npm install --legacy-peer-deps
```

### 🔑 Environment Configuration
Create a `.env` file inside the `server/` directory:
```env
# JWT Encryption Secret
JWT_SECRET=super_secret_key_for_transitops_app_12345

# MongoDB Atlas URI (Omitting this will boot an ephemeral in-memory MongoDB instance)
MONGODB_URI=

# Server Execution Parameters
PORT=5000
NODE_ENV=development

# Allowed CORS Origins
CLIENT_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000

# Cookie Security Settings
COOKIE_SECURE=false

# Bootstrapped Super Admin Account Configuration
SUPERADMIN_NAME="Super Admin"
SUPERADMIN_EMAIL="superadmin@transitops.com"
SUPERADMIN_PASSWORD="SuperAdmin@123"
```

### 💾 Seeding Database
Populate the database with pre-configured fleet settings, active vehicles, drivers, trips, maintenance activities, expenses, and pending users:
```powershell
npm run seed:dev
```

### 💻 Launching Servers
Run both client and server development workspaces concurrently:
```powershell
npm run dev
```
* **Frontend Access**: [http://localhost:5173](http://localhost:5173) (Falls back to `5174` or `5175` if port `5173` is busy).
* **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 🔒 Platform Access Roles & Scopes

Select a demo shortcut on the login page to sign in instantly, or log in manually:

| Role | Demo Credentials | Auth Scopes |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@transitops.com` / `SuperAdmin@123` | **Full access to all consoles**, global user management, signup authorization, live role-modifying, account deletion. |
| **Fleet Manager** | `manager@transitops.com` / `admin123` | Asset CRUD, maintenance logging, general settings, signup approvals. |
| **Dispatcher** | `dispatcher@transitops.com` / `admin123` | Trip creation, route dispatches, fuel logs, vehicle registry views. |
| **Safety Officer** | `safety@transitops.com` / `admin123` | Driver licensing CRUD, safety score inspections, trip status logs. |
| **Financial Analyst** | `finance@transitops.com` / `admin123` | Expense audits, cost reports, vehicle ROI metrics, refuel logs. |

---

## 🎯 Workspace Functionalities

### 1. Operations Dashboard
* **Dynamic KPI Widgets**: Active fleet count, available vehicles, transit dispatches, pending trips, maintenance counts, and real-time fleet utilization percentage.
* **Recent Trips Tracker**: Live dispatch list displaying trip codes, assigned driver, vehicle details, trip ETA, destination, and state badges.
* **Safety Watchlist Alerts**: Warning flags for commercial drivers with license issues.

### 2. Vehicle Registry
* **Asset Database**: Add, view, edit, and retire fleet assets.
* **Physical Constraints**: Configure acquisition cost, odometer metrics, and maximum load capacity in kilograms.
* **Status States**: Available, On Trip, In Shop, or Retired.

### 3. Drivers & Safety Module
* **Operator Profiling**: Tracks contact numbers, license category (LMV/HMV), and license expiration dates.
* **Safety Scoring & Performance**: Logs safety scores and historical trip completion rates.

### 4. Trip Dispatcher
* **Dispatch Planner**: Route creation specifying codes, source, destination, cargo weights, and planned distances.
* **Dynamic Dropdowns**: Filters and displays only active, available vehicles and licensed operators.
* **Transit Controllers**: Controls to Dispatch, Complete (logs mileage and fuel consumption), or Cancel active shipments.

### 5. Maintenance Scheduler
* **Servicing Logs**: Register service types (e.g. Engine Repair, Oil Change), repair costs, scheduling dates, and notes.
* **Asset State Syncing**: Flipping a maintenance log to Active automatically updates the vehicle status to "In Shop" and blocks it from trip dispatches.

### 6. Fuel & Expenses Audit
* **Refuel Registry**: Records liters refueled, fuel cost, and trip code.
* **Expense Breakdown**: Consolidates toll costs, fuel purchases, maintenance expenses, and other fees to compute net logistics costs.

### 7. Reports & Analytics
* **Logistics Charts**: Charts for total revenue vs. expense tracking, fuel consumption metrics, and asset usage distribution.

### 8. Super Admin Console
* **Database User Listing**: Audits name, email, role, database ID, and account status of all registered users.
* **Registration Approvals**: Real-time checking and authorization (Approve/Reject) of pending signups.
* **Live Role Modification**: Reassign any user's role (e.g. FleetManager -> dispatcher) via inline dropdown controls.
* **Account Pruning**: Permenantly delete accounts from the database, protected by self-deletion locks.

---

## 🧪 Validation Assertions (Backend Tests)

Verify that the strict validation logic passes by executing:
```powershell
node server/test_rules.js
```
The test runner asserts the following parameters:
1. **Rule 1**: Prevent registering duplicate vehicle registration numbers.
2. **Rule 2**: Filter out "Retired" and "In Shop" vehicles from active dispatches.
3. **Rule 3**: Block dispatching operators with expired licenses or "Suspended" status.
4. **Rule 4**: Prevent scheduling a driver or vehicle on secondary concurrent trips.
5. **Rule 5**: Limit cargo weight to the vehicle's maximum cargo load capacity.
6. **Rule 6**: Automatically flip driver/vehicle status to "On Trip" on dispatch start.
7. **Rule 7**: Reset statuses to "Available" on trip completion, updating odometer and recording logs.
8. **Rule 8**: Reset statuses to "Available" on trip cancellation.
9. **Rule 9**: Flip vehicle status to "In Shop" when an active maintenance log is created.
10. **Rule 10**: Restore vehicle status to "Available" when maintenance is completed.
