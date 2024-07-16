# WebRTC based P2P Chat Application

This is a peer-to-peer (P2P) chat application built using WebRTC, Next.js, and Firebase. It allows users to chat directly with each other without relying on a central server for message delivery.

## Features

- **Real-time Chat:** Instant messaging with WebRTC.
- **Firebase Authentication:** Secure user authentication and management.
- **Responsive Design:** Optimized for both desktop and mobile devices.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js and npm installed
- Firebase account and project setup

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/smit4297/p2p-chat.git
cd p2p-chat
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Firebase

Create a `.env` file in the root directory and add your Firebase configuration details as follows:

```
# Firebase Configuration
FIREBASE_API_KEY="your_api_key_here"
FIREBASE_AUTH_DOMAIN="your_auth_domain_here"
FIREBASE_DATABASE_URL="your_database_url_here"
FIREBASE_PROJECT_ID="your_project_id_here"
FIREBASE_STORAGE_BUCKET="your_storage_bucket_here"
FIREBASE_MESSAGING_SENDER_ID="your_messaging_sender_id_here"
FIREBASE_APP_ID="your_app_id_here"
FIREBASE_MEASUREMENT_ID="your_measurement_id_here"
```

### 4. Run the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application in the browser.

## Project Structure

- **components/**: React components used in the application.
- **pages/**: Next.js pages for routing.
- **public/**: Static files (images, icons, etc.).
- **styles/**: CSS and styling files.

## Technologies Used

- **Next.js**: React framework for server-side rendering.
- **Firebase**: Backend-as-a-Service for authentication and database.
- **WebRTC**: Real-time communication protocol for P2P messaging.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License.

---
