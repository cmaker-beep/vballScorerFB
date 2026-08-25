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
  updateDoc 
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

// Navigation & View Sections
const portalSection = document.getElementById("portal-section");
const coachLoginCard = document.getElementById("coach-login-card");
const guestScoreboardSection = document.getElementById("guest-scoreboard-section");
const coachScoringSection = document.getElementById("coach-scoring-section");

// Action Buttons
const guestAccessBtn = document.getElementById("guest-access-btn");
const coachAccessBtn = document.getElementById("coach-access-btn");
const cancelLoginBtn = document.getElementById("cancel-login-btn");
const exitBtn = document.getElementById("exit-btn");

// Header / User Elements
const userProfile = document.getElementById("user-profile");
const userRoleBadge = document.getElementById("user-role-badge");
const userEmailDisplay = document.getElementById("user-email");

// Auth Form Elements
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const toggleAuthBtn = document.getElementById("toggle-auth-mode");
const authError = document.getElementById("auth-error");

// Match Dropdowns
const guestMatchSelect = document.getElementById("guest-match-select");
const coachMatchSelect = document.getElementById("coach-match-select");

// Scoreboard Views
const guestScoreboardView = document.getElementById("guest-scoreboard-view");
const coachScoreboardView = document.getElementById("coach-scoreboard-view");

let isSignUp = false;
let currentMatchId = null;
let matchUnsubscribe = null;
let currentScores = { teamAScore: 0, teamBScore: 0 };

// --- Navigation & Portal Handlers ---

// Guest Entry Button
guestAccessBtn.addEventListener("click", () => {
  portalSection.classList.add("hidden");
  coachLoginCard.classList.add("hidden");
  guestScoreboardSection.classList.remove("hidden");
  
  userProfile.classList.remove("hidden");
  userRoleBadge.textContent = "Role: Guest";
  userEmailDisplay.textContent = "";
  
  loadMatchList(guestMatchSelect);
});

// Coach Entry Button
coachAccessBtn.addEventListener("click", () => {
  portalSection.classList.add("hidden");
  coachLoginCard.classList.remove("hidden");
});

// Cancel Coach Login
cancelLoginBtn.addEventListener("click", () => {
  coachLoginCard.classList.add("hidden");
  portalSection.classList.remove("hidden");
});

// Exit / Logout Button
exitBtn.addEventListener("click", async () => {
  if (auth.currentUser) {
    await signOut(auth);
  }
  showPortalView();
});

function showPortalView() {
  if (matchUnsubscribe) matchUnsubscribe();
  currentMatchId = null;
  
  guestScoreboardSection.classList.add("hidden");
  coachScoringSection.classList.add("hidden");
  coachLoginCard.classList.add("hidden");
  userProfile.classList.add("hidden");
  portalSection.classList.remove("hidden");
}

// --- Auth Toggle & Submission ---

toggleAuthBtn.addEventListener("click", () => {
  isSignUp = !isSignUp;
  authTitle.textContent = isSignUp ? "Coach Sign Up" : "Coach Login";
  authSubmitBtn.textContent = isSignUp ? "Sign Up" : "Sign In";
  document.getElementById("auth-toggle-text").textContent = isSignUp ? "Already have an account?" : "Need an account?";
  toggleAuthBtn.textContent = isSignUp ? "Sign In" : "Sign Up";
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.classList.add("hidden");
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    if (isSignUp) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    authError.textContent = error.message;
    authError.classList.remove("hidden");
  }
});

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    portalSection.classList.add("hidden");
    coachLoginCard.classList.add("hidden");
    guestScoreboardSection.classList.add("hidden");
    coachScoringSection.classList.remove("hidden");

    userProfile.classList.remove("hidden");
    userRoleBadge.textContent = "Role: Coach";
    userEmailDisplay.textContent = user.email;

    loadMatchList(coachMatchSelect);
  }
});

// --- Match Selector & Real-Time Sync ---

function loadMatchList(selectElement) {
  if (!selectElement) return;

  onSnapshot(collection(db, "matches"), (snapshot) => {
    selectElement.innerHTML = '<option value="">-- Choose a Match --</option>';
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = `${data.teamA || "Team A"} vs ${data.teamB || "Team B"} (${data.status || "Scheduled"})`;
      selectElement.appendChild(option);
    });
    if (currentMatchId) selectElement.value = currentMatchId;
  });
}

// Guest Match Selection
guestMatchSelect.addEventListener("change", (e) => {
  bindMatchSubscription(e.target.value, "guest");
});

// Coach Match Selection
coachMatchSelect.addEventListener("change", (e) => {
  bindMatchSubscription(e.target.value, "coach");
});

function bindMatchSubscription(matchId, mode) {
  currentMatchId = matchId;
  if (matchUnsubscribe) matchUnsubscribe();

  const activeView = mode === "guest" ? guestScoreboardView : coachScoreboardView;

  if (!currentMatchId) {
    activeView.classList.add("disabled");
    return;
  }

  activeView.classList.remove("disabled");

  matchUnsubscribe = onSnapshot(doc(db, "matches", currentMatchId), (docSnap) => {
    if (!docSnap.exists()) return;
    const matchData = docSnap.data();
    currentScores = matchData.score || { teamAScore: 0, teamBScore: 0 };

    if (mode === "guest") {
      document.getElementById("guest-team-a-name").textContent = matchData.teamA || "Home Team";
      document.getElementById("guest-team-b-name").textContent = matchData.teamB || "Away Team";
      document.getElementById("guest-score-a").textContent = currentScores.teamAScore ?? 0;
      document.getElementById("guest-score-b").textContent = currentScores.teamBScore ?? 0;
      
      if (currentScores.lastUpdated) {
        document.getElementById("guest-last-updated").textContent = `Last Updated: ${new Date(currentScores.lastUpdated).toLocaleTimeString()}`;
      }
      
      fetchReference(matchData.divisionId, "divisions", "divisionName", document.getElementById("guest-meta-division"), "Division");
      fetchReference(matchData.courtId, "courts", "courtName", document.getElementById("guest-meta-court"), "Court");
      fetchReference(matchData.officialId, "officials", ["firstName", "lastName"], document.getElementById("guest-meta-official"), "Official");
      document.getElementById("guest-meta-status").textContent = `Status: ${matchData.status || "N/A"}`;
      document.getElementById("guest-match-meta").classList.remove("hidden");

    } else {
      document.getElementById("coach-team-a-name").textContent = matchData.teamA || "Home Team";
      document.getElementById("coach-team-b-name").textContent = matchData.teamB || "Away Team";
      document.getElementById("coach-score-a").textContent = currentScores.teamAScore ?? 0;
      document.getElementById("coach-score-b").textContent = currentScores.teamBScore ?? 0;
      
      if (currentScores.lastUpdated) {
        document.getElementById("coach-last-updated").textContent = `Last Updated: ${new Date(currentScores.lastUpdated).toLocaleTimeString()}`;
      }
    }
  });
}

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

// --- Coach Scoring Actions ---

document.querySelectorAll(".score-btn").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    if (!currentMatchId) {
      alert("Please select a match first!");
      return;
    }

    const team = e.target.getAttribute("data-team");
    const delta = parseInt(e.target.getAttribute("data-delta"), 10);

    let newAScore = currentScores.teamAScore || 0;
    let newBScore = currentScores.teamBScore || 0;

    if (team === "A") newAScore = Math.max(0, newAScore + delta);
    if (team === "B") newBScore = Math.max(0, newBScore + delta);

    const statusEl = document.getElementById("coach-db-status");
    if (statusEl) statusEl.textContent = "Status: Syncing...";

    try {
      await updateDoc(doc(db, "matches", currentMatchId), {
        score: {
          teamAScore: newAScore,
          teamBScore: newBScore,
          lastUpdated: new Date().toISOString()
        }
      });
      if (statusEl) statusEl.textContent = "Status: Synced";
    } catch (error) {
      if (statusEl) statusEl.textContent = "Status: Sync Error";
      console.error("Score update error:", error);
    }
  });
});

const resetBtn = document.getElementById("reset-btn");
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
