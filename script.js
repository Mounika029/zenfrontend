let activeSessionUser = null;

// Global API Endpoint Base URL
const BASE_URL = "https://zenbackend-kj42.onrender.com";

function switchPortalView(viewElementId) {
    document.querySelectorAll('.view-section').forEach(b => b.classList.remove('active'));
    const target = document.getElementById(viewElementId);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showTelemetry() {
    switchPortalView("frontpageView");
    document.getElementById("telemetrySection").scrollIntoView({
        behavior: "smooth"
    });
}

async function triggerMockRegister(e) {
    e.preventDefault();

    const fn = document.getElementById("regFullname").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const role = document.getElementById("regRole").value;
    const nameError = document.getElementById("fullnameError");

    if (fn.length < 3 || fn.length > 20) {
        nameError.style.display = "block";
        return;
    } else {
        nameError.style.display = "none";
    }

    const user = {
        fullname: fn,
        email: email,
        password: password,
        role: role
    };

    try {
        const response = await fetch(`${BASE_URL}/user/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(user)
        });

        const data = await response.json();

        if (response.ok) {
            alert("Registration Successful!");
            document.getElementById("backendRegisterForm").reset();
            document.getElementById("loginEmail").value = email;
            switchPortalView("loginPortalView");
        } else {
            alert(data.message || "An error occurred during registration.");
        }
    } catch (error) {
        alert("Cannot connect to Spring Boot Server.");
        console.error(error);
    }
}

async function triggerMockLogin(e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const btn = document.getElementById("loginActionButton");

    btn.innerText = "Logging in...";
    btn.disabled = true;

    try {
        const response = await fetch(`${BASE_URL}/user/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || "Login successful!");
            
            // Save JWT Token
            localStorage.setItem("token", data.token);
            localStorage.setItem("email", email);

            // Fetch active user details via token auth pipeline
            const userResponse = await fetch(`${BASE_URL}/user/email/${email}`, {
                headers: {
                    "Authorization": "Bearer " + data.token
                }
            });

            const user = await userResponse.json();
            activeSessionUser = user;

            // Update UI components with session state objects
            document.getElementById("userWelcomeBanner").innerText = `Welcome, ${user.fullname}!`;
            document.getElementById("userNameRoleTag").innerText = `${user.fullname} (${user.role})`;
            document.getElementById("userInitialBubble").innerText = user.fullname.charAt(0).toUpperCase();
            document.getElementById("dashMinutes").innerText = user.minutes;
            document.getElementById("dashStreak").innerText = user.currentstreak;

            document.getElementById("portalPublicWrapper").style.display = "none";
            document.getElementById("portalApplicationDashboardShell").style.display = "block";
            document.getElementById("backendLoginForm").reset();
        } else {
            alert(data.message || "Invalid credentials.");
        }
    } catch (error) {
        alert("Cannot connect to Spring Boot.");
        console.error(error);
    } finally {
        btn.innerText = "Login";
        btn.disabled = false;
    }
}
       
async function completeMeditation() {
    if (!activeSessionUser) {
        alert("No active session user found.");
        return;
    }

    console.log("Current User Objects: ", activeSessionUser);
    const token = localStorage.getItem("token");

    activeSessionUser.minutes += 10;
    activeSessionUser.currentstreak += 1;

    try {
        const response = await fetch(`${BASE_URL}/user/patch/${activeSessionUser.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                minutes: activeSessionUser.minutes,
                currentstreak: activeSessionUser.currentstreak
            })
        });

        console.log("Status:", response.status);
        
        if (response.ok) {
            document.getElementById("dashMinutes").innerText = activeSessionUser.minutes;
            document.getElementById("dashStreak").innerText = activeSessionUser.currentstreak;
            alert("Meditation Completed!");
        } else {
            alert("Unable to update progress.");
        }
    } catch(err) {
        alert("Network update failure.");
        console.error(err);
    }
}

function executePlatformSignout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    activeSessionUser = null;

    document.getElementById("portalApplicationDashboardShell").style.display = "none";
    document.getElementById("portalPublicWrapper").style.display = "block";
    switchPortalView("frontpageView"); // Redirect to frontpage instead of login screen on signout
    alert("Logged out successfully.");
}

// Runtime check constraints on DOM load event
window.addEventListener("load", function () {
    // If user doesn't have a token, keep them on the public wrapper and ensure frontpage is shown
    if (!localStorage.getItem("token")) {
        document.getElementById("portalApplicationDashboardShell").style.display = "none";
        document.getElementById("portalPublicWrapper").style.display = "block";
        switchPortalView("frontpageView"); // Sets default fallback view straight to home/frontpage
    } else {
        // Optional path: If they DO have a token, you could automatically trigger their login dashboard setup here.
        // For now, it leaves the public site active unless they interactively hit login.
        switchPortalView("frontpageView");
    }
});
