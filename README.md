# Slate — Appointment Board

A full-stack appointment board for small teams. Built with React (Vite) on the frontend and FastAPI (Python) on the backend.

---

## What it does

- **View** appointments grouped by date, sorted chronologically by time.
- **Add** new appointments with title, description, date, and time range.
- **Edit** any appointment (scheduled, completed, or cancelled).
- **Complete** a scheduled appointment to mark it as done.
- **Cancel** an appointment — it stays visible, clearly marked, and can be restored.
- **Filter** by status (All / Scheduled / Completed / Cancelled) with dynamically measured sliding indicator pills, and by date.
- **Overlap prevention** — strict server-side validation and proactive client-side conflict checking reject conflicting active appointments on the same day.

---

## 🌟 Key Innovations

1. **Apple-Grade Day Schedule Track**
   - An 8:00 AM – 6:00 PM interactive calendar day track embedded directly above the appointment list.
   - **Integrated Day Navigator**: Jump between days with `‹` and `›` stepper controls and a instant `"Jump to Today"` shortcut.
   - **Rich Event Cards**: Renders events as Apple Calendar cards with status-colored accent lines, clear typography, and hover elevation.
   - **One-Click Available Slots**: Dotted `+ Available` cards make open windows obvious and clickable, auto-prefilling the booking form.

2. **Siri-Style Voice Dictation Quick Add**
   - Uses native browser **Web Speech API** (`window.SpeechRecognition`) — zero third-party packages, zero external API keys.
   - Displays a glowing Siri microphone button and soundwave listening animation.
   - Speak naturally (e.g. *"Client demo tomorrow from 3pm to 4:30pm"*). The speech transcribes in real-time and streams into the natural language parser.

3. **Spotlight-Style Command Bar (`⌘K` / `Ctrl+K`)**
   - Natural language quick-add palette inspired by Linear and Raycast.
   - Client-side parser ([`nlp.js`](frontend/src/lib/nlp.js)) extracts Title, Date, and Time range with live conflict checking.
   - Pressing `Enter` books the appointment immediately.

4. **Smart Collision Resolution ("Suggest Next Available Slot")**
   - When entering a conflicting time, the system dynamically calculates the nearest open opening of the same duration between 8 AM and 6 PM.
   - Offers a 1-click **"Apply Suggestion ✨"** button that auto-adjusts the time inputs.

5. **Synthetic Web Audio Tactile Feedback**
   - Apple Watch-style subtle tactile clicks on tab switches and harmonic completion chimes on finishing an appointment.
   - Generated natively via the Web Audio API with an audio toggle in the top bar.

---

## Tech stack

| Layer    | Tech                | Notes                                              |
|----------|---------------------|----------------------------------------------------|
| Frontend | React 19, Vite      | Component-based, no TypeScript                     |
| Backend  | FastAPI, SQLModel    | Python 3.10+, SQLite                               |
| Styling  | Vanilla CSS         | Apple HIG-inspired design tokens                   |
| Testing  | Pytest, HTTPX       | Automated suite for collision rules & API CRUD     |
| Audio    | Web Audio API       | Zero-asset synthetic tactile ticks and chimes      |
| Voice    | Web Speech API      | Native browser speech-to-text dictation            |
| Animation| GSAP + @gsap/react  | Spring entrances, stagger reveals                  |
| WebGL    | Raw shaders         | Hand-written mesh gradient on the auth page        |

---

## How to run

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS / Linux

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API starts at `http://localhost:8000`. Interactive docs at `/docs`.

To run the automated backend test suite:
```bash
pytest -v
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. The frontend connects to `localhost:8000` by default.

---

## Project structure

```
├── backend/
│   ├── main.py             # FastAPI app — routes, CORS, overlap detection
│   ├── models.py           # SQLModel table + Pydantic request schemas
│   ├── db.py               # Engine, session dependency, seed data
│   ├── tests/
│   │   └── test_api.py     # Pytest suite: collision rules, CRUD, status lifecycle
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthGate.jsx        # Sign-in / create account (+ WebGL bg)
│   │   │   ├── BoardShell.jsx      # App shell — top bar, greeting, content
│   │   │   ├── FilterBar.jsx       # Dynamic pill segmented control + actions
│   │   │   ├── TimeStrip.jsx       # Apple Day Schedule Track + Day Navigator
│   │   │   ├── CommandPalette.jsx  # ⌘K / Ctrl+K quick add + Siri voice dictation
│   │   │   ├── SlotList.jsx        # Date-grouped appointment list
│   │   │   ├── SlotCard.jsx        # Individual appointment row
│   │   │   ├── SlotModal.jsx       # Add / edit form with collision resolver
│   │   │   └── Toast.jsx           # Floating notification pill
│   │   ├── hooks/
│   │   │   └── useBoard.js         # All appointment state + API sync
│   │   ├── gl/
│   │   │   └── aurora.js           # Raw WebGL mesh gradient shader
│   │   ├── lib/
│   │   │   ├── api.js              # Fetch wrapper for FastAPI
│   │   │   ├── audio.js            # Web Audio API synthetic feedback
│   │   │   ├── voice.js            # Web Speech API recognition helper
│   │   │   ├── nlp.js              # Natural language appointment parser
│   │   │   └── time.js             # Date/time formatting & slot finders
│   │   ├── App.jsx                 # Root — auth routing
│   │   ├── main.jsx                # Vite entry point
│   │   └── index.css               # Design system & tokens
│   └── index.html
│
└── README.md
```

---

## Testing & Quality

The backend includes an automated test suite ([`backend/tests/test_api.py`](backend/tests/test_api.py)) validating:
1. `test_list_slots_empty`: Basic listing functionality.
2. `test_create_slot_success`: Valid slot persistence and schema conformity.
3. `test_overlap_same_day_rejected`: HTTP 409 Conflict thrown on overlapping time slots.
4. `test_adjacent_slots_allowed`: Adjacent back-to-back appointments (e.g. 10:00–11:00 and 11:00–12:00) succeed.
5. `test_overlap_different_days_allowed`: Same time on different dates allowed.
6. `test_cancelled_slot_does_not_block_booking`: Cancelled slots liberate time windows.
7. `test_patch_status_transitions`: Scheduled → Completed → Cancelled → Restored lifecycles.

---

## How It Works

1. **Initial Load & Pre-Seeded Board**:
   - On first startup, the backend automatically provisions SQLite tables and seeds realistic appointments across multiple dates.
   - The frontend queries `GET /api/slots`, chronologically sorts appointments into date groups, and calculates status tallies.

2. **Schedule Visualizer**:
   - The interactive Day Schedule Track maps appointments onto an 8:00 AM – 6:00 PM timeline.
   - Open intervals are calculated and displayed as `+ Available` cards. Clicking any open card auto-populates the booking modal with that exact time window.

3. **Collision Detection & Validation**:
   - When adding or editing an appointment, client-side validation ensures all fields are present, start time precedes end time, and no active appointments overlap (`[start, end)` interval check).
   - If a conflict occurs, the system flags the colliding event and computes the next open slot today via Smart Collision Resolution.
   - The backend independently enforces the overlap rule and returns `HTTP 409 Conflict` with an explanatory error message if violated.

4. **Status Lifecycle & Audit Trail**:
   - Appointments transition between `scheduled`, `completed`, and `cancelled`.
   - Cancelled appointments remain visible with strike-through styling and can be restored. Every modification records who touched it and when.

5. **Feedback & Alerts**:
   - Actions provide immediate visual confirmation via spring-animated toasts, field-level error messages, and optional synthetic Web Audio clicks and chimes.

---

## Assumptions Made

1. **Overlap Logic**:
   - Half-open intervals: An appointment ending at 11:00 does not conflict with one starting at 11:00.
   - Cancelled appointments liberate their time slot so another meeting can be scheduled in that window.
   - Two appointments at the same time on different calendar days do not conflict.

2. **Timezone Handling**:
   - Appointments represent wall-clock time in the team's local timezone (dates stored as `YYYY-MM-DD` and times as `HH:MM:SS`), avoiding unexpected UTC offset shifts.

3. **Team Context & Identity**:
   - Designed for internal small teams. A local account switcher allows quick switching between team members to test multi-user attribution (`touched_by`) without requiring complex third-party OAuth setups.

4. **Working Hours Default**:
   - The timeline and slot recommender default to typical business hours (8:00 AM to 6:00 PM), while allowing appointments outside this window if manually specified.
