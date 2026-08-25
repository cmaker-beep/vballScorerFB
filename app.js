import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc,
  collection, 
  onSnapshot, 
  updateDoc,
  query,
  where
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
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const showLoginBtn = document.getElementById("show-login-btn");
const loginModal = document.getElementById("login-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const userProfile = document.getElementById("user-profile");
const userEmailDisplay = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const dashboardBtn = document.getElementById("dashboard-btn");

const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const toggleAuthBtn = document.getElementById("toggle-auth-mode");
const authError = document.getElementById("auth-error");

const publicScoreboard = document.getElementById("public-scoreboard-section");
const coachDashboard = document.getElementById("coach-dashboard-section");

const matchSelect = document.getElementById("match-select");
const matchMetaDetails = document.getElementById("match-meta-details");
const metaDivision = document.getElementById("meta-division");
const metaCourt = document.getElementById("meta-court");
const metaOfficial = document.getElementById("meta-official");
const metaStatus = document.getElementById("meta-status");

const scoreboardView = document.getElementById("scoreboard-view");
const teamAName = document.getElementById("team-a-name");
const teamBName = document.getElementById("team-b-name");
const scoreADisplay = document.getElementById("score-a");
const scoreBDisplay = document.getElementById("score-b");
const dbStatus = document.getElementById("db-status");
const lastUpdatedDisplay = document.getElementById("last-updated");

const coachScoreControl = document.getElementById("coach-score-control");
const manageScoreCard = document.getElementById("manage-score-card");
const pastResultsCard = document.getElementById("past-results-card");
const pastMatchesSection = document.getElementById("past-matches-section");
const pastMatchesList = document.getElementById("past-matches-list");
const resetBtn = document.getElementById("reset-btn");

let isSignUp = false;
let currentMatchId = null;
let matchUnsubscribe = null;
let currentScores = { teamAScore: 0, teamBScore: 0 };

// Modal & Auth Setup
if (showLoginBtn) showLoginBtn.addEventListener("click", () => loginModal.classList.remove("hidden"));
if (closeModalBtn) closeModalBtn.addEventListener("click", () => loginModal.classList.add("hidden"));

if (toggleAuthBtn) {
  toggleAuthBtn.addEventListener("click", () => {
    isSignUp = !isSignUp;
    authTitle.textContent = isSignUp ? "Coach Sign Up" : "Coach Login";
    authSubmitBtn.textContent = isSignUp ? "Sign Up" : "Sign In";
    document.getElementById("auth-toggle-text").textContent = isSignUp ? "Already have an account?" : "Need an account?";
    toggleAuthBtn.textContent = isSignUp ? "Sign In" : "Sign Up";
  });
}

if (authForm) {
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (authError) authError.classList.add("hidden");
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      loginModal.classList.add("hidden");
    } catch (error) {
      if (authError) {
        authError.textContent = error.message;
        authError.classList.remove("hidden");
      }
    }
  });
}

if (logoutBtn) logoutBtn.addEventListener("click", () => signOut(auth));

if (dashboardBtn) {
  dashboardBtn.addEventListener("click", () => {
    publicScoreboard.classList.add("hidden");
    coachDashboard.classList.remove("hidden");
  });
}

// Authentication State Listener (Safe Guarded against Null Elements)
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (showLoginBtn) showLoginBtn.classList.add("hidden");
    if (userProfile) userProfile.classList.remove("hidden");
    if (userEmailDisplay) userEmailDisplay.textContent = user.email;
    
    // Default logged-in coaches to Dashboard view
    if (publicScoreboard) publicScoreboard.classList.add("hidden");
    if (coachDashboard) coachDashboard.classList.remove("hidden");
  } else {
    if (showLoginBtn) showLoginBtn.classList.remove("hidden");
    if (userProfile) userProfile.classList.add("hidden");
    
    // Public guest view
    if (publicScoreboard) publicScoreboard.classList.remove("hidden");
    if (coachDashboard) coachDashboard.classList.add("hidden");
  }
  loadMatches();
});

// Load Matches into Selector Dropdown
function loadMatches() {
  if (!matchSelect) return;
  
  onSnapshot(collection(db, "matches"), (snapshot) => {
    matchSelect.innerHTML = '<option value="">-- Choose a Match --</option>';
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = `${data.teamA || "Team A"} vs ${data.teamB || "Team B"} (${data.status || "Scheduled"})`;
      matchSelect.appendChild(option);
    });
    
    if (currentMatchId) matchSelect.value = currentMatchId;
  });
}

// Listen for Match Selection
if (matchSelect) {
  matchSelect.addEventListener("change", (e) => {
    currentMatchId = e.target.value;
    if (matchUnsubscribe) matchUnsubscribe();

    if (!currentMatchId) {
      if (scoreboardView) scoreboardView.classList.add("disabled");
      if (matchMetaDetails) matchMetaDetails.classList.add("hidden");
      return;
    }

    if (scoreboardView) scoreboardView.classList.remove("disabled");
    if (matchMetaDetails) matchMetaDetails.classList.remove("hidden");

    // Live Snapshot Listener for Scores
    matchUnsubscribe = onSnapshot(doc(db, "matches", currentMatchId), (matchSnap) => {
      if (!matchSnap.exists()) return;
      const matchData = matchSnap.data();

      if (teamAName) teamAName.textContent = matchData.teamA || "Home Team";
      if (teamBName) teamBName.textContent = matchData.teamB || "Away Team";
      
      currentScores = matchData.score || { teamAScore: 0, teamBScore: 0 };
      if (scoreADisplay) scoreADisplay.textContent = currentScores.teamAScore ?? 0;
      if (scoreBDisplay) scoreBDisplay.textContent = currentScores.teamBScore ?? 0;
      if (metaStatus) metaStatus.textContent = `Status: ${matchData.status || "N/A"}`;
      
      if (currentScores.lastUpdated && lastUpdatedDisplay) {
        lastUpdatedDisplay.textContent = `Last Updated: ${new Date(currentScores.lastUpdated).toLocaleTimeString()}`;
      }

      fetchReference(matchData.divisionId, "divisions", "divisionName", metaDivision, "Division");
      fetchReference(matchData.courtId, "courts", "courtName", metaCourt, "Court");
      fetchReference(matchData.officialId, "officials", ["firstName", "lastName"], metaOfficial, "Official");
    });
  });
}

// Fetch Reference Details (Divisions, Courts, Officials)
async function fetchReference(id, collectionName, field, targetElement, label) {
  if (!targetElement) return;
  if (!id) {
    targetElement.textContent = `${label}: N/A`;
    return;
  }
  try {
    const snap = await getDoc(doc(db, collectionName, id));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(field)) {
        targetElement.textContent = `${label}: ${field.map(f => data[f] || "").join(" ").trim()}`;
      } else {
        targetElement.textContent = `${label}: ${data[field] || id}`;
      }
    } else {
      targetElement.textContent = `${label}: ${id}`;
    }
  } catch (err) {
    targetElement.textContent = `${label}: ${id}`;
  }
}

// Coach Scoring Buttons
document.querySelectorAll(".score-btn").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    if (!currentMatchId) {
      alert("Please select a match from the selector first!");
      return;
    }

    const team = e.target.getAttribute("data-team");
    const delta = parseInt(e.target.getAttribute("data-delta"), 10);

    let newAScore = currentScores.teamAScore || 0;
    let newBScore = currentScores.teamBScore || 0;

    if (team === "A") newAScore = Math.max(0, newAScore + delta);
    if (team === "B") newBScore = Math.max(0, newBScore + delta);

    if (dbStatus) dbStatus.textContent = "Status: Syncing...";

    try {
      await updateDoc(doc(db, "matches", currentMatchId), {
        score: {
          teamAScore: newAScore,
          teamBScore: newBScore,
          lastUpdated: new Date().toISOString()
        }
      });
      if (dbStatus) dbStatus.textContent = "Status: Synced";
    } catch (error) {
      if (dbStatus) dbStatus.textContent = "Status: Sync Error";
      console.error("Score update error:", error);
    }
  });
});

// Dashboard Section Toggles
if (manageScoreCard) {
  manageScoreCard.addEventListener("click", () => {
    if (coachScoreControl) coachScoreControl.classList.toggle("hidden");
    if (publicScoreboard) publicScoreboard.classList.remove("hidden");
  });
}

if (pastResultsCard) {
  pastResultsCard.addEventListener("click", () => {
    if (pastMatchesSection) {
      pastMatchesSection.classList.toggle("hidden");
      loadPastResults();
    }
  });
}

// Load Past Results (Completed Matches)
async function loadPastResults() {
  if (!pastMatchesList) return;
  pastMatchesList.innerHTML = "<li>Loading past matches...</li>";

  try {
    const q = query(collection(db, "matches"), where("status", "==", "Completed"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      pastMatchesList.innerHTML = "<li>No completed matches found.</li>";
      return;
    }

    pastMatchesList.innerHTML = "";
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const score = data.score || { teamAScore: 0, teamBScore: 0 };
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${data.teamA} (${score.teamAScore}) vs ${data.teamB} (${score.teamBScore})</strong>
        <span>Status: ${data.status}</span>
      `;
      pastMatchesList.appendChild(li);
    });
  } catch (error) {
    pastMatchesList.innerHTML = `<li>Error loading past results: ${error.message}</li>`;
  }
}

// Reset Score Button
if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    if (!currentMatchId || !confirm("Reset current match score to 0-0?")) return;
    
    try {
      await updateDoc(doc(db, "matches", currentMatchId), {
        score: {
          teamAScore: 0,
          teamBScore: 0,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Reset score error:", error);
    }
  });
}
