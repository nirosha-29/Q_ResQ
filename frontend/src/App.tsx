import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { EmergencyRegistrationPage } from './pages/EmergencyRegistrationPage'
import EmergenciesListPage from './pages/EmergenciesListPage'
import EmergencyDetailPage from './pages/EmergencyDetailPage'
import { AllocationPage } from './pages/AllocationPage'
import AmbulancesPage from './pages/AmbulancesPage'
import AmbulanceDetailPage from './pages/AmbulanceDetailPage'
import HospitalsPage from './pages/HospitalsPage'
import HospitalDetailPage from './pages/HospitalDetailPage'
import OptimizationPage from './pages/OptimizationPage'
import QuantumLabPage from './pages/QuantumLabPage'
import BenchmarkPage from './pages/BenchmarkPage'
import DispatchesPage from './pages/DispatchesPage'
import DataSourcesPage from './pages/DataSourcesPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="emergencies" element={<EmergenciesListPage />} />
          <Route path="emergencies/new" element={<EmergencyRegistrationPage />} />
          <Route path="emergencies/:id" element={<EmergencyDetailPage />} />
          <Route path="allocation/:id" element={<AllocationPage />} />
          <Route path="ambulances" element={<AmbulancesPage />} />
          <Route path="ambulances/:id" element={<AmbulanceDetailPage />} />
          <Route path="hospitals" element={<HospitalsPage />} />
          <Route path="hospitals/:id" element={<HospitalDetailPage />} />
          <Route path="optimization" element={<OptimizationPage />} />
          <Route path="quantum" element={<QuantumLabPage />} />
          <Route path="benchmark" element={<BenchmarkPage />} />
          <Route path="dispatches" element={<DispatchesPage />} />
          <Route path="data-sources" element={<DataSourcesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
