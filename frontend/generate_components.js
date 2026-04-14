import fs from 'fs';
import path from 'path';

const componentsDirs = ['components', 'pages'];
componentsDirs.forEach(dir => fs.mkdirSync(path.join('src', dir), { recursive: true }));

const components = [
  'components/ProtectedRoute.jsx',
  'components/Layout.jsx',
  'components/Sidebar.jsx',
  'components/TopBar.jsx',
  'components/AmountBadge.jsx',
  'components/EmptyState.jsx',
  'components/LoadingSpinner.jsx',
  'components/ConfirmModal.jsx',
];

const pages = [
  'pages/LandingPage.jsx',
  'pages/LoginPage.jsx',
  'pages/RegisterPage.jsx',
  'pages/OnboardingPage.jsx',
  'pages/DashboardPage.jsx',
  'pages/GroupListPage.jsx',
  'pages/GroupDetailPage.jsx',
  'pages/ExpensesPage.jsx',
  'pages/AddExpensePage.jsx',
  'pages/BalancesPage.jsx',
  'pages/InvitationsPage.jsx',
  'pages/BudgetPage.jsx',
  'pages/SettlementsPage.jsx',
  'pages/ProfilePage.jsx',
];

[...components, ...pages].forEach(file => {
  const name = path.basename(file, '.jsx');
  const code = `import React from 'react';\n\nconst ${name} = () => {\n  return (\n    <div>${name}</div>\n  );\n};\n\nexport default ${name};\n`;
  fs.writeFileSync(path.join('src', file), code);
});
