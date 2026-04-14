import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import GroupListPage from './pages/GroupListPage';
import GroupDetailPage from './pages/GroupDetailPage';
import ExpensesPage from './pages/ExpensesPage';
import AddExpensePage from './pages/AddExpensePage';
import BalancesPage from './pages/BalancesPage';
import InvitationsPage from './pages/InvitationsPage';
import BudgetPage from './pages/BudgetPage';
import SettlementsPage from './pages/SettlementsPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Onboarding - protected but outside standard layout */}
      <Route 
        path="/onboarding" 
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        } 
      />

      {/* Protected Routes with Main Layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/groups" element={<GroupListPage />} />
        <Route path="/groups/:id" element={<GroupDetailPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/add" element={<AddExpensePage />} />
        <Route path="/balances" element={<BalancesPage />} />
        <Route path="/invitations" element={<InvitationsPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/settlements" element={<SettlementsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}

export default App;
