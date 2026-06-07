import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Home } from './pages/Home';
import { Collections } from './pages/Collections';
import { CollectionDetail } from './pages/CollectionDetail';
import { Shelves } from './pages/Shelves';
import { PublicCollection } from './pages/PublicCollection';
import { PublicWishlist } from './pages/PublicWishlist';
import { Wishlists } from './pages/Wishlists';
import { WishlistDetail } from './pages/WishlistDetail';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Welcome } from './pages/Welcome';
import { useAuth } from './auth/AuthContext';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {user && <Navbar />}
      <main>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignUp />} />
          <Route path="/" element={user ? <Home /> : <Welcome />} />
          <Route
            path="/collections"
            element={
              <ProtectedRoute>
                <Collections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collections/:id"
            element={
              <ProtectedRoute>
                <CollectionDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collections/:id/shelves"
            element={
              <ProtectedRoute>
                <Shelves />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlists"
            element={
              <ProtectedRoute>
                <Wishlists />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlists/:id"
            element={
              <ProtectedRoute>
                <WishlistDetail />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/p/:id" element={<PublicCollection />} />
        <Route path="/pw/:id" element={<PublicWishlist />} />
        <Route path="*" element={<AppRoutes />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
}

export default App;
