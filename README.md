# KHELLO KARACHI ⚡️

![Khello Karachi Hero](https://via.placeholder.com/1000x300/1A1A1A/007BFF?text=KHELLO+KARACHI)

**Karachi's first unified platform to reserve sports grounds and challenge local teams.**

## 📖 About The Platform

Organizing a grassroots sports match is currently a broken experience—requiring endless phone calls to turf managers, tracking down players who drop out, and dealing with double-booked venues. 

**Khello Karachi** solves this by centralizing facility management and peer-to-peer matchmaking into a single, high-performance web application. Built on the MERN stack, it serves as a two-sided marketplace connecting sports enthusiasts (Futsal, Padel, Cricket) with premium local facilities.

---

## 👥 The Ecosystem (User Profiles)

The platform is built around three distinct user roles, each with isolated dashboards and tailored functionalities.

### 1. The Player (User)
The core driver of the platform. Players can browse available facilities, book time slots, and engage in the local sports community.
* **Match History & Stats:** Players have profiles tracking their "Matches Played," "Win Rates," and "No-Shows."
* **Host or Challenge:** Users can book a court and list it on the matchmaking feed, waiting for rival squads to challenge them.

### 2. The Facility Manager
The supply side of the marketplace. Managers are provided with operational tools to run their business smoothly.
* **Inventory Control:** Managers can list their courts, set pricing, and upload high-quality gallery images (powered by Cloudinary).
* **Booking Queues:** A streamlined dashboard to approve or reject pending reservations in real-time.
* **Revenue Tracking:** Visual overviews of total bookings and generated revenue for the month.

### 3. The Super Admin
The platform overseer. Admins maintain the integrity of the marketplace and handle conflict resolution.
* **Dispute Management:** Access to the "Active Disputes" queue to mediate issues between Players and Managers regarding payments.
* **Platform Health:** Oversight of all users, facilities, and active matches.

---

## ✨ Core Technical Features

### 🏟️ Smart Court Booking
* Real-time availability tracking for multiple sports.
* Dynamic UI for filtering venues by location, sport, and date.
* Seamless media integration allowing up to 5 high-res images per court, delivered via Cloudinary CDN for lightning-fast load times.

### 🤝 Peer-to-Peer Matchmaking
* A centralized feed where teams can post open challenges.
* Advanced matchmaking attributes (e.g., skill level, opponent squad size) to ensure competitive, balanced games.

### 📧 Automated Email Notifications & Authentication
* **Secure Mail Auth:** User registration is secured with email verification to ensure a trusted community.
* **Transactional Alerts:** Powered by Nodemailer, the system dispatches real-time email notifications to both Players and Managers for critical events (e.g., "Booking Pending," "Slot Approved," "Match Challenged").

### 🛡️ The Accountability Engine (Complex State Machine)
Because the platform relies on manual external bank transfers (like EasyPaisa or IBFT) for advance payments, Khello features a highly complex, multi-step state machine to guarantee accountability:
1. **Pending:** User books and inputs their Transaction ID (TID). System emails the manager.
2. **Manager Rejection & Handoff:** If rejected, the manager is prompted via UI to process a refund. The user receives an email prompting them to input their bank details securely on the app.
3. **Refund Claimed (WhatsApp Handoff):** The manager submits the return TID and clicks a dynamically generated WhatsApp link to send the receipt directly to the user.
4. **Verification & Dispute:** The user must verify receipt of funds. If they deny it, the booking locks into a `Disputed` state and is automatically escalated to the Super Admin.

---

## 🛠 Tech Stack

Built for speed, scalability, and exceptional user experience using a modern JavaScript architecture.

* **Frontend:** React.js (Vite), Tailwind CSS, Axios
* **Backend:** Node.js, Express.js
* **Database:** MongoDB Atlas, Mongoose
* **Communications:** Nodemailer (SMTP Email Engine)
* **Media & Storage:** Cloudinary, Multer
* **Authentication:** JSON Web Tokens (JWT), Bcrypt
