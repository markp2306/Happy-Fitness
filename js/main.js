import { auth, db } from './firebase-config.js';
import { collection, getDocs, query, where, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', async () => {
    // Sync Auth State
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadAnyProfile(user.email);
        }
        updateNavbar();
    });

    updateNavbar();
    initRestTimer(); // Added Rest Timer
    
    // Navbar Scroll Effect
    const nav = document.querySelector('nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(13, 13, 13, 0.95)';
            nav.style.padding = '1rem 5%';
        } else {
            nav.style.background = 'rgba(13, 13, 13, 0.85)';
            nav.style.padding = '1.5rem 5%';
        }
    });

    // Handle Logouts
    document.addEventListener('click', (e) => {
        if (e.target.id === 'userLogout') {
            e.preventDefault();
            localStorage.removeItem('userLoggedIn');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            localStorage.removeItem('userAssignedTrainer');
            window.location.href = 'index.html';
        }
        if (e.target.id === 'trainerLogout') {
            e.preventDefault();
            localStorage.removeItem('trainerLoggedIn');
            localStorage.removeItem('trainerEmail');
            window.location.href = 'index.html';
        }
        if (e.target.id === 'openProfile') {
            e.preventDefault();
            document.getElementById('profileModal').style.display = 'flex';
        }
        if (e.target.id === 'updateUserProfileBtn') {
            e.preventDefault();
            updateUserProfile();
        }
        if (e.target.id === 'deleteUserAccountBtn') {
            e.preventDefault();
            deleteUserAccount();
        }
    });

    // Handle Exercise Detail Page
    if (window.location.pathname.includes('exercise.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const workoutId = parseInt(urlParams.get('id'));

        const workouts = JSON.parse(localStorage.getItem('workouts')) || [];
        const exerciseInfo = workouts.find(w => w.id === workoutId);
        
        if (exerciseInfo) {
            document.getElementById('exerciseName').innerText = exerciseInfo.exercise;
            document.getElementById('exerciseDesc').innerText = `${exerciseInfo.category} - ${exerciseInfo.desc}`;
            document.getElementById('exerciseAnimation').innerHTML = `<img src="${exerciseInfo.animationUrl}" alt="${exerciseInfo.exercise}" style="width: 100%; height: auto; border:none; display: block; border-radius: 20px;">`;

            // Default steps
            const steps = [
                "Position yourself correctly at the station/area.",
                "Inhale and brace your core tightly.",
                "Execute the movement with control and full range of motion.",
                "Maintain focus on the target muscle group (the " + exerciseInfo.category + " in this case).",
                "Exhale on the concentric (effort) phase of the lift."
            ];

            const stepsContainer = document.getElementById('exerciseSteps');
            stepsContainer.innerHTML = steps.map((s, i) => `
                <div class="step-item">
                    <div class="step-num">${i + 1}</div>
                    <p>${s}</p>
                </div>
            `).join('');
        }
    }

    // Dynamic Loading for Workout Cards from localStorage
    if (window.location.pathname.includes('workouts.html')) {
        const userLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
        const container = document.getElementById('workoutsContainer');
        
        if (!userLoggedIn) {
            container.innerHTML = `
                <div style="text-align: center; padding: 5rem 0;">
                    <h2 style="font-size: 2.5rem; margin-bottom: 1.5rem;">Ready to <span>Go Pro?</span></h2>
                    <p style="color: var(--text-muted); font-size: 1.1rem; margin-bottom: 2rem;">Please login as a user to see workouts from your assigned trainer.</p>
                    <a href="user-login.html" class="nav-btn">User Login / Register</a>
                </div>
            `;
            return;
        }

        const assignedTrainerEmail = localStorage.getItem('userAssignedTrainer');
        const userName = localStorage.getItem('userName');
        
        // Fetch Trainer Name for better display
        let trainerName = assignedTrainerEmail;
        try {
            const tQ = query(collection(db, "trainers"), where("email", "==", assignedTrainerEmail));
            const tSnap = await getDocs(tQ);
            if (!tSnap.empty) {
                trainerName = tSnap.docs[0].data().name;
            }
        } catch (e) { console.error("Error fetching trainer name:", e); }

        // Fetch from Firestore (only workouts assigned specifically to this user)
        const q = query(collection(db, "workouts"), where("targetUser", "==", auth.currentUser.email));
        const querySnapshot = await getDocs(q);
        let filteredWorkouts = [];
        querySnapshot.forEach((doc) => {
            filteredWorkouts.push({ id: doc.id, ...doc.data() });
        });
        
        if (filteredWorkouts.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: var(--text-muted); padding: 5rem 0;">
                    Hello ${userName}! Your trainer <span style="color: var(--accent-color); font-weight:700;">${trainerName}</span> hasn't added any workouts yet.
                </p>
            `;
            return;
        }

        // Group by category
        const grouped = filteredWorkouts.reduce((acc, w) => {
            if (!acc[w.category]) acc[w.category] = [];
            acc[w.category].push(w);
            return acc;
        }, {});

        container.innerHTML = `<p style="text-align: center; margin-top: -30px; margin-bottom: 50px; color: var(--text-muted);">Showing Workouts from Trainer: <span style="color: var(--accent-color); font-weight: 700;">${trainerName}</span></p>` + 
        Object.keys(grouped).map(category => `
            <div class="category-wrapper" style="margin-bottom: 2rem;">
                <div class="category-card" onclick="toggleCategory(this)" style="background: var(--secondary-bg-color); padding: 2rem; border-radius: 15px; border: 1px solid rgba(255, 255, 255, 0.05); cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: var(--transition-speed);">
                    <h3 style="font-size: 1.8rem; color: var(--accent-color); margin: 0;">${category} <span>Section</span></h3>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="background: rgba(255, 215, 0, 0.1); color: var(--accent-color); padding: 0.3rem 1rem; border-radius: 50px; font-weight: 700; font-size: 0.9rem;">${grouped[category].length} Exercises</span>
                        <i class="fas fa-chevron-down toggle-icon" style="transition: transform 0.3s;"></i>
                    </div>
                </div>
                <div class="category-content" style="max-height: 0; overflow: hidden; transition: max-height 0.4s ease-out; padding: 0 1rem;">
                    <div class="workout-grid" style="margin-top: 2rem; padding-bottom: 2rem;">
                        ${grouped[category].map(w => `
                            <div class="day-card" style="padding: 1.5rem; background: rgba(255, 255, 255, 0.05);">
                                <div class="day-info" style="padding: 0;">
                                    <h3 style="color: var(--accent-color); font-size: 1.3rem;">${w.exercise}</h3>
                                    <p style="margin-top: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">${w.desc}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }
});

window.toggleMobileMenu = () => {
    const nav = document.querySelector('.nav-links');
    nav.classList.toggle('active');
};

function updateNavbar() {
    const navLinks = document.querySelector('.nav-links');
    const navBtn = document.querySelector('.nav-btn');
    
    const userLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
    const trainerLoggedIn = localStorage.getItem('trainerLoggedIn') === 'true';

    if (userLoggedIn) {
        if (navLinks) {
            navLinks.innerHTML = `
                <li><a href="index.html">Home</a></li>
                <li><a href="workouts.html">My Workouts</a></li>
                <li><a href="#" id="openProfile">Profile</a></li>
                <li class="mobile-only"><a href="#" id="userLogoutMobile" class="logout-link">Log Out</a></li>
            `;
        }
        if (navBtn) {
            navBtn.innerText = 'Log Out';
            navBtn.id = 'userLogout';
            navBtn.href = '#';
        }
    } else if (trainerLoggedIn) {
        if (navLinks) {
            navLinks.innerHTML = `
                <li><a href="index.html">Home</a></li>
                <li><a href="dashboard.html">Dashboard</a></li>
                <li><a href="#" id="openProfile">Profile</a></li>
                <li class="mobile-only"><a href="#" id="trainerLogoutMobile" class="logout-link">Log Out</a></li>
            `;
        }
        if (navBtn) {
            navBtn.innerText = 'Log Out';
            navBtn.id = 'trainerLogout';
            navBtn.href = '#';
        }
    } else {
        // Not logged in - default state (could keep as is or force a login link)
        if (navLinks) {
            navLinks.innerHTML = `
                <li><a href="index.html">Home</a></li>
                <li><a href="user-login.html">Workouts</a></li>
                <li><a href="login.html">Trainer Portal</a></li>
                <li class="mobile-only"><a href="user-login.html" class="nav-btn-mobile">Sign In</a></li>
            `;
        }
        if (navBtn) {
            navBtn.innerText = 'User Login';
            navBtn.href = 'user-login.html';
        }
    }

    const logoutElements = document.querySelectorAll('#userLogout, #trainerLogout, .logout-link');
    logoutElements.forEach(el => {
        el.addEventListener('click', async (e) => {
            e.preventDefault();
            const { signOut } = await import("https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js");
            await signOut(auth);
            localStorage.clear();
            window.location.href = 'index.html';
        });
    });
}

window.toggleCategory = function(card) {
    const wrapper = card.parentElement;
    const content = wrapper.querySelector('.category-content');
    const icon = card.querySelector('.toggle-icon');
    
    if (content.style.maxHeight === '0px' || !content.style.maxHeight) {
        content.style.maxHeight = content.scrollHeight + "px";
        icon.style.transform = "rotate(180deg)";
        card.style.borderColor = "var(--accent-color)";
    } else {
        content.style.maxHeight = "0";
        icon.style.transform = "rotate(0deg)";
        card.style.borderColor = "rgba(255, 255, 255, 0.05)";
    }
}

// Unified Profile Management functions
let currentProfileRole = 'user';

async function loadAnyProfile(email) {
    if (!document.getElementById('profileModal')) return;
    try {
        // Try User first
        const userQ = query(collection(db, "users"), where("email", "==", email));
        const userSnap = await getDocs(userQ);
        
        if (!userSnap.empty) {
            currentProfileRole = 'user';
            const data = userSnap.docs[0].data();
            document.getElementById('profileName').value = data.name || '';
            document.getElementById('profileEmail').innerText = data.email || '';
            document.getElementById('profileRole').innerText = 'User';
            
            const trainerField = document.getElementById('trainerField');
            if (trainerField) {
                trainerField.style.display = 'block';
                const trainerSelect = document.getElementById('profileTrainerSelect');
                if (trainerSelect) {
                    try {
                        const allTrainersSnap = await getDocs(collection(db, "trainers"));
                        let trainersHTML = '';
                        allTrainersSnap.forEach((tDoc) => {
                            const tData = tDoc.data();
                            trainersHTML += `<option value="${tData.email}" ${tData.email === data.trainer ? 'selected' : ''}>${tData.name}</option>`;
                        });
                        trainerSelect.innerHTML = trainersHTML || '<option value="">No trainers available</option>';
                    } catch (e) {
                        console.error("Error fetching trainers:", e);
                        trainerSelect.innerHTML = `<option value="${data.trainer || ''}" selected>${data.trainer || 'Current Trainer'}</option>`;
                    }
                }
            }
            return;
        }

        // Try Trainer
        const trainerQ = query(collection(db, "trainers"), where("email", "==", email));
        const trainerSnap = await getDocs(trainerQ);
        if (!trainerSnap.empty) {
            currentProfileRole = 'trainer';
            const data = trainerSnap.docs[0].data();
            document.getElementById('profileName').value = data.name || '';
            document.getElementById('profileEmail').innerText = data.email || '';
            document.getElementById('profileRole').innerText = 'Trainer';
            
            const trainerField = document.getElementById('trainerField');
            if (trainerField) trainerField.style.display = 'none';
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

async function updateUserProfile() {
    const newName = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').innerText;
    if (!newName) return alert("Name cannot be empty");

    const btn = document.getElementById('updateUserProfileBtn');
    const originalText = btn.innerText;
    btn.innerText = "Updating...";
    btn.disabled = true;

    try {
        const collectionName = currentProfileRole === 'trainer' ? "trainers" : "users";
        const q = query(collection(db, collectionName), where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const updateData = { name: newName };

            if (currentProfileRole === 'user') {
                const trainerSelect = document.getElementById('profileTrainerSelect');
                if (trainerSelect) {
                    updateData.trainer = trainerSelect.value;
                    localStorage.setItem('userAssignedTrainer', trainerSelect.value);
                }
            }

            await updateDoc(doc(db, collectionName, snap.docs[0].id), updateData);

            if (currentProfileRole === 'trainer') {
                localStorage.setItem('trainerName', newName);
            } else {
                localStorage.setItem('userName', newName);
                if (window.location.pathname.includes('workouts.html')) {
                    setTimeout(() => window.location.reload(), 1000);
                }
            }
            showToast("Profile updated successfully!");
        }
    } catch (error) {
        alert("Failed to update profile: " + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function deleteUserAccount() {
    const roleText = currentProfileRole === 'trainer' ? "your trainer account and ALL your workout plans" : "your account and training history";
    if (confirm(`WARNING: Are you sure you want to delete ${roleText}? This action is permanent.`)) {
        const email = document.getElementById('profileEmail').innerText;
        const btn = document.getElementById('deleteUserAccountBtn');
        btn.innerText = "Deleting...";
        btn.disabled = true;

        try {
            const collectionName = currentProfileRole === 'trainer' ? "trainers" : "users";
            
            // 1. If trainer, delete their workouts first
            if (currentProfileRole === 'trainer') {
                const wQ = query(collection(db, "workouts"), where("trainer", "==", email));
                const wSnap = await getDocs(wQ);
                for (const d of wSnap.docs) {
                    await deleteDoc(doc(db, "workouts", d.id));
                }
            }

            // 2. Delete user doc from Firestore
            const q = query(collection(db, collectionName), where("email", "==", email));
            const snap = await getDocs(q);
            if (!snap.empty) {
                await deleteDoc(doc(db, collectionName, snap.docs[0].id));
            }
            
            // 3. Delete Auth account
            const user = auth.currentUser;
            if (user) {
                await user.delete();
            }

            localStorage.clear();
            window.location.href = 'index.html';
        } catch (error) {
            console.error(error);
            alert("Account deletion failed. Sensitive actions often require a recent login session. Please logout and login again to delete your account.\n\nError: " + error.message);
            btn.innerText = "Delete Account";
            btn.disabled = false;
        }
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// Rest Timer Functionality
let timerTimeLeft = 30;
let timerRunning = false;
let timerInterval = null;

function initRestTimer() {
    const timerHtml = `
        <div id="restTimer" class="rest-timer-container">
            <div class="timer-header">
                <span>Rest Timer</span>
                <i class="fas fa-times" onclick="toggleTimer()" style="cursor: pointer; opacity: 0.7;"></i>
            </div>
            <div class="timer-display" id="timerDisplay">00:30</div>
            <div class="timer-presets">
                <button onclick="setTimer(30)">30s</button>
                <button onclick="setTimer(60)">60s</button>
                <button onclick="setTimer(90)">90s</button>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button id="timerToggleBtn" class="timer-main-btn" onclick="toggleStart()">Start</button>
                <button class="timer-reset-btn" onclick="resetTimer()">Reset</button>
            </div>
        </div>
        <div id="timerFab" class="timer-fab" onclick="toggleTimer()">
            <i class="fas fa-stopwatch"></i>
            <span style="margin-left: 8px; font-weight: 700; font-size: 0.9rem;">Rest Timer</span>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', timerHtml);
}

window.toggleTimer = () => {
    const timer = document.getElementById('restTimer');
    const fab = document.getElementById('timerFab');
    if (timer.classList.contains('active')) {
        timer.classList.remove('active');
        fab.style.display = 'flex';
    } else {
        timer.classList.add('active');
        fab.style.display = 'none';
    }
};

window.setTimer = (seconds) => {
    timerTimeLeft = seconds;
    updateTimerDisplay();
    if (timerRunning) stopTimer();
};

window.toggleStart = () => {
    if (timerRunning) {
        stopTimer();
    } else {
        startTimer();
    }
};

function startTimer() {
    if (timerTimeLeft <= 0) return;
    timerRunning = true;
    document.getElementById('timerToggleBtn').innerText = 'Pause';
    document.getElementById('timerToggleBtn').style.background = '#F44336';
    
    timerInterval = setInterval(() => {
        timerTimeLeft--;
        updateTimerDisplay();
        if (timerTimeLeft <= 0) {
            stopTimer();
            alert("Rest time over! Start your next set.");
        }
    }, 1000);
}

function stopTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    document.getElementById('timerToggleBtn').innerText = 'Start';
    document.getElementById('timerToggleBtn').style.background = 'var(--accent-color)';
}

window.resetTimer = () => {
    stopTimer();
    timerTimeLeft = 30;
    updateTimerDisplay();
};

function updateTimerDisplay() {
    const minutes = Math.floor(timerTimeLeft / 60);
    const seconds = timerTimeLeft % 60;
    document.getElementById('timerDisplay').innerText = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
