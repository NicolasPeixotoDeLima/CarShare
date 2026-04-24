import { Routes, Route, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { Fleet } from './pages/Fleet';
import { CarDetail } from './pages/CarDetail';
import { Login } from './pages/Login';
import { Checkout } from './pages/Checkout';
import { Success } from './pages/Success';
import { Profile } from './pages/Profile';
import { Help } from './pages/Help';
import { NotFound } from './pages/NotFound';

import { Bookings as CustomerBookings } from './pages/customer/Bookings';
import { Invoices as CustomerInvoices } from './pages/customer/Invoices';
import { Favorites as CustomerFavorites } from './pages/customer/Favorites';
import { Account }                     from './pages/customer/Account';

import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { OwnerCars }      from './pages/owner/OwnerCars';
import { OwnerCarForm }   from './pages/owner/OwnerCarForm';
import { OwnerBookings }  from './pages/owner/OwnerBookings';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers }     from './pages/admin/AdminUsers';
import { AdminCars }      from './pages/admin/AdminCars';
import { AdminBookings }  from './pages/admin/AdminBookings';
import { AdminInvoices }  from './pages/admin/AdminInvoices';

export function App() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-transition">
    <Routes>
      {/* Público */}
      <Route path="/"         element={<Home />} />
      <Route path="/fleet"    element={<Fleet />} />
      <Route path="/car"      element={<CarDetail />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/help"     element={<Help />} />

      {/* Auth (qualquer logado) */}
      <Route path="/checkout"  element={<Checkout />} />
      <Route path="/success"   element={<Success />} />
      <Route path="/profile"   element={<Profile />} />
      <Route path="/bookings"  element={<CustomerBookings />} />
      <Route path="/invoices"  element={<CustomerInvoices />} />
      <Route path="/favorites" element={<CustomerFavorites />} />
      <Route path="/account"   element={<Account />} />

      {/* Proprietário (gated no layout) */}
      <Route path="/owner"               element={<OwnerDashboard />} />
      <Route path="/owner/cars"          element={<OwnerCars />} />
      <Route path="/owner/cars/new"      element={<OwnerCarForm />} />
      <Route path="/owner/cars/:id/edit" element={<OwnerCarForm />} />
      <Route path="/owner/bookings"      element={<OwnerBookings />} />

      {/* Admin (gated no layout) */}
      <Route path="/admin"          element={<AdminDashboard />} />
      <Route path="/admin/users"    element={<AdminUsers />} />
      <Route path="/admin/cars"     element={<AdminCars />} />
      <Route path="/admin/bookings" element={<AdminBookings />} />
      <Route path="/admin/invoices" element={<AdminInvoices />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
    </div>
  );
}
