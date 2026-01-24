# IntelliSecure – Code Function Inventory & Database Analysis

_(Generated from the repository contents in IntelliSecure-main.zip)_

## System Architecture – Key Mechanics (“everything”) 

### Core Runtime Components

- **Frontend:** React (Create React App) with Tailwind styling and a set of custom UI components.
- **Backend:** FastAPI with async endpoints; CORS enabled; JWT auth via `Authorization: Bearer <token>`.
- **Database:** MongoDB accessed asynchronously via Motor.

### Background Processing Pipeline

1. **Scrape feeds** (`scrape_threat_feeds`) → writes to `scraped_data` and `threat_intel`.
2. **LLM analysis** (`analyze_with_llm`) → reads unprocessed `scraped_data`, calls an LLM integration, writes structured `attacks`, marks items processed.
3. **Match attacks to users** (`match_attacks_to_users`, `match_user_to_existing_attacks`) → writes to `user_attacks` and generates rules.
4. **Rule generation** (`generate_rules`, `generate_rules_for_attack`, `update_attack_rules`) → writes/updates `yara_rules` and `sigma_rules`.

### Export & Reporting

- `export_rules` streams a generated PDF containing YARA + Sigma content (ReportLab).
- `generate_weekly_report` produces a multi-section PDF report (stats, attacks, mitigations, rules, etc.).

### Observability & Safety Controls (recommended next steps)

- Add structured logs per request (request id, user id, route, latency).
- Add rate-limits on auth and scraping endpoints; protect admin routes behind strong auth & IP allowlists if applicable.
- Add input validation constraints on lists/strings to prevent oversized payloads (DoS hardening).
- Add secrets management (no hard-coded defaults), and configure CORS origins explicitly in production.


## Backend (FastAPI) – Functions & Endpoints

### Helper / Utility Functions

- **hash_password**: Password hashing/verification using bcrypt
- **verify_password**: Password hashing/verification using bcrypt
- **create_jwt_token**: JWT create/verify helper
- **verify_jwt_token**: JWT create/verify helper
- **generate_fallback_queries**: Backend helper
- **get_current_user**: Backend helper
- **verify_admin**: Backend helper
- **scrape_threat_feeds**: Threat feed scraping worker
- **analyze_with_llm**: LLM-based article→attack profiling worker
- **match_attacks_to_users**: Attack↔user tag matching routine
- **match_user_to_existing_attacks**: Attack↔user tag matching routine
- **generate_rules_for_attack**: Generate/update YARA & Sigma rules from attack profile
- **generate_rules**: Generate/update YARA & Sigma rules from attack profile
- **run_background_tasks**: Backend helper
- **startup_event**: Application lifecycle hook
- **shutdown_db_client**: Application lifecycle hook

### API Endpoints

- **GET /** → `root()` — GET / – API endpoint
- **PUT /admin/attack/{attack_id}/rules** → `update_attack_rules()` — PUT /admin/attack/{attack_id}/rules – YARA/Sigma rules retrieval/export
- **GET /admin/attacks** → `get_all_attacks()` — GET /admin/attacks – admin console API
- **GET /admin/companies** → `get_all_companies()` — GET /admin/companies – admin console API
- **POST /admin/login** → `admin_login()` — POST /admin/login – admin console API
- **DELETE /admin/resources** → `delete_resource()` — DELETE /admin/resources – admin console API
- **GET /admin/resources** → `get_resources()` — GET /admin/resources – admin console API
- **POST /admin/resources** → `add_resource()` — POST /admin/resources – admin console API
- **GET /admin/threat-hunt-iocs** → `get_threat_hunt_iocs()` — GET /admin/threat-hunt-iocs – admin console API
- **POST /admin/threat-hunt-iocs** → `add_threat_hunt_ioc()` — POST /admin/threat-hunt-iocs – admin console API
- **POST /admin/threat-hunt-iocs/bulk** → `add_bulk_threat_hunt_iocs()` — POST /admin/threat-hunt-iocs/bulk – admin console API
- **DELETE /admin/threat-hunt-iocs/{ioc_id}** → `delete_threat_hunt_ioc()` — DELETE /admin/threat-hunt-iocs/{ioc_id} – admin console API
- **POST /auth/login** → `login()` — POST /auth/login – user login (JWT issuance)
- **POST /auth/register** → `register()` — POST /auth/register – user registration (creates user + company profile)
- **GET /auth/session** → `get_session()` — GET /auth/session – session validation (JWT -> user/profile)
- **GET /dashboard/analytics** → `get_analytics()` — GET /dashboard/analytics – dashboard data aggregation
- **GET /dashboard/attacks** → `get_attacks()` — GET /dashboard/attacks – dashboard data aggregation
- **POST /dashboard/export-rules/{attack_id}** → `export_rules()` — POST /dashboard/export-rules/{attack_id} – dashboard data aggregation
- **GET /dashboard/geo-map** → `get_geo_map()` — GET /dashboard/geo-map – dashboard data aggregation
- **GET /dashboard/rules/{attack_id}** → `get_attack_rules()` — GET /dashboard/rules/{attack_id} – dashboard data aggregation
- **GET /dashboard/stats** → `get_dashboard_stats()` — GET /dashboard/stats – dashboard data aggregation
- **GET /dashboard/threat-hunt** → `get_threat_hunt_queries()` — GET /dashboard/threat-hunt – dashboard data aggregation
- **GET /dashboard/timeline** → `get_timeline()` — GET /dashboard/timeline – dashboard data aggregation
- **GET /dashboard/weekly-report** → `generate_weekly_report()` — GET /dashboard/weekly-report – dashboard data aggregation
- **GET /health** → `health_check()` — GET /health – API endpoint
- **GET /insights** → `get_insights()` — GET /insights – threat intel feed items
- **GET /profile** → `get_profile()` — GET /profile – retrieve/update company profile
- **PUT /profile** → `update_profile()` — PUT /profile – retrieve/update company profile

## Backend Test Harness (backend_test.py)

### Class `IntelliSecureAPITester`
- **__init__()**: Test/helper method
- **log_test()**: Log test result
- **run_test()**: Run a single API test
- **test_health_check()**: Test basic health endpoints
- **test_registration()**: Test user registration
- **test_login()**: Test user login
- **test_session_management()**: Test session endpoints
- **test_profile_endpoints()**: Test profile management
- **test_dashboard_endpoints()**: Test dashboard endpoints
- **test_insights_endpoint()**: Test insights endpoint
- **test_rules_endpoint()**: Test rules endpoint with dummy attack ID
- **test_invalid_endpoints()**: Test invalid endpoints and error handling
- **run_all_tests()**: Run all API tests

- **main()**: Test runner entrypoint

## Threat Matching Test Suite (backend/tests/test_threat_matching.py)

### Class `ThreatMatchingTester`
- **__init__()**: Test/helper method
- **setup_db_connection()**: Setup MongoDB connection for direct database verification
- **log_result()**: Log test result with detailed information
- **verify_database_collections()**: Step 1: Verify database collections and existing data
- **register_new_user()**: Step 2: Register new user with specific profile
- **verify_profile_creation()**: Step 3: Verify profile was created in database
- **wait_for_background_task()**: Step 4: Wait for background matching task to complete
- **analyze_matching_logic()**: Step 5: Analyze why matching might not be working
- **test_dashboard_api()**: Step 6: Test dashboard API endpoint
- **verify_background_scraping()**: Step 7: Verify background scraping is working
- **run_comprehensive_test()**: Run the complete threat matching test sequence
- **print_summary()**: Print test summary

- **main()**: Test runner entrypoint

## Frontend (React) – Function Inventory

### App bootstrap

#### `frontend/src/App.js`
- **App()**: Utility/helper function
- **ProtectedRoute()**: Utility/helper function
- **PublicRoute()**: Utility/helper function

### Context

#### `frontend/src/context/AuthContext.js`
- **AuthProvider()**: Context provider/helper
- **checkSession()**: Validation/session check helper
- **login()**: Authentication helper
- **logout()**: Authentication helper
- **register()**: Authentication helper
- **useAuth()**: Custom hook

### Pages

#### `frontend/src/pages/AdminDashboard.js`
- **AdminDashboard()**: React component for AdminDashboard UI
- **addIOC()**: Utility/helper function
- **addTTP()**: Utility/helper function
- **handleAddResource()**: UI event handler
- **handleAddThreatHuntIOC()**: UI event handler
- **handleDeleteResource()**: UI event handler
- **handleDeleteThreatHuntIOC()**: UI event handler
- **handleLogout()**: UI event handler
- **handleUpdateRules()**: UI event handler
- **loadAdminData()**: Utility/helper function
- **removeIOC()**: Utility/helper function
- **removeTTP()**: Utility/helper function
- **updateIOC()**: Utility/helper function
- **updateTTP()**: Utility/helper function
- **validIOCs()**: Utility/helper function
- **validTTPs()**: Utility/helper function

#### `frontend/src/pages/AdminLogin.js`
- **AdminLogin()**: React component for AdminLogin UI
- **handleSubmit()**: UI event handler

#### `frontend/src/pages/Dashboard.js`
- **Dashboard()**: React component for Dashboard UI
- **filteredAttacks()**: Utility/helper function
- **handleAttackClick()**: UI event handler
- **handleCopyQuery()**: UI event handler
- **handleDownloadWeeklyReport()**: UI event handler
- **handleExportRules()**: UI event handler
- **handleLogout()**: UI event handler
- **loadAttackRules()**: Utility/helper function
- **loadDashboardData()**: Utility/helper function

#### `frontend/src/pages/Login.js`
- **Login()**: React component for Login UI
- **handleSubmit()**: UI event handler

#### `frontend/src/pages/Register.js`
- **Register()**: React component for Register UI
- **handleSubmit()**: UI event handler
- **toggleArrayItem()**: Utility/helper function

#### `frontend/src/pages/Welcome.js`
- **Welcome()**: React component for Welcome UI
- **handleScroll()**: UI event handler

### Components

#### `frontend/src/components/InteractiveThreatDemo.js`
- **InteractiveThreatDemo()**: React component for InteractiveThreatDemo UI
- **interval()**: UI/helper function in component
- **resetScan()**: UI/helper function in component
- **startScan()**: UI/helper function in component

#### `frontend/src/components/NettedGlobe.js`
- **NettedGlobe()**: React component for NettedGlobe UI
- **getPointLabel()**: UI/helper function in component

#### `frontend/src/components/ThreatMap.js`
- **ThreatMap()**: React component for ThreatMap UI
- **getMarkerSize()**: UI/helper function in component
- **getSeverityColor()**: UI/helper function in component
- **handleMarkerEnter()**: UI event handler
- **handleMarkerLeave()**: UI event handler

#### `frontend/src/components/ui/accordion.jsx`
- **AccordionContent()**: React component
- **AccordionItem()**: React component
- **AccordionTrigger()**: React component

#### `frontend/src/components/ui/alert-dialog.jsx`
- **AlertDialogAction()**: React component
- **AlertDialogCancel()**: React component
- **AlertDialogContent()**: React component
- **AlertDialogDescription()**: React component
- **AlertDialogOverlay()**: React component
- **AlertDialogTitle()**: React component

#### `frontend/src/components/ui/alert.jsx`
- **Alert()**: React component
- **AlertDescription()**: React component
- **AlertTitle()**: React component

#### `frontend/src/components/ui/avatar.jsx`
- **Avatar()**: React component
- **AvatarFallback()**: React component
- **AvatarImage()**: React component

#### `frontend/src/components/ui/badge.jsx`
- **Badge()**: React component

#### `frontend/src/components/ui/breadcrumb.jsx`
- **BreadcrumbItem()**: React component
- **BreadcrumbLink()**: React component
- **BreadcrumbList()**: React component
- **BreadcrumbPage()**: React component

#### `frontend/src/components/ui/calendar.jsx`
- **Calendar()**: React component

#### `frontend/src/components/ui/card.jsx`
- **Card()**: React component
- **CardContent()**: React component
- **CardDescription()**: React component
- **CardFooter()**: React component
- **CardHeader()**: React component
- **CardTitle()**: React component

#### `frontend/src/components/ui/carousel.jsx`
- **CarouselContent()**: React component
- **CarouselItem()**: React component
- **handleKeyDown()**: UI event handler
- **onSelect()**: UI event handler
- **scrollNext()**: UI/helper function in component
- **scrollPrev()**: UI/helper function in component
- **useCarousel()**: Custom hook

#### `frontend/src/components/ui/checkbox.jsx`
- **Checkbox()**: React component

#### `frontend/src/components/ui/command.jsx`
- **Command()**: React component
- **CommandEmpty()**: React component
- **CommandGroup()**: React component
- **CommandInput()**: React component
- **CommandItem()**: React component
- **CommandList()**: React component
- **CommandSeparator()**: React component

#### `frontend/src/components/ui/context-menu.jsx`
- **ContextMenuCheckboxItem()**: React component
- **ContextMenuContent()**: React component
- **ContextMenuItem()**: React component
- **ContextMenuLabel()**: React component
- **ContextMenuRadioItem()**: React component
- **ContextMenuSeparator()**: React component
- **ContextMenuSubContent()**: React component
- **ContextMenuSubTrigger()**: React component

#### `frontend/src/components/ui/dialog.jsx`
- **DialogContent()**: React component
- **DialogDescription()**: React component
- **DialogOverlay()**: React component
- **DialogTitle()**: React component

#### `frontend/src/components/ui/drawer.jsx`
- **DrawerContent()**: React component
- **DrawerDescription()**: React component
- **DrawerOverlay()**: React component
- **DrawerTitle()**: React component

#### `frontend/src/components/ui/dropdown-menu.jsx`
- **DropdownMenuCheckboxItem()**: React component
- **DropdownMenuItem()**: React component
- **DropdownMenuLabel()**: React component
- **DropdownMenuRadioItem()**: React component
- **DropdownMenuSeparator()**: React component
- **DropdownMenuSubContent()**: React component
- **DropdownMenuSubTrigger()**: React component

#### `frontend/src/components/ui/form.jsx`
- **FormControl()**: React component
- **FormDescription()**: React component
- **FormItem()**: React component
- **FormLabel()**: React component
- **FormMessage()**: React component
- **useFormField()**: Custom hook

#### `frontend/src/components/ui/input-otp.jsx`
- **InputOTP()**: React component
- **InputOTPGroup()**: React component
- **InputOTPSeparator()**: React component
- **InputOTPSlot()**: React component

#### `frontend/src/components/ui/input.jsx`
- **Input()**: React component

#### `frontend/src/components/ui/label.jsx`
- **Label()**: React component

#### `frontend/src/components/ui/menubar.jsx`
- **Menubar()**: React component
- **MenubarCheckboxItem()**: React component
- **MenubarGroup()**: React component
- **MenubarItem()**: React component
- **MenubarLabel()**: React component
- **MenubarMenu()**: React component
- **MenubarPortal()**: React component
- **MenubarRadioGroup()**: React component
- **MenubarRadioItem()**: React component
- **MenubarSeparator()**: React component
- **MenubarSub()**: React component
- **MenubarSubContent()**: React component
- **MenubarSubTrigger()**: React component
- **MenubarTrigger()**: React component

#### `frontend/src/components/ui/navigation-menu.jsx`
- **NavigationMenu()**: React component
- **NavigationMenuContent()**: React component
- **NavigationMenuIndicator()**: React component
- **NavigationMenuList()**: React component
- **NavigationMenuTrigger()**: React component
- **NavigationMenuViewport()**: React component

#### `frontend/src/components/ui/pagination.jsx`
- **PaginationContent()**: React component
- **PaginationItem()**: React component

#### `frontend/src/components/ui/progress.jsx`
- **Progress()**: React component

#### `frontend/src/components/ui/radio-group.jsx`
- **RadioGroup()**: React component
- **RadioGroupItem()**: React component

#### `frontend/src/components/ui/scroll-area.jsx`
- **ScrollArea()**: React component

#### `frontend/src/components/ui/select.jsx`
- **SelectItem()**: React component
- **SelectLabel()**: React component
- **SelectScrollDownButton()**: React component
- **SelectScrollUpButton()**: React component
- **SelectSeparator()**: React component
- **SelectTrigger()**: React component

#### `frontend/src/components/ui/sheet.jsx`
- **SheetDescription()**: React component
- **SheetOverlay()**: React component
- **SheetTitle()**: React component

#### `frontend/src/components/ui/skeleton.jsx`
- **Skeleton()**: React component

#### `frontend/src/components/ui/slider.jsx`
- **Slider()**: React component

#### `frontend/src/components/ui/switch.jsx`
- **Switch()**: React component

#### `frontend/src/components/ui/table.jsx`
- **Table()**: React component
- **TableBody()**: React component
- **TableCaption()**: React component
- **TableCell()**: React component
- **TableFooter()**: React component
- **TableHead()**: React component
- **TableHeader()**: React component
- **TableRow()**: React component

#### `frontend/src/components/ui/tabs.jsx`
- **TabsContent()**: React component
- **TabsList()**: React component
- **TabsTrigger()**: React component

#### `frontend/src/components/ui/textarea.jsx`
- **Textarea()**: React component

#### `frontend/src/components/ui/toast.jsx`
- **Toast()**: React component
- **ToastAction()**: React component
- **ToastClose()**: React component
- **ToastDescription()**: React component
- **ToastTitle()**: React component
- **ToastViewport()**: React component

#### `frontend/src/components/ui/toaster.jsx`
- **Toaster()**: React component

#### `frontend/src/components/ui/toggle-group.jsx`
- **ToggleGroup()**: React component
- **ToggleGroupItem()**: React component

#### `frontend/src/components/ui/toggle.jsx`
- **Toggle()**: React component

### Frontend misc

#### `frontend/src/hooks/use-toast.js`
- **addToRemoveQueue()**: Utility/helper function
- **dismiss()**: Utility/helper function
- **dispatch()**: Utility/helper function
- **genId()**: Utility/helper function
- **reducer()**: Utility/helper function
- **timeout()**: Utility/helper function
- **toast()**: Utility/helper function
- **update()**: Utility/helper function
- **useToast()**: Custom hook

#### `frontend/src/lib/utils.js`
- **cn()**: Utility/helper function

### Tooling/plugins

#### `frontend/plugins/health-check/health-endpoints.js`
- **formatBytes()**: Formatting/utility helper
- **formatDuration()**: Formatting/utility helper
- **setupHealthEndpoints()**: Initialization/setup helper

#### `frontend/plugins/visual-edits/babel-metadata-plugin.js`
- **alreadyHasXMeta()**: Plugin utility
- **babelMetadataPlugin()**: Plugin utility
- **componentBindingIsDynamic()**: Plugin utility
- **evaluatePath()**: Plugin utility
- **fileExportHasPortals()**: Plugin utility
- **fileExportIsDynamic()**: Plugin utility
- **getName()**: Plugin utility
- **hasAnyExpression()**: Plugin utility
- **hasProp()**: Plugin utility
- **insertMetaAttributes()**: Plugin utility
- **isDirectChildOfAsChildOrTrigger()**: Plugin utility
- **isJSXDynamic()**: Plugin utility
- **isPortalPrimitive()**: Plugin utility
- **isPortalishName()**: Plugin utility
- **jsxNameOf()**: Plugin utility
- **parentIsCompositePortal()**: Plugin utility
- **parentJSXElement()**: Plugin utility
- **parseFileAst()**: Plugin utility
- **pathHasDynamicJSX()**: Plugin utility
- **pathIsDynamicComponent()**: Plugin utility
- **resolveImportPath()**: Plugin utility
- **spreadIndex()**: Plugin utility
- **subtreeHasPortals()**: Plugin utility
- **usageIsCompositePortal()**: Plugin utility

#### `frontend/plugins/visual-edits/dev-server-setup.js`
- **findFileRecursive()**: Plugin utility
- **getCodeServerPassword()**: Plugin utility
- **getRelativePath()**: Plugin utility
- **isAllowedOrigin()**: Plugin utility
- **parseJsxChildren()**: Plugin utility
- **preserveWhitespace()**: Plugin utility
- **sanitizeMetaAttributes()**: Plugin utility
- **setupDevServer()**: Initialization/setup helper


## Database Design – Detailed Analysis (MongoDB)

### Connection & Configuration

- Backend uses **Motor (AsyncIOMotorClient)** to connect to MongoDB.
- Connection string is read from env var **`MONGO_URL`**; database name from **`DB_NAME`** (selected as `db = client[DB_NAME]`).
- Auth uses **JWT** via env vars: `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRATION_HOURS`.

### Collections & Schemas (inferred from insert/update paths)

#### `users`
- **Purpose:** Authentication identity store (email + password hash).
- **Key fields:** `id`, `email`, `password_hash`, `created_at`
- **Document shape:**
```json
{
  "id": "string (uuid)",
  "email": "string",
  "password_hash": "string",
  "created_at": "string (ISO8601)"
}
```
- **Access patterns observed:** find_one by email (login/register); insert_one on register

#### `profiles`
- **Purpose:** Company profile + tags used for threat matching and personalization.
- **Key fields:** `id`, `user_id`, `company_name`, `company_size`, `num_employees`, `industry`, `region`, `applied_policies`, `restrictions`, `security_solutions`, `tags`, `created_at`
- **Document shape:**
```json
{
  "id": "string (uuid)",
  "user_id": "string (uuid)",
  "company_name": "string",
  "company_size": "string",
  "num_employees": "int",
  "industry": "string",
  "region": "string",
  "applied_policies": "array[string]",
  "restrictions": "array[string]",
  "security_solutions": "array[string]",
  "tags": "object",
  "created_at": "string (ISO8601)"
}
```
- **Access patterns observed:** find_one by user_id (session/profile); update_one by user_id (profile updates); find list for admin companies

#### `scraped_data`
- **Purpose:** Queue-like storage for scraped items awaiting LLM processing.
- **Key fields:** `id`, `title`, `url`, `summary`, `source`, `published_at`, `processed`
- **Document shape:**
```json
{
  "id": "string (uuid)",
  "title": "string",
  "url": "string",
  "summary": "string",
  "source": "string",
  "published_at": "string (ISO8601)",
  "processed": "bool"
}
```
- **Access patterns observed:** insert_one (ingestion); find processed=False limit 2 (worker); update_one processed flag

#### `threat_intel`
- **Purpose:** Normalized feed items for UI insights (lighter than scraped_data).
- **Key fields:** `id`, `title`, `summary`, `url`, `published_at`, `source`
- **Document shape:**
```json
{
  "id": "string (uuid)",
  "title": "string",
  "summary": "string",
  "url": "string",
  "published_at": "string (ISO8601)",
  "source": "string"
}
```
- **Access patterns observed:** insert_one during scrape; find for insights endpoint

#### `attacks`
- **Purpose:** LLM-produced structured attack profiles (the core knowledge base).
- **Key fields:** `id`, `name`, `description`, `iocs`, `ttps`, `mitre_tactics`, `threat_actor`, `tags`, `source_url`, `severity`, `mitigations`, `discovered_at`
- **Document shape:**
```json
{
  "id": "string (uuid)",
  "name": "string",
  "description": "string",
  "iocs": "array[string]",
  "ttps": "array[string]",
  "mitre_tactics": "array[string]",
  "threat_actor": "string|null",
  "tags": "object",
  "source_url": "string",
  "severity": "string",
  "mitigations": "array[string]",
  "discovered_at": "string (ISO8601)"
}
```
- **Access patterns observed:** insert_one post-LLM; find/list for admin attacks; find_one by id for rules endpoint

#### `user_attacks`
- **Purpose:** Materialized join table linking users to relevant attacks (per matching logic).
- **Key fields:** `id`, `user_id`, `attack_id`, `name`, `description`, `severity`, `source_url`, `threat_actor`, `discovered_at`, `linked_at`
- **Document shape:**
```json
{
  "id": "string (uuid)",
  "user_id": "string (uuid)",
  "attack_id": "string (uuid)",
  "name": "string",
  "description": "string",
  "severity": "string",
  "source_url": "string",
  "threat_actor": "string|null",
  "discovered_at": "string (ISO8601)",
  "linked_at": "string (ISO8601)"
}
```
- **Access patterns observed:** find by user_id (dashboard lists); find_one to avoid duplicates; insert_one during matching

#### `yara_rules`
- **Purpose:** Generated YARA rules per attack.
- **Key fields:** `id`, `attack_id`, `rule_name`, `rule_content`, `updated_at`
- **Document shape:**
```json
{
  "id": "string (uuid)",
  "attack_id": "string (uuid)",
  "rule_name": "string",
  "rule_content": "string",
  "updated_at": "string (ISO8601, optional)"
}
```
- **Access patterns observed:** find by attack_id (dashboard rules); insert_one (initial); update_many by attack_id (regeneration)

#### `sigma_rules`
- **Purpose:** Generated Sigma rules per attack.
- **Key fields:** `id`, `attack_id`, `rule_name`, `rule_content`, `updated_at`
- **Document shape:**
```json
{
  "id": "string (uuid)",
  "attack_id": "string (uuid)",
  "rule_name": "string",
  "rule_content": "string",
  "updated_at": "string (ISO8601, optional)"
}
```
- **Access patterns observed:** find by attack_id; insert_one; update_many by attack_id

#### `threat_hunt_iocs`
- **Purpose:** Admin-managed IOC catalog for threat hunting queries and demo content.
- **Key fields:** `id`, `type`, `value`, `description`, `source`, `added_by`, `created_at`
- **Document shape:**
```json
{
  "id": "string (uuid)",
  "type": "string",
  "value": "string",
  "description": "string",
  "source": "string",
  "added_by": "string",
  "created_at": "string (ISO8601)"
}
```
- **Access patterns observed:** find list; insert_one; delete_one by id; bulk insert

### Relationships & Data Flow

- `users (1) → profiles (1)` via `profiles.user_id`.
- `attacks (*) ↔ users (*)` is implemented via **`user_attacks`** (materialized many-to-many link table).
- `yara_rules` and `sigma_rules` are `(*) → attacks (1)` via `attack_id`.
- `scraped_data` and `threat_intel` are write-heavy ingestion stores; `scraped_data.processed` acts like a work-queue flag.

### Matching Logic (how data becomes ‘personalized’)

- User matching uses `profiles.tags` (industry, region, sec_solutions) and compares them against `attacks.tags` (industries, regions, sec_solutions).
- When a match occurs, the system writes a denormalized record into `user_attacks` and generates corresponding rules in `yara_rules` / `sigma_rules`.

### Recommended Indexes (practical performance hardening)

- `users`: unique index on `{ email: 1 }` (enforces uniqueness + accelerates login).
- `profiles`: index on `{ user_id: 1 }` (session/profile lookups).
- `user_attacks`: compound index on `{ user_id: 1, attack_id: 1 }` with **unique** constraint (prevents duplicates efficiently).
- `attacks`: index on `{ source_url: 1 }` (helps dedupe by URL); optional text index for `{ name, description }` if search is added.
- `yara_rules` / `sigma_rules`: index on `{ attack_id: 1 }` (rules fetch).
- `scraped_data`: index on `{ processed: 1, published_at: -1 }` (worker pulls unprocessed quickly; supports cleanup).
- `threat_intel`: index on `{ published_at: -1 }` (latest insights).

### Data Quality, Consistency & Security Notes

- **ID strategy:** app generates UUID strings (not Mongo ObjectIds) for cross-collection joins; ensure all queries filter out `_id` or consistently project it out (the code already often uses `{ '_id': 0 }`).
- **Password storage:** uses bcrypt hashes (good); do not store plaintext passwords anywhere.
- **JWT:** verify secret strength; rotate secrets; consider token revocation list if required.
- **Admin creds:** `ADMIN_PASSWORD` has a default value in code—remove defaults in production and require env injection.
- **Queue semantics:** `scraped_data.processed` is a simple work flag; with multiple workers, add a `locked_at/locked_by` lease to avoid double-processing.

### Retention & Cleanup (recommended)

- Add a TTL index for `scraped_data` on `published_at` or `processed_at` to prevent unbounded growth (e.g., keep 30–90 days).
- Optionally TTL `threat_intel` after N days if only ‘recent’ insights are required; keep `attacks` long-term for historical analytics.
