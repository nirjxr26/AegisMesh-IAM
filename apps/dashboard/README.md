# AegisMesh Frontend

The AegisMesh administrative dashboard built with **React 19** and **Vite**.

## Tech Stack
- **Framework:** React 19.2.0
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State:** React Context API + Custom Hooks
- **Icons:** Lucide React

## Getting Started

### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000

### Production Build
```bash
npm run build
npm run preview
```

## Project Structure
- `src/components/`: Reusable UI components (Modals, Tables, Forms).
- `src/pages/`: Main views (Dashboard, User Management, Policy Editor).
- `src/context/`: Auth and Theme context providers.
- `src/hooks/`: Custom hooks for API interaction and form handling.

## Security Features
- **CSRF Protection:** Integrated with the backend's `csurf` middleware.
- **Secure Cookies:** JWT access tokens are handled via HttpOnly/Secure cookies.
- **Route Guards:** Private routes are protected by the `AuthContext`.

---
For the underlying API specifications, see the [Main Documentation Portal](../../docs/README.md).
