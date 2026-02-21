# Bulawayo PACS - City of Bulawayo Plan Approval System

Welcome to the **Bulawayo PACS** (Plan Approval & Control System). This system helps the City of Bulawayo move away from paper files to a completely digital workflow for approving building plans. It makes the process faster, more transparent, and easier for everyone involved.

## 🚀 What Does It Do?

Instead of carrying physical blueprints office-to-office, this system handles everything online:

1. **Submission**: Architects and property owners upload their plans from home.
2. **Reception Check**: Our reception team checks if the application is complete online.
3. **Department Review**: Plans are sent to all necessary departments (Water, Fire, Planning, etc.) **at the same time**. No more waiting for one department to finish before the next one starts.
4. **Final Approval**: Once all departments agree, the Director digitally signs and stamps the plan.

## 🌟 Key Features

### For the Public (Applicants)

- **Apply Online**: Submit building plans without visiting City Hall.
- **Track Progress**: See exactly where your plan is and who is reviewing it.
- **Download Approvals**: Get your stamped, approved plans instantly as PDF files.

### For City Staff

- **Digital Office**: Review plans on your computer or tablet.
- **Smart Routing**: The system knows which departments need to see a plan based on its type (e.g., a Factory plan is automatically sent to the Factories Inspector).
- **Automatic Status**: The system automatically updates the plan's status. If one department says "No", the plan is marked for corrections. If everyone says "Yes", it moves to approval.
- **Deadlines**: The system tracks how long reviews take to help speed up the process.

### Security

- **Secure Login**: Only authorized staff can access the system.
- **Digital Traditional Stamp**: Approved plans verified with a secure QR code and digital signature that cannot be faked.

## 🛠 For Developers: Installation & Setup

If you are a developer setting up this project, follow these steps:

### 1. Backend (The Brains)

The backend is built with Python and Django.

1. Navigate to the `backend/` folder.
2. Create a virtual environment and activate it.

    ```bash
    python -m venv venv
    # Windows: venv\Scripts\activate
    # Mac/Linux: source venv/bin/activate
    ```

3. Install the required tools:

    ```bash
    pip install -r requirements.txt
    pip install pymupdf qrcode[pil] django-cors-headers djangorestframework-simplejwt python-decouple
    ```

4. Set up the database:

    ```bash
    python manage.py migrate
    ```

5. Start the system:

    ```bash
    python manage.py runserver
    ```

### 2. Frontend (The Website)

The frontend is built with React.

1. Go back to the main folder.
2. Install the tools:

    ```bash
    npm install
    ```

3. Start the website:

    ```bash
    npm run dev
    ```

## 📜 Project Status

We have completed:

- ✅ **User Accounts**: Providing secure access for Staff and Public.
- ✅ **Reception Gateway**: Allowing receptionists to check new applications.
- ✅ **Smart Reviews**: The system now automatically creates review tasks for departments and tracks their decisions.
- ✅ **Search**: A full archive to search for past plans.

Coming next:

- **Time Tracking**: Alerts when reviews are taking too long.
- **Digital Signature**: The final electronic stamp on the PDF.

---
*Built for the City of Bulawayo.*
