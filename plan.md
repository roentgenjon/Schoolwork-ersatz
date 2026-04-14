# SchoolWork Clone – Projektplan für Claude Code

## Projektziel
Eine vollständige, iPad-optimierte Web-App als SchoolWork-Ersatz, die 1:1 die Funktionen
von Apple SchoolWork nachbildet, ergänzt um:
- Onboarding/Registrierungsflow (Welcome Screen → Rolle → Name)
- Echtzeit-Chat zwischen allen Nutzern
- Cloudflare als vollständiges Backend (Workers + D1 + KV + Durable Objects)

---

## Tech-Stack

| Schicht | Technologie | Zweck |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | iPad-Web-App (PWA) |
| Styling | Tailwind CSS + shadcn/ui | iOS-ähnliches Design |
| Routing | React Router v6 | SPA-Navigation |
| State | Zustand | Globaler App-State |
| Backend | Cloudflare Workers | API-Endpunkte |
| Datenbank | Cloudflare D1 (SQLite) | Persistente Daten |
| Sessions | Cloudflare KV | Auth-Tokens, Nutzersessions |
| Echtzeit-Chat | Cloudflare Durable Objects + WebSocket | Live-Chat |
| Deployment | Cloudflare Pages | Frontend-Hosting |

---

## Projektstruktur

```
schoolwork-clone/
├── frontend/                    # React PWA
│   ├── src/
│   │   ├── components/
│   │   │   ├── onboarding/      # Welcome, RoleSelect, NameInput
│   │   │   ├── layout/          # Sidebar, TabBar, Header
│   │   │   ├── classes/         # Klassen-Ansichten
│   │   │   ├── assignments/     # Aufgaben-Komponenten
│   │   │   ├── progress/        # Fortschritts-Tracking
│   │   │   ├── handouts/        # Handout-Verwaltung
│   │   │   ├── students/        # Schülerverwaltung
│   │   │   └── chat/            # Chat-Interface
│   │   ├── pages/
│   │   │   ├── OnboardingPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ClassesPage.tsx
│   │   │   ├── AssignmentsPage.tsx
│   │   │   ├── ProgressPage.tsx
│   │   │   ├── HandoutsPage.tsx
│   │   │   └── ChatPage.tsx
│   │   ├── store/               # Zustand-Stores
│   │   ├── hooks/               # Custom Hooks
│   │   ├── api/                 # API-Client (fetch-Wrapper)
│   │   └── types/               # TypeScript-Typen
│   ├── public/
│   │   └── manifest.json        # PWA-Manifest
│   └── vite.config.ts
│
└── backend/                     # Cloudflare Workers
    ├── src/
    │   ├── index.ts             # Worker Entry Point + Router
    │   ├── routes/
    │   │   ├── auth.ts          # POST /api/auth/register, /login
    │   │   ├── classes.ts       # CRUD Klassen
    │   │   ├── assignments.ts   # CRUD Aufgaben
    │   │   ├── handouts.ts      # CRUD Handouts
    │   │   ├── progress.ts      # Fortschritt-Endpunkte
    │   │   ├── students.ts      # Schülerverwaltung
    │   │   └── chat.ts          # WebSocket-Endpunkt → Durable Object
    │   ├── durable/
    │   │   └── ChatRoom.ts      # Durable Object für Echtzeit-Chat
    │   ├── middleware/
    │   │   └── auth.ts          # Token-Validierung via KV
    │   └── db/
    │       ├── schema.sql       # D1 Schema
    │       └── queries.ts       # SQL-Hilfsfunktionen
    └── wrangler.toml            # Cloudflare-Konfiguration
```

---

## Datenbankschema (D1 – SQLite)

```sql
-- Nutzer
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
  created_at INTEGER DEFAULT (unixepoch())
);

-- Klassen
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id TEXT REFERENCES users(id),
  subject TEXT,
  color TEXT,
  icon TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Klassen-Mitglieder (Schüler)
CREATE TABLE class_members (
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, student_id)
);

-- Aufgaben
CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('quiz', 'handout', 'activity', 'book_report', 'collaboration')),
  due_date INTEGER,
  points INTEGER DEFAULT 100,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER DEFAULT (unixepoch())
);

-- Aufgaben-Einreichungen
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('not_started', 'in_progress', 'turned_in', 'returned', 'graded')),
  score INTEGER,
  feedback TEXT,
  submitted_at INTEGER,
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Handouts (Materialien)
CREATE TABLE handouts (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER DEFAULT (unixepoch())
);

-- Chat-Nachrichten
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,       -- z.B. 'global', 'class_<id>', 'dm_<user1>_<user2>'
  sender_id TEXT REFERENCES users(id),
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Chat-Räume
CREATE TABLE chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL CHECK(type IN ('global', 'class', 'dm')),
  class_id TEXT REFERENCES classes(id)
);
```

---

## Cloudflare-Konfiguration (`wrangler.toml`)

```toml
name = "schoolwork-backend"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "schoolwork-db"
database_id = "<WIRD VON WRANGLER GENERIERT>"

[[kv_namespaces]]
binding = "SESSIONS"
id = "<WIRD VON WRANGLER GENERIERT>"

[durable_objects]
bindings = [
  { name = "CHAT_ROOM", class_name = "ChatRoom" }
]

[[migrations]]
tag = "v1"
new_classes = ["ChatRoom"]

[vars]
FRONTEND_URL = "https://schoolwork.pages.dev"
```

---

## Onboarding-Flow (Schritt für Schritt)

### Screen 1 – Welcome
- Vollbild, dunkelblauer Gradient (iOS-Stil)
- SchoolWork-Logo (nachgebaut als SVG)
- Titel: „SchoolWork"
- Untertitel: „Deine Schule. Digital."
- Button: „Get Started" → Screen 2

### Screen 2 – Rollenwahl
- Drei große Karten mit Icons:
  - 🏫 **Admin** – Schule verwalten
  - 👩‍🏫 **Lehrer** – Klassen & Aufgaben
  - 🎒 **Schüler** – Lernen & Einreichen
- Tap auf Karte → Auswahl markiert → „Weiter"-Button erscheint

### Screen 3 – Name eingeben
- Großes Textfeld „Dein Name"
- Vorname / Nachname (zwei Felder)
- Button: „Einloggen" → POST /api/auth/register → Token in localStorage

### Nach Registrierung
- Token + User-Objekt in KV gespeichert
- Redirect auf Dashboard (je nach Rolle unterschiedlich)

---

## App-Ansichten nach Rolle

### Admin-Dashboard
- Übersicht: Nutzeranzahl, Klassen, Aufgaben
- **Nutzerverwaltung**: Alle Lehrer & Schüler sehen/löschen
- **Klassenverwaltung**: Alle Klassen einsehen, löschen
- **Schuleinstellungen**: Name, Logo

### Lehrer-Dashboard (= Original SchoolWork)
**Navigation (Tab Bar):**
1. **Klassen** – Klassenübersicht, neue Klasse erstellen
2. **Aufgaben** – Aufgaben erstellen, verwalten, bewerten
3. **Fortschritt** – Schülerfortschritt je Klasse/Aufgabe
4. **Handouts** – Materialien verteilen
5. **Chat** – Nachrichten

**Klassen-Detail-Ansicht:**
- Schüler-Roster (Liste aller Schüler)
- Schüler hinzufügen/entfernen
- Klassen-Feed

**Aufgaben-Erstellung:**
- Typen: Quiz, Handout, Aktivität, Buchbericht, Kollaboration
- Zuweisung an Klasse(n)
- Fälligkeitsdatum, Punkte
- Schüler-Statusübersicht (Wer hat eingereicht?)

**Fortschritt:**
- Pro Schüler: Abgaben, Noten, Aktivität
- Diagramme (Balken/Kreis-Charts)
- Exportmöglichkeit

### Schüler-Dashboard
**Navigation:**
1. **Klassen** – Meine Klassen
2. **Aufgaben** – To-Do, In Bearbeitung, Erledigt
3. **Noten** – Bewertungen & Feedback
4. **Handouts** – Erhaltene Materialien
5. **Chat** – Nachrichten

**Aufgabe-Detail:**
- Aufgabenbeschreibung lesen
- „Abgeben"-Button → Status → „turned_in"
- Nach Bewertung: Note + Feedback sehen

---

## Chat-System (Echtzeit)

### Räume
- **Global** – Alle Nutzer der Schule
- **Klassen-Chat** – Je Klasse ein Raum (Lehrer + Schüler)
- **Direktnachrichten** – 1:1 zwischen beliebigen Nutzern

### Technische Umsetzung
1. Frontend öffnet WebSocket: `wss://api.../chat/<room_id>?token=...`
2. Worker leitet Verbindung an **Durable Object** `ChatRoom` weiter
3. Durable Object hält alle aktiven Verbindungen, broadcasted Nachrichten
4. Nachrichten werden in D1 `chat_messages` persistiert
5. Beim Öffnen eines Raums: letzte 50 Nachrichten aus D1 laden

### Chat-UI (iPad-optimiert)
- Nachrichten-Blasen (links = andere, rechts = ich)
- Absender-Avatar (Initialen-Kreis mit Rolle-Farbe)
- Zeitstempel
- Raum-Sidebar: Liste aller Räume mit Unread-Badge
- Nachricht tippen → Enter/Senden-Button

---

## API-Endpunkte (Backend)

```
POST   /api/auth/register       { name, role } → { token, user }
GET    /api/auth/me              → { user }

GET    /api/classes              → [ ...classes ]
POST   /api/classes              { name, subject, color, icon }
GET    /api/classes/:id          → { class, students, assignments }
PUT    /api/classes/:id
DELETE /api/classes/:id
POST   /api/classes/:id/students { student_id }
DELETE /api/classes/:id/students/:student_id

GET    /api/assignments          → [ ...assignments ] (gefiltert nach Rolle)
POST   /api/assignments          { class_id, title, type, due_date, ... }
GET    /api/assignments/:id      → { assignment, submissions }
PUT    /api/assignments/:id
DELETE /api/assignments/:id

GET    /api/assignments/:id/submissions
PUT    /api/submissions/:id      { status, score, feedback }

GET    /api/handouts             → [ ...handouts ]
POST   /api/handouts             { class_id, title, file_url, ... }
DELETE /api/handouts/:id

GET    /api/progress/:class_id   → [ { student, submissions, score } ]

GET    /api/users                → [ ...users ] (nur Admin)
DELETE /api/users/:id            (nur Admin)

GET    /api/chat/rooms           → [ ...rooms ]
GET    /api/chat/rooms/:id/messages → [ ...messages ] (letzte 50)
WS     /api/chat/ws/:room_id     WebSocket-Verbindung
```

---

## iPad-Design-Richtlinien

- **Farben**: Blau `#007AFF` (iOS-Blau) als Primärfarbe, iOS-Grautöne
- **Typografie**: SF Pro (System-Font) via `-apple-system`
- **Layout**: Split-View-fähig (Sidebar links, Content rechts) ab 768px
- **Animationen**: `transition-all duration-200 ease-in-out` für alle Übergänge
- **Touch-Targets**: Mindest-Tappgröße 44×44px
- **Modals**: iOS-Style Bottom-Sheets und Center-Modals
- **Icons**: Lucide React (SF Symbols-ähnlich)
- **Listen**: iOS-Tabellenansicht-Stil mit Trennlinien und Disclosure-Indikatoren

---

## Implementierungs-Reihenfolge für Claude Code

### Phase 1 – Backend & Datenbank
1. `wrangler.toml` konfigurieren
2. D1-Datenbank erstellen: `wrangler d1 create schoolwork-db`
3. KV-Namespace erstellen: `wrangler kv:namespace create SESSIONS`
4. Schema deployen: `wrangler d1 execute schoolwork-db --file=schema.sql`
5. Auth-Routes implementieren (`/api/auth/*`)
6. Klassen-Routes implementieren
7. Aufgaben-Routes implementieren
8. Handout-Routes implementieren
9. Fortschritt-Routes implementieren
10. Chat-Durable-Object implementieren
11. WebSocket-Route implementieren

### Phase 2 – Frontend Grundgerüst
1. Vite + React + TypeScript + Tailwind initialisieren
2. PWA-Manifest + Service Worker
3. Router + Layout-Komponenten (Sidebar, TabBar)
4. API-Client (fetch-Wrapper mit Token-Handling)
5. Zustand-Stores (auth, classes, assignments, chat)

### Phase 3 – Onboarding
1. WelcomeScreen (Vollbild, Animation, „Get Started")
2. RoleSelectScreen (3 Karten mit Icons)
3. NameInputScreen (Formular + API-Call)
4. Token-Persistierung + Auto-Login-Check

### Phase 4 – Hauptfunktionen
1. Dashboard (rollenbasiert)
2. Klassen-Übersicht + Detail + Schülerverwaltung
3. Aufgaben (Erstellen, Bearbeiten, Einreichen, Bewerten)
4. Fortschritts-Ansicht (Charts mit recharts)
5. Handout-Verwaltung
6. Admin-Panel

### Phase 5 – Chat
1. Chat-UI (Nachrichten-Blasen, Eingabefeld)
2. Raum-Sidebar
3. WebSocket-Verbindung aufbauen
4. Nachrichten-Persistierung + History laden
5. DM-Funktion

### Phase 6 – Polish
1. Ladeanimationen + Skeleton-Screens
2. Error-Handling + Toast-Notifications
3. Offline-Indikator (PWA)
4. iPad Split-View optimieren
5. Dark Mode (iOS-kompatibel)

---

## Wichtige Befehle für Claude Code

```bash
# Backend
cd backend
npm install
wrangler d1 create schoolwork-db
wrangler kv:namespace create SESSIONS
wrangler d1 execute schoolwork-db --file=src/db/schema.sql
wrangler dev                    # Lokal testen
wrangler deploy                 # Zu Cloudflare deployen

# Frontend
cd frontend
npm install
npm run dev                     # Lokal testen
npm run build
wrangler pages deploy dist      # Zu Cloudflare Pages deployen
```

---

## Umgebungsvariablen / Secrets

```bash
# Diese Wrangler-Secrets müssen gesetzt werden:
wrangler secret put JWT_SECRET   # Zufälliger langer String für Token-Signierung
```

---

## Sicherheitshinweise

- Alle API-Endpunkte (außer `/api/auth/*`) prüfen den Bearer-Token via KV
- Lehrer können nur ihre eigenen Klassen/Aufgaben bearbeiten
- Schüler sehen nur Klassen, in denen sie Mitglied sind
- Admin kann alles lesen/löschen
- Chat-Nachrichten: Jeder sieht globalen Chat; Klassen-Chat nur Mitglieder

---

## Geschätzte Dateianzahl

| Bereich | Dateien |
|---|---|
| Backend (Workers) | ~20 |
| Frontend (Komponenten) | ~40 |
| Typen + Stores + Hooks | ~15 |
| Config-Dateien | ~8 |
| **Gesamt** | **~83 Dateien** |
