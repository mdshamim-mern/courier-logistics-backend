# 📦 Courier Logistics Backend API

A robust, highly scalable, and secure backend REST API for a Courier and Logistics management system. Built with modern web technologies, it features role-based access control, shipment tracking, real-time hub management, secure file uploads, and automated payment gateway integration.

## 🚀 Live URL
**Base URL:** `https://courier-logistics-backend-lake.vercel.app/api/v1`

### 🔑 Test Credentials
You can use the following credentials to test the application:

**Admin User:**
- Email: `admin@courier.com`
- Password: `Admin@12345`

**Customer User:**
- Email: `shamimsagor5.00@gmail.com`
- Password: `Password@1234`

---

## 🛠️ Tech Stack & Technologies
- **Runtime:** Node.js
- **Framework:** Express.js (TypeScript)
- **Database:** PostgreSQL (Neon DB)
- **ORM:** Prisma
- **Authentication:** JSON Web Token (JWT) & bcryptjs
- **File Upload:** Multer & Cloudinary Integration
- **Payment Gateway:** bKash API Sandbox
- **Deployment:** Vercel (Serverless)

---

## ✨ Key Features
- **Role-Based Access Control (RBAC):** Secure authentication and authorization for Admin, Courier, and Customer roles.
- **Shipment Management:** End-to-end parcel tracking, courier assignment, and status updates (Pending, In Transit, Delivered).
- **Hub Operations:** Full CRUD operations to manage local courier hubs.
- **Media Uploads:** Serverless profile picture and shipment image uploads via Cloudinary.
- **Automated Payments:** bKash sandbox integration for seamless payment initialization and history tracking.
- **Audit & Admin Dashboard:** Real-time dashboard statistics and comprehensive audit logs for system transparency.

---

## 📡 API Endpoints Overview

Here is a summary of the available routes. Note: Most routes require a `Bearer Token` for authorization.

### Auth & Users
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Login to the system | Public |
| `POST` | `/auth/register` | Register a new customer | Public |
| `POST` | `/auth/verify-email` | Verify OTP sent to email | Public |
| `GET` | `/users/me` | Get logged-in user profile | Authenticated |
| `PATCH` | `/users/profile-image` | Upload/Update profile picture | Authenticated |

### Hubs Management
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/hubs` | Create a new hub | Admin |
| `GET` | `/hubs` | Retrieve all hubs | Authenticated |
| `GET` | `/hubs/:id` | Get details of a specific hub | Authenticated |
| `PATCH` | `/hubs/:id` | Update hub information | Admin |
| `DELETE`| `/hubs/:id` | Delete a hub | Admin |

### Shipments
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/shipments` | Create a new shipment | Customer |
| `GET` | `/shipments` | Get all shipments | Authenticated |
| `PATCH` | `/shipments/:id/assign` | Assign a courier to a shipment | Admin |
| `PATCH` | `/shipments/:id/status` | Update delivery status | Courier/Admin |

### Payments
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/payments/initiate` | Initiate a bKash payment | Customer |
| `GET` | `/payments` | Get user payment history | Authenticated |

### Admin & Audit Logs
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/dashboard-stats` | Get application statistics | Admin |
| `GET` | `/admin/users` | Retrieve all registered users | Admin |
| `PATCH` | `/admin/users/:id/status`| Block or unblock a user | Admin |
| `GET` | `/audit-logs` | Retrieve system action logs | Admin |

---

## 💻 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database URL
- Cloudinary Account details
- bKash Sandbox credentials

### Installation Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/mdshamim-mern/courier-logistics-backend.git](https://github.com/mdshamim-mern/courier-logistics-backend.git)
   cd courier-logistics-backend

1.Install dependencies:

npm install
# or
bun install

2.Set up Environment Variables:
Create a .env file in the root directory and add your credentials:

Code snippet
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"
JWT_ACCESS_SECRET="your_secret_key"
JWT_ACCESS_EXPIRES_IN="1d"
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
BKASH_APP_KEY="your_bkash_key"
BKASH_APP_SECRET="your_bkash_secret"

3.Generate Prisma Client & Push Schema:

npx prisma generate
npx prisma db push

4.Start the server:

npm run dev
The API will be available at http://localhost:5000/api/v1

Developed with ❤️ by Md Shamim.