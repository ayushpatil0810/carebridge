# 🏥 CareBridge

**CareBridge** is an AI-powered digital health platform designed to empower community health workers (ASHA workers) at the grassroots level in rural India. The platform bridges the gap between village-level healthcare delivery and Primary Health Centers (PHCs), enabling early detection, systematic tracking, and AI-assisted clinical decision support for maternal and child health.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

CareBridge addresses critical healthcare challenges in rural India by:

- **Digitizing health records** at the village level
- **Empowering ASHA workers** with AI-powered clinical decision support
- **Enabling real-time PHC oversight** and case reviews
- **Supporting multilingual interactions** across 9 Indian languages
- **Tracking maternity and vaccination** schedules systematically
- **Implementing NEWS2 scoring** for early warning detection
- **Providing voice-based data entry** for low-literacy users

The platform follows the **SBAR (Situation-Background-Assessment-Recommendation)** communication framework to ensure structured, clinically relevant information exchange between field workers and healthcare providers.

---

## ✨ Key Features

### For ASHA Workers

- ✅ **Patient Registration & Management** - Digital patient records with comprehensive health history
- ✅ **Voice-Enabled Visit Entry** - Speech-to-text in 9 Indian languages via Sarvam AI
- ✅ **AI Clinical Advisor** - Google Gemini-powered differential diagnosis and risk assessment
- ✅ **NEWS2 Scoring** - Automatic calculation of National Early Warning Score 2
- ✅ **Maternity Tracker** - Gestational age tracking, EDD calculation, ANC/PNC visit management
- ✅ **Vaccination Tracker** - India National Immunization Schedule compliance
- ✅ **Message Templates** - Pre-built templates for common health advisories
- ✅ **Follow-Up Management** - Automated reminders for scheduled follow-ups
- ✅ **Emergency Contacts** - Quick access to PHC and emergency services

### For PHC Officers

- ✅ **Case Review Dashboard** - Review all flagged cases from field workers
- ✅ **SBAR-based Communication** - Structured clinical handoffs
- ✅ **Clarification System** - Two-way communication with ASHA workers
- ✅ **Advanced Filtering** - Filter by urgency, condition, date range
- ✅ **Maternity Panel** - Comprehensive maternal health overview
- ✅ **Vaccination Panel** - Track immunization coverage across villages

### For Administrators

- ✅ **Performance Analytics** - Track ASHA worker productivity and case outcomes
- ✅ **Notice Board Management** - System-wide announcements and guidelines
- ✅ **Data Export** - CSV export for external analysis
- ✅ **Vaccination Analytics** - Coverage rates and due vaccinations

### Cross-Platform Features

- 🌐 **Multi-language Support** - English, Hindi, Marathi, Tamil, Telugu, Kannada, Punjabi, Bengali, Gujarati
- 🎨 **Dark Mode** - Eye-friendly interface for all lighting conditions
- 🔒 **Secure Authentication** - Firebase-based role-based access control
- ⏰ **Idle Timeout Protection** - Automatic session timeout for data security
- 📱 **Responsive Design** - Works on mobile, tablet, and desktop devices
- ⚡ **Real-time Updates** - Firestore-based live data synchronization

---

## 🛠️ Technology Stack

### Frontend

- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.3.1
- **Routing**: React Router DOM 7.13.0
- **UI Components**: Lucide React (icons)
- **Charts**: Chart.js + React-ChartJS-2
- **Internationalization**: i18next + react-i18next

### Backend & AI

- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Auth
- **AI Services**:
  - **Gemini 2.5 Flash** (@google/genai) - Clinical decision support
  - **Sarvam AI** - Speech-to-text and SBAR generation

### Clinical Standards

- **NEWS2** - National Early Warning Score 2 (UK standard)
- **SBAR** - Situation-Background-Assessment-Recommendation framework
- **India NIS** - National Immunization Schedule

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                 │
├─────────────────────────────────────────────────────────┤
│  ASHA Interface  │  PHC Interface  │  Admin Interface   │
└──────────┬───────┴────────┬────────┴─────────┬──────────┘
           │                │                  │
           ├────────────────┴──────────────────┤
           │      Context Providers            │
           │  - Auth  - Toast  - Theme  - i18n │
           └─────────────┬─────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼─────┐   ┌──────▼──────┐   ┌────▼─────┐
   │ Firebase  │   │   Gemini    │   │  Sarvam  │
   │ Firestore │   │   AI API    │   │  AI API  │
   │   Auth    │   │ (Advisory)  │   │  (STT)   │
   └───────────┘   └─────────────┘   └──────────┘
```

### Data Flow

1. **ASHA Worker** enters patient visit data (voice or manual)
2. **Sarvam AI** converts speech to structured text
3. **NEWS2 Engine** calculates risk scores locally
4. **Gemini AI** provides clinical advisory (if requested)
5. **Firestore** stores all data with real-time sync
6. **PHC Officer** reviews cases and provides feedback
7. **Admin** monitors system-wide metrics and performance

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v9.0.0 or higher) or **yarn** (v1.22.0 or higher)
- **Git** - [Download](https://git-scm.com/)
- **Firebase Account** - [Sign up](https://firebase.google.com/)
- **Google AI Studio Account** - [Sign up](https://aistudio.google.com/)
- **Sarvam AI API Key** (optional) - [Sign up](https://sarvam.ai/)

---

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/ayushpatil0810/carebridge.git
cd carebridge
```

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 3: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or select an existing one)
3. **Enable Authentication:**
   - Navigate to **Authentication** → **Sign-in method**
   - Enable **Email/Password** provider
4. **Enable Firestore:**
   - Navigate to **Firestore Database** → **Create database**
   - Select **Start in test mode** (for development)
   - Choose nearest region (e.g., `asia-south1` for India)
5. **Get Firebase Configuration:**
   - Go to **Project Settings** → **General** → **Your apps**
   - Click **</>** (Web) to register a web app
   - Copy the `firebaseConfig` object

### Step 4: Set Up Firestore Security Rules

In Firebase Console, navigate to **Firestore Database** → **Rules** and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 5: Create User Roles in Firestore

After signing up users through the app, manually add their roles in Firestore:

1. Go to **Firestore Database** → **users** collection
2. Create/Edit a document with the user's Firebase UID
3. Add fields:
   ```json
   {
     "email": "user@example.com",
     "name": "User Name",
     "role": "asha",
     "createdAt": "2026-02-22T00:00:00.000Z"
   }
   ```

Available roles: `asha`, `phc`, `admin`

### Step 6: Get API Keys

#### Google Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **Get API Key** → **Create API Key**
4. Copy the API key

#### Sarvam AI API Key (Optional - for Speech-to-Text)

1. Visit [Sarvam AI](https://sarvam.ai/)
2. Sign up for an account
3. Navigate to API section and generate a key
4. Copy the API key

---

## ⚙️ Configuration

### Step 1: Create Environment File

Create a `.env` file in the root directory:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# AI Service Keys
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_SARVAM_API_KEY=your_sarvam_api_key

# Emergency Contact Numbers (Optional)
VITE_ASHA_PHONE=9999999999
VITE_PHC_PHONE=9999999999
```

### Step 2: Verify Configuration

Ensure your `.env` file is added to `.gitignore` to prevent exposing secrets:

```bash
# .gitignore should contain:
.env
.env.local
.env.*.local
```

---

## 🎯 Usage

### Development Mode

Start the development server with hot-reloading:

```bash
npm run dev
# or
yarn dev
```

The app will be available at: `http://localhost:5173`

### Production Build

Build the optimized production bundle:

```bash
npm run build
# or
yarn build
```

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
# or
yarn preview
```

### Linting

Run ESLint to check code quality:

```bash
npm run lint
# or
yarn lint
```

---

## 📁 Project Structure

```
carebridge/
├── public/                      # Static assets
├── src/
│   ├── assets/                  # Images, fonts, etc.
│   ├── components/              # Reusable UI components
│   │   ├── EmergencyContactModal.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── IdleTimeoutGuard.jsx
│   │   ├── LanguageSelector.jsx
│   │   ├── Layout.jsx
│   │   ├── MessageSuggestModal.jsx
│   │   ├── Pagination.jsx
│   │   ├── SBARDisplay.jsx
│   │   ├── Skeleton.jsx
│   │   └── VoiceInput.jsx
│   ├── contexts/                # React Context providers
│   │   ├── AuthContext.jsx      # Firebase auth + roles
│   │   ├── ThemeContext.jsx     # Dark/Light mode
│   │   └── ToastContext.jsx     # Notifications
│   ├── hooks/                   # Custom React hooks
│   │   └── useIdleTimeout.js
│   ├── locales/                 # i18n translation files
│   │   ├── en/, hi/, mr/, ta/, te/, kn/, pa/, bn/, gu/
│   │   └── translation.json (in each)
│   ├── pages/                   # Route components
│   │   ├── Login.jsx
│   │   ├── admin/               # Admin dashboard pages
│   │   ├── asha/                # ASHA worker pages
│   │   └── phc/                 # PHC officer pages
│   ├── services/                # API & business logic
│   │   ├── adminService.js
│   │   ├── aiAdvisoryService.js # Gemini AI integration
│   │   ├── emergencyContactService.js
│   │   ├── followUpService.js
│   │   ├── maternityService.js
│   │   ├── messageService.js
│   │   ├── noticeService.js
│   │   ├── patientService.js
│   │   ├── sarvamService.js     # Sarvam AI speech-to-text
│   │   ├── vaccinationService.js
│   │   └── visitService.js
│   ├── utils/                   # Helper functions
│   │   ├── csvExport.js
│   │   ├── news2.js             # NEWS2 scoring engine
│   │   └── vitalsValidation.js
│   ├── App.jsx                  # Root component + routing
│   ├── firebase.js              # Firebase initialization
│   ├── i18n.js                  # i18next configuration
│   ├── index.css                # Global styles
│   └── main.jsx                 # Application entry point
├── .env                         # Environment variables (not in git)
├── .gitignore
├── eslint.config.js
├── index.html                   # HTML template
├── package.json                 # Dependencies & scripts
├── README.md                    # This file
└── vite.config.js               # Vite configuration
```

---

## 👥 User Roles

### 1. ASHA Worker (`role: "asha"`)

- **Primary User**: Community health worker at village level
- **Responsibilities**:
  - Register new patients
  - Conduct home visits and record health data
  - Track maternity and vaccination schedules
  - Send SBAR reports to PHC for high-risk cases
  - Respond to PHC clarifications
  - Maintain follow-up schedules

### 2. PHC Officer (`role: "phc"`)

- **Primary User**: Primary Health Center medical officer
- **Responsibilities**:
  - Review all incoming SBAR reports
  - Request clarifications from ASHA workers
  - Monitor maternity and vaccination coverage
  - Provide clinical guidance and recommendations
  - Escalate critical cases to district hospitals

### 3. Administrator (`role: "admin"`)

- **Primary User**: District/Block health administrator
- **Responsibilities**:
  - Monitor system-wide performance metrics
  - Manage notice board and guidelines
  - Analyze health statistics and trends
  - Export data for external reporting
  - Track ASHA worker productivity

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues

- Use the GitHub Issues tab
- Provide detailed description and steps to reproduce
- Include screenshots if applicable

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/YourFeature`
3. Commit changes: `git commit -m 'Add YourFeature'`
4. Push to branch: `git push origin feature/YourFeature`
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and structure
- Add comments for complex logic
- Update documentation for new features
- Test thoroughly before submitting PR
- Ensure ESLint passes: `npm run lint`

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **National Health Mission (NHM)** - For inspiring grassroots healthcare digitization
- **Google Gemini** - For providing advanced AI capabilities
- **Sarvam AI** - For multilingual speech-to-text support
- **Firebase** - For reliable backend infrastructure
- **React & Vite Community** - For excellent development tools

---

## 🌟 Star Us!

If you find this project useful, please consider giving it a ⭐ on GitHub!

---

**Built with ❤️ for rural healthcare workers across India**
