# Dallas Monsters Baseball Team Management App

A cross-platform mobile application built for the **Dallas Monsters amateur baseball team** to manage player registration, game schedules, lineups, live box scores, season statistics, and team leaderboards.

The app provides separate workflows for **Managers and Players** and uses Firebase to synchronize team and game data across devices.

---

## Demo

https://github.com/user-attachments/assets/47ab31d0-008e-4b0b-8c8a-ac37880975d9


### Screenshots

Add your screenshots here:

```md
<img width="585" height="1266" alt="IMG_8215 2" src="https://github.com/user-attachments/assets/041dd651-d1c9-44d4-a308-ed7a7778c060" />
<img width="585" height="1266" alt="IMG_8211 2" src="https://github.com/user-attachments/assets/5b7afe08-2619-47b1-88a4-b01a3341eaa6" />
<img width="585" height="1266" alt="IMG_8212 2" src="https://github.com/user-attachments/assets/da36bb37-61e4-4cc9-bda0-b5385ab1c42a" />
<img width="585" height="1266" alt="IMG_8213 2" src="https://github.com/user-attachments/assets/551298a3-e245-4cab-aecd-d68c33304e7d" />
<img width="585" height="1266" alt="IMG_8214 2" src="https://github.com/user-attachments/assets/97303d20-f457-4613-afed-f8d9643a3cf6" />
```
Key Features
Authentication & Role-Based Access
Email/password authentication using Firebase Authentication
Separate workflows for Managers and Players
New players register with their name and jersey number
New accounts remain in a pending state until approved by a manager
Managers can approve or deactivate team members
Authentication sessions persist across app restarts using AsyncStorage
Real-Time Data Synchronization

The app uses Cloud Firestore real-time listeners to synchronize team data across connected clients.

Real-time data includes:

Upcoming game schedules
Team roster information
Current game lineup
Live box score data

Changes made by the manager are reflected for players without requiring a manual refresh.

Game & Lineup Management

Managers can create and manage game lineups by selecting:

Team
Opponent
Game date and time
Participating players
Batting order
Defensive positions

Players can be reordered directly in the lineup, and players assigned to bench or OUT are automatically moved outside the active batting order.

Lineups and current game statistics can also be saved as drafts before final submission.

Live Box Score Tracking

Managers can record player statistics during a game, including:

At-Bats (AB)
Runs (R)
Hits (H)
Doubles (2B)
Triples (3B)
Home Runs (HR)
Runs Batted In (RBI)

Approved players can view the active lineup and live game statistics.

Season Statistics & Leaderboards

Completed game results are accumulated into player season records.

The leaderboard supports:

Overall team statistics
Team-specific filtering
Batting Average (AVG) calculation
Sorting by statistical category

Supported statistics:

AVG
AB
R
H
2B
3B
HR
RBI

Batting average is calculated dynamically using:

AVG = Hits / At-Bats
Firestore Game Submission Flow

When a game is finalized, the application uses a Cloud Firestore batch write to update related records consistently.

Final Game Submission
        |
        v
Create Game Record
        |
        v
Increment Player Season Statistics
        |
        v
Delete Current Game Draft
        |
        v
Commit Firestore Batch

Player season statistics are updated with Firestore atomic increment() operations.

Push Notifications

Managers can publish upcoming game schedules and notify approved players.

Notification flow:

Manager Updates Schedule
        |
        v
Save Schedule to Firestore
        |
        v
Retrieve Approved Players
        |
        v
Collect Expo Push Tokens
        |
        v
Send Push Notifications

Push notifications are implemented using Expo Notifications and the Expo Push API.

Tech Stack
Mobile
React Native
Expo
React Hooks
Authentication & Database
Firebase Authentication
Cloud Firestore
AsyncStorage
Notifications
Expo Notifications
Expo Push API
Build & Deployment
Expo Application Services (EAS)
Android APK build configuration
iOS and Android application configuration

Project Structure
dallas-monsters-app/
├── assets/
├── App.js
├── firebaseConfig.js
├── index.js
├── app.json
├── eas.json
├── package.json
└── package-lock.json

The current application is implemented primarily in App.js, which contains authentication, Firestore synchronization, game management, statistics processing, and UI logic.

Firestore Data Model

The app primarily uses the following Firestore collections:

users/
  {userId}
    name
    backNumber
    email
    role
    status
    pushToken
    seasons

schedule/
  next_game
  current_game_draft

games/
  {gameId}
    opponent
    date
    time
    gameNumber
    team
    rosterRecords
User Roles
Manager

Managers can:

Approve or deactivate players
Publish upcoming game schedules
Send push notifications
Create game lineups
Assign batting order and fielding positions
Record live player statistics
Submit final game results
View season leaderboards
Player

Players can:

View upcoming game schedules
View active lineups
View live box score data
View season statistics and leaderboards
Getting Started
1. Clone the repository
git clone https://github.com/YOUR_USERNAME/dallas-monsters-app.git
cd dallas-monsters-app
2. Install dependencies
npm install
3. Configure Firebase

Create a Firebase project and enable:

Firebase Authentication
Cloud Firestore

Create a firebaseConfig.js file and configure:

Firebase App
Firebase Authentication
Cloud Firestore
React Native authentication persistence using AsyncStorage
4. Start the app
npx expo start

or:

npm start
Build

The project uses Expo Application Services (EAS).

Android Preview APK
eas build --platform android --profile preview
Production Android Build
eas build --platform android --profile production
Production iOS Build
eas build --platform ios --profile production
Security

The app uses Firebase Authentication for user identity, but database authorization should also be enforced through Firestore Security Rules.

Privileged operations such as the following should be restricted to authorized manager accounts:

Player approval
Player deactivation
Game submission
Season statistic updates
Administrative schedule changes
Future Improvements
Refactor App.js into reusable screens, components, hooks, and Firebase service modules
Add support for multiple seasons
Add pitching statistics
Add historical game detail pages
Improve offline synchronization and error handling
Move privileged administrative operations to server-side Firebase Cloud Functions
License

This project was developed for the Dallas Monsters amateur baseball team.


