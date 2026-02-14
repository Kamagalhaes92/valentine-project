// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDFGlOhM0M_fsZWWeoXxbcztDu6MV9Jvxg",
  authDomain: "valentine-2026-cb7f3.firebaseapp.com",
  projectId: "valentine-2026-cb7f3",
  storageBucket: "valentine-2026-cb7f3.firebasestorage.app",
  messagingSenderId: "392412137879",
  appId: "1:392412137879:web:7ba8bbfb37915bfe7bdcd2",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

// Save card to Firestore
export async function saveCard(cardData) {
  const docRef = await addDoc(collection(db, "cards"), cardData);
  return docRef.id;
}

// Load card from Firestore
export async function loadCardById(id) {
  const docRef = doc(db, "cards", id);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}

// Upload image to Storage and return public URL
export async function uploadCardImage(blob, fileName = "card.png") {
  const path = `cards/${Date.now()}-${Math.random().toString(16).slice(2)}-${fileName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: "image/png" });
  return await getDownloadURL(storageRef);
}
