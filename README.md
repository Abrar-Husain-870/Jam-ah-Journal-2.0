# Jamā'ah Journal - Prayer Tracker 

A modern React application for tracking daily prayers with Firebase authentication and data persistence.

## Features

- 📅 **Prayer Calendar**: Visual calendar to mark daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha)
- 🔐 **Firebase Authentication**: Email/password and Google sign-in support
- 📊 **Progress Tracking**: Visual charts and statistics for prayer consistency
- 👥 **Leaderboard**: Compare progress with friends (optional privacy settings)
- 🌙 **Dark/Light Theme**: Toggle between light and dark modes
- 📱 **PWA Support**: Install as a mobile app
- 🔄 **Real-time Sync**: Data syncs across devices via Firebase Firestore

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, Lucide Icons
- **Backend**: Firebase (Authentication, Firestore)
- **Charts**: Chart.js with react-chartjs-2
- **Calendar**: react-calendar
- **Build Tool**: Create React App

## Prerequisites

- Node.js 16+ installed
- Firebase project configured with:
  - Authentication enabled (Email/Password and Google providers)
  - Firestore database
  - Authorized domains configured

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Abrar-Husain-870/Jam-ah-Journal-2.0.git
   cd Jam-ah-Journal-2.0
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   
   Create `.env.local` in the root directory:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

   Replace with your Firebase project credentials.

4. **Firebase Configuration**
   
   - Enable Authentication providers in Firebase Console
   - Configure Firestore Security Rules (see below)
   - Add authorized domains:
     - `localhost`
     - `127.0.0.1`
     - Your Vercel deployment URL

5. **Run locally**
   ```bash
   npm start
   ```

   Opens at http://localhost:3000

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy - Vercel will automatically build and deploy

### Build locally

```bash
npm run build
```

Builds to `build/` directory for static hosting.

## Firestore Security Rules

Copy these rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Project Structure

```
src/
├── components/          # React components
│   ├── Login.js
│   ├── PrayerCalendar.js
│   ├── Progress.js
│   ├── Profile.js
│   └── Leaderboard.js
├── contexts/           # React contexts
│   ├── AuthContext.js
│   └── ThemeContext.js
├── firebase/           # Firebase configuration
│   └── config.js
├── services/           # API services
│   ├── prayerService.js
│   └── analyticsService.js
└── App.js             # Main app component
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

- **This project’s source code** is licensed under the [MIT License](./LICENSE) (SPDX: `MIT`).
- **Third-party libraries** (React, Firebase, Chart.js, Tailwind, etc.) remain under their respective licenses. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for a summary and where to find each package’s full license text in `node_modules`.

## Support

For issues and questions:
- Check the [Issues](https://github.com/Abrar-Husain-870/Jam-ah-Journal-2.0/issues) page
- Create a new issue with detailed description

---

Built with ❤️ for the Muslim community  

      