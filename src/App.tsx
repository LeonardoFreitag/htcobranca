
import { ThemeProvider } from "@mui/material/styles"; // Correção final
import { CssBaseline } from "@mui/material";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import SignIn from "./pages/SignIn";
import { theme } from "./theme";
import SideNav from "./components/SideNav";
import AccountsReceivable from "./pages/AccountsReceivable";
import Settings from "./pages/Settings";
import Clients from "./pages/Clients";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/*" element={<SignIn />} />
      </Routes>
    );
  }

  return (
    <SideNav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/accounts-receivable" element={<AccountsReceivable />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </SideNav>
  );
}

export default App;
