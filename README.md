# Vending Machine

A modern, interactive vending machine application built with React, TypeScript, and Tailwind CSS. Features a kiosk-like user experience with cash and card payment options, inventory management, and transaction history.

## Features

- 🥤 **Product Selection**: Browse and select from available drinks
- 💵 **Payment Options**: Support for both cash and card payments
- 📊 **Inventory Management**: Admin panel for stock management
- 📜 **Transaction History**: View all completed transactions
- 🎨 **Modern UI**: Responsive design optimized for mobile and LCD screens
- ⚡ **Real-time Updates**: Live inventory and transaction tracking

## Flow Diagram

View the complete user journey and machine state transitions:
- [Interactive Flow Diagram](https://mermaidviewer.com/share/a4_Sts2Qky5ERkxejceNn)
- [Local Diagram File](./diagram.md)

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn package manager

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The application will start on `http://localhost:5173` (or the next available port).

### 3. Build for Production

```bash
npm run build
```

This will create an optimized production build in the `dist` directory.

### 4. Preview Production Build

```bash
npm run preview
```

## Available Scripts

- `npm run dev` – Start the Vite development server with hot module replacement
- `npm run build` – Type-check TypeScript and create an optimized production build
- `npm run preview` – Preview the production build locally
- `npm run lint` – Run ESLint to check code quality
- `npm run test` – Execute Vitest unit tests

## Project Structure

```
vending-machine/
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components (shadcn/ui)
│   ├── data/            # Static data (drinks, inventory)
│   ├── services/        # Business logic (inventory, payment, change)
│   ├── state/           # State management (vending machine logic)
│   ├── types/           # TypeScript type definitions
│   └── App.tsx         # Main application component
├── docs/               # Documentation and diagrams
└── public/             # Static assets
```

## Usage

### Customer Flow

1. **Select a Drink**: Click on any available drink from the product grid
2. **Choose Payment Method**: Select either cash or card payment
3. **Complete Payment**:
   - **Cash**: Insert bills (₩1000, ₩5000, ₩10000)
   - **Card**: Tap the "Tap card to authorize" button
4. **Receive Drink**: Wait for dispensing and collect your drink
5. **Get Change**: If paying with cash and change is due, it will be returned automatically

### Admin Panel

Access the admin panel by clicking the "Admin" button in the footer:

- **Stock Management**: Set stock levels for each drink
- **Transaction History**: View all completed transactions with filters

## Technology Stack

- **Framework**: React 18 + TypeScript 5
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3.4 with shadcn/ui components
- **State Management**: React Hooks (useReducer, useState)
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint (flat config)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development Notes

- The application uses React StrictMode in development, which may cause components to mount twice
- Inventory state persists across component remounts using React refs
- Payment processing is simulated (no actual payment gateway integration)

## License

This project is for educational/demonstration purposes.
