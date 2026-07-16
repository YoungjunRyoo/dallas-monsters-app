# Dallas Monsters Baseball Team App

The official mobile application for the Dallas Monsters amateur baseball team. This app is designed to manage team lineups, track live game box scores, aggregate season statistics, and provide team leaderboards.

## Key Features

### User Roles and Profile Management

- **Role Separation:** Distinct interfaces and permissions for the Admin (Manager) and Players.
- **Approval System:** New users must register with their name and jersey number, requiring admin approval to access team data.

### Live Box Score and Lineups

- Set game rosters, batting orders, and fielding positions.
- Track real-time player statistics during games, including At-Bats (AB), Runs (R), Hits (H), Doubles (2B), Triples (3B), Home Runs (HR), and Runs Batted In (RBI).
- Save lineup drafts and synchronize live game data across all team members' devices.

### Season Standings and Leaderboards

- View aggregated season statistics based on cumulative game data.
- Filter records by specific rosters (e.g., Overall, Team 1, Team 2).
- Sort player rankings by various metrics such as Batting Average (AVG), Home Runs (HR), and RBIs.

### Game Schedules and Push Notifications

- Manage upcoming game details including date, time, location, and opponent.
- Admins can trigger automated push notifications to alert all approved active roster members about schedule updates.

---

## Tech Stack

- **Frontend:** React Native, Expo, React Navigation
- **Backend & Database:** Firebase (Authentication, Firestore)
- **Notifications:** Expo Push Notifications
- **Build & Deployment:** Expo Application Services (EAS) for iOS TestFlight and Android APK

---

## Getting Started

For security reasons, the Firebase configuration file (`firebaseConfig.js`) is not included in this repository. To run this project locally, you will need to provide your own Firebase project credentials.

1. **Clone the repository**
   ```bash
   git clone [https://github.com/](https://github.com/)[YourGitHubUsername]/dallas-monsters-app.git
   cd dallas-monsters-app
   ```
