import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
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

// Populate Reference Dropdowns on Load
async function loadDropdowns() {
  await Promise.all([
    fetchOptions("divisions", divisionSelect, "divisionName", "division_001"),
    fetchOptions("courts", courtSelect, "courtName", "court_001"),
    fetchOptions("officials", officialSelect, ["firstName", "lastName"], "official_001")
  ]);
}

async function fetchOptions(collectionName, selectElement, nameFields, fallbackId) {
  selectElement.innerHTML = "";
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    if (querySnapshot.empty) {
      selectElement.innerHTML = `<option value="${fallbackId}">Default ${collectionName} (${fallbackId})</option>`;
      return;
    }
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let displayName = docSnap.id;
      
      if (Array.isArray(nameFields)) {
        displayName = nameFields.map(f => data[f] || "").join(" ").trim() || docSnap.id;
      } else if (data[nameFields]) {
        displayName = data[nameFields];
      }

      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = displayName;
      selectElement.appendChild(option);
    });
  } catch (err) {
    console.warn(`Could not load ${collectionName}, using fallback:`, err);
    selectElement.innerHTML = `<option value="${fallbackId}">${fallbackId}</option>`;
  }
}

// Form Submission
addMatchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const teamA = document.getElementById("team-a").value.trim();
  const teamB = document.getElementById("team-b").value.trim();
  const matchTimeRaw = document.getElementById("match-time").value;
  const status = document.getElementById("match-status").value;

  const newMatch = {
    divisionId: divisionSelect.value,
    courtId: courtSelect.value,
    officialId: officialSelect.value,
    teamA: teamA,
    teamB: teamB,
    matchTime: new Date(matchTimeRaw).toISOString(),
    status: status,
    score: {
      teamAScore: 0,
      teamBScore: 0,
      lastUpdated: new Date().toISOString()
    }
  };

  try {
    const docRef = await addDoc(collection(db, "matches"), newMatch);
    showMessage(`Match created successfully with ID: ${docRef.id}`, "success");
    addMatchForm.reset();
  } catch (error) {
    console.error("Error adding match: ", error);
    showMessage(`Error saving match: ${error.message}`, "error");
  }
});

function showMessage(msg, type) {
  messageDiv.textContent = msg;
  messageDiv.className = `status-msg ${type}`;
  messageDiv.classList.remove("hidden");
}

loadDropdowns();
