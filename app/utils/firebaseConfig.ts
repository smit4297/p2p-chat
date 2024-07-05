// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyB9EIYlDOT0gxLO5SGxUsV4tK8BhcniHkA",
    authDomain: "p2p-chat-codes.firebaseapp.com",
    databaseURL: "https://p2p-chat-codes-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "p2p-chat-codes",
    storageBucket: "p2p-chat-codes.appspot.com",
    messagingSenderId: "263035892598",
    appId: "1:263035892598:web:26311bf43a64d1fff5c057",
    measurementId: "G-X7C03046MH"
  };

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
