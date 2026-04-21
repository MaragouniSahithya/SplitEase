# SplitEase 💸

A full-stack expense splitting web app — track shared expenses, split bills multiple ways, manage group budgets, and settle debts with minimal transactions.

🔗 **Live Demo:** [split-ease-rust.vercel.app](https://split-ease-rust.vercel.app)

---

## Features

- **Group Management** — Create groups, invite members by email, accept/decline invitations
- **Flexible Expense Splitting** — 6 split modes: equal, only me, specific members, exact amounts, percentage, and weighted shares
- **Debt Simplification** — Greedy algorithm minimizes the number of transactions needed to settle all debts
- **Budget Tracking** — Set group budgets with period support (trip/monthly/weekly), per-category limits, and alert thresholds
- **Settlements** — Record payments and automatically mark related expense splits as paid
- **Expense Analytics** — Category breakdown, monthly trends, per-member spend stats
- **Magic Link Invites** — Invite users who aren't registered yet via a JWT-based invite link

---

## Tech Stack

**Frontend**
- React (Vite)
- Deployed on Vercel

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Deployed on Render / Railway

---

## Project Structure

```
SplitEase/
├── frontend/          # React app
└── backend/
    ├── models/
    │   ├── User.js
    │   ├── Group.js
    │   ├── Expense.js
    │   └── Settlement.js
    ├── routes/
    │   ├── auth.js
    │   ├── groups.js
    │   ├── expenses.js
    │   ├── budgets.js
    │   ├── settlements.js
    │   └── invitations.js
    ├── middleware/
    │   └── auth.js
    ├── utils/
    │   └── debtSimplifier.js
    └── server.js
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
MONGO_URI=mongodb://localhost:27017/expense-splitter
JWT_SECRET=your_secret_key
PORT=5000
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

Start the server:

```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## API Overview

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups` | Create a group |
| GET | `/api/groups` | List your groups |
| GET | `/api/groups/:id` | Group detail with simplified debts |
| PUT | `/api/groups/:id` | Update group (admin only) |
| DELETE | `/api/groups/:id` | Delete group (admin only) |
| DELETE | `/api/groups/:id/leave` | Leave a group |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/expenses` | Add an expense |
| GET | `/api/expenses` | List expenses with filters |
| GET | `/api/expenses/:id` | Single expense |
| PUT | `/api/expenses/:id` | Edit expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/expenses/balances/summary` | Who owes whom |
| GET | `/api/expenses/stats/breakdown` | Category / monthly / member stats |
| POST | `/api/expenses/:id/settle-split` | Mark your split as paid |

### Budgets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups/:id/budget` | Set group budget (admin only) |
| DELETE | `/api/groups/:id/budget` | Remove budget |
| GET | `/api/groups/:id/budget/progress` | Budget progress report |

### Settlements
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups/:id/settle` | Record a payment |
| POST | `/api/groups/:id/settle-all` | Settle all debts (admin only) |

### Invitations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invitations` | Your pending invites |
| POST | `/api/invitations/:id/respond` | Accept or decline |
| POST | `/api/groups/:id/invite` | Invite by email |
| GET | `/api/invite/verify/:token` | Verify magic link token |

---

## Split Modes

| Mode | Description |
|------|-------------|
| `equal` | Split evenly among all group members |
| `only_me` | Personal expense — only the payer owes it |
| `specific` | Only selected members split equally |
| `exact` | Specify exact amount per person |
| `percentage` | Specify % per person (must total 100) |
| `weighted` | Share units per person — e.g. `2:1:1` means one person pays 50% |

---

## Debt Simplification

The app uses a greedy algorithm to minimize settlement transactions:

1. Calculate each person's net balance (positive = owed money, negative = owes money)
2. Match the largest creditor with the largest debtor
3. Settle as much as possible in one transaction
4. Repeat until all balances are zero

This reduces N*(N-1) possible transactions down to at most N-1.

---

## Supported Currencies

INR, USD, EUR, GBP, AED, SGD, AUD, CAD

---

## License

MIT
