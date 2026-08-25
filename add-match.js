import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc 
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDEKqPBKFwTnCHTt9sij5bgNeJqb0e2PE8",
  authDomain: "vballscorer-3292c.firebaseapp.com",
  projectId: "vballscorer-3292c",
  storageBucket: "vballscorer-3292c.firebasestorage.app",
  messagingSenderId: "604715132324",
  appId: "1:604715132324:web:c682e61dc8518bf18ecd31"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const divisionSelect = document.getElementById("division-select");
const courtSelect = document.getElementById("court-select");
const officialSelect = document.getElementById("official-select");
const addMatchForm = document.getElementById("add-match-form");
const messageDiv = document.getElementById("form-message");

// Real-Time Listener Helper
function listenToCollection(collectionName, selectElement, nameFields, defaultLabel) {
  if (!selectElement) return;

  onSnapshot(collection(db, collectionName), (snapshot) => {
    selectElement.innerHTML = `<option value="">-- Select ${defaultLabel} --</option>`;

    if (snapshot.empty) {
      selectElement.innerHTML = `<option value="">No ${defaultLabel}s found in database</option>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let displayName = "";

      if (Array.isArray(nameFields)) {
        displayName = nameFields.map(f => data[f] || "").join(" ").trim();
      } else {
        displayName = data[nameFields] || "";
      }

      // Fallback if field name was blank
      if (!displayName) displayName = docSnap.id;

      const option = document.createElement("option");
      option.value = docSnap.id; // Store Doc ID as the value
      option.textContent = displayName; // Display human-readable name
      selectElement.appendChild(option);
    });
  }, (err) => {
    console.error(`Error loading ${collectionName}:`, err);
    selectElement.innerHTML = `<option value="">Error loading ${defaultLabel}s</option>`;
  });
}

// Attach Real-time Listeners
listenToCollection("divisions", divisionSelect, "divisionName", "Division");
listenToCollection("courts", courtSelect, "courtName", "Court");
listenToCollection("officials", officialSelect, ["firstName", "lastName"], "Official");

// Safe Form Submission
if (addMatchForm) {
  addMatchForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const teamAEl = document.getElementById("team-a");
    const teamBEl = document.getElementById("team-b");
    const matchTimeEl = document.getElementById("match-time");
    const statusEl = document.getElementById("match-status");

    if (!divisionSelect?.value) {
      showMessage("Please select a valid division.", "error");
      return;
    }

    const newMatch = {
      divisionId: divisionSelect.value,
      courtId: courtSelect?.value || "",
      officialId: officialSelect?.value || "",
      teamA: teamAEl ? teamAEl.value.trim() : "",
      teamB: teamBEl ? teamBEl.value.trim() : "",
      matchTime: matchTimeEl?.value ? new Date(matchTimeEl.value).toISOString() : new Date().toISOString(),
      status: statusEl ? statusEl.value : "Scheduled",
      score: {
        teamAScore: 0,
        teamBScore: 0,
        lastUpdated: new Date().toISOString()
      }
    };

    try {
      const docRef = await addDoc(collection(db, "matches"), newMatch);
      showMessage(`Match created successfully! ID: ${docRef.id}`, "success");
      addMatchForm.reset();
    } catch (error) {
      console.error("Error creating match:", error);
      showMessage(`Error saving match: ${error.message}`, "error");
    }
  });
}

function showMessage(msg, type) {
  if (!messageDiv) return;
  messageDiv.textContent = msg;
  messageDiv.className = `status-msg ${type}`;
  messageDiv.classList.remove("hidden");
}
