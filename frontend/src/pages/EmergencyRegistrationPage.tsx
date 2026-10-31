import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, MapPin, Stethoscope, FileText, CheckCircle2,
  Navigation, AlertTriangle, ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { EmergencyCreate } from '../types';

export const EmergencyRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [patientName, setPatientName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<number>(45);
  const [patientGender, setPatientGender] = useState<string>('Male');
  const [patientCount, setPatientCount] = useState<number>(1);

  const [emergencyType, setEmergencyType] = useState<string>('Cardiac');
  const [reportedSeverity, setReportedSeverity] = useState<string>('Critical');
  const [symptoms, setSymptoms] = useState<string>('Acute retrosternal chest pain, radiating to left arm, difficulty breathing, sweating');
  const [additionalNotes, setAdditionalNotes] = useState<string>('Patient collapsed at office premises. Bystander CPR initiated.');

  const [address, setAddress] = useState<string>('Brigade Gateway, Rajajinagar, Bengaluru, Karnataka');
  const [latitude, setLatitude] = useState<number>(13.0112);
  const [longitude, setLongitude] = useState<number>(77.5552);

  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(['ALS', 'Cardiac']);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['Defibrillator', 'ECG', 'Oxygen', 'Patient Monitor']);

  const emergencyTypes = [
    'Cardiac', 'Trauma', 'Road Accident', 'Stroke', 'Respiratory',
    'Severe Bleeding', 'Burns', 'Unconscious', 'Seizure', 'Pregnancy',
    'Pediatric', 'Other'
  ];

  const availableCapabilities = [
    'BLS', 'ALS', 'Cardiac', 'Trauma', 'Critical Care',
    'Respiratory', 'Neonatal', 'Pediatric'
  ];

  const availableEquipment = [
    'Oxygen', 'Defibrillator', 'ECG', 'Ventilator', 'Suction',
    'Patient Monitor', 'Trauma Kit', 'ALS Kit'
  ];

  const toggleCapability = (cap: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]
    );
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(6)));
          setLongitude(Number(pos.coords.longitude.toFixed(6)));
          setAddress(`Current GPS Coordinates: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        (err) => {
          alert(`Geolocation unavailable: ${err.message}. Using default Bengaluru coordinates.`);
        }
      );
    } else {
      alert('Browser geolocation is not supported.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientName.trim()) {
      setError('Patient name or designation is required.');
      return;
    }
    if (!symptoms.trim()) {
      setError('Clinical symptoms description is required.');
      return;
    }
    if (!address.trim()) {
      setError('Emergency scene address is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: EmergencyCreate = {
        patient_name: patientName,
        patient_age: Number(patientAge),
        patient_gender: patientGender,
        patient_count: Number(patientCount),
        emergency_type: emergencyType,
        reported_severity: reportedSeverity,
        symptoms,
        additional_notes: additionalNotes,
        address,
        latitude,
        longitude,
        required_capabilities: selectedCapabilities,
        required_equipment: selectedEquipment,
        is_demo: 0,
      };

      const newEmergency = await api.registerEmergency(payload);
      // Immediately navigate to Allocation Page to start the workflow! (Section 7)
      navigate(`/allocation/${newEmergency.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to register emergency');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-red-500" />
          <span>EMERGENCY INTAKE & TRIAGE REGISTRATION</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Register emergency intake call. The explainable priority engine and hybrid allocation workflow will start immediately.
        </p>
      </div>

      {error && (
        <div className="bg-red-950/80 border border-red-700 text-red-200 p-4 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Patient Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">
            <FileText className="h-4 w-4 text-sky-400" />
            <span>PATIENT & CASUALTY INFORMATION</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Patient Name / Identification *
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Anand Varma (or Unidentified Male)"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Age (Years) *</label>
              <input
                type="number"
                min="0"
                max="120"
                value={patientAge}
                onChange={(e) => setPatientAge(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Gender *</label>
              <select
                value={patientGender}
                onChange={(e) => setPatientGender(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other / Unknown</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Total Patients / Casualties Involved
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={patientCount}
                onChange={(e) => setPatientCount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reported Severity *</label>
              <select
                value={reportedSeverity}
                onChange={(e) => setReportedSeverity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-bold text-red-400"
              >
                <option value="Critical">Critical &mdash; Imminent Life Threat</option>
                <option value="High">High &mdash; Severe Emergency</option>
                <option value="Moderate">Moderate &mdash; Urgent Medical Evaluation</option>
                <option value="Low">Low &mdash; Non-urgent / Stable</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Emergency Clinical Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">
            <Stethoscope className="h-4 w-4 text-red-400" />
            <span>CLINICAL PRESENTATION & SYMPTOMS</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Emergency Category *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {emergencyTypes.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setEmergencyType(type)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all ${
                    emergencyType === type
                      ? 'bg-red-600 border-red-400 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reported Symptoms *</label>
            <textarea
              rows={2}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. Severe chest pain, unconsciousness, severe hemorrhage, respiratory arrest..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Additional Operational Notes</label>
            <textarea
              rows={2}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Caller contact info, floor access, elevator status, hazards on scene..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* 3. Location */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <MapPin className="h-4 w-4 text-emerald-400" />
              <span>SCENE LOCATION & GEOLOCATION</span>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-semibold transition-all"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Get Browser GPS</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Street Address / Landmark *</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Sony World Junction, 80 Feet Rd, Koramangala, Bengaluru"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>
        </div>

        {/* 4. Required Capabilities & Equipment */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">
            <CheckCircle2 className="h-4 w-4 text-purple-400" />
            <span>REQUIRED CAPABILITIES & EQUIPMENT PROTOCOLS</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Required Life-Support Capabilities</label>
            <div className="flex flex-wrap gap-2">
              {availableCapabilities.map((cap) => {
                const active = selectedCapabilities.includes(cap);
                return (
                  <button
                    type="button"
                    key={cap}
                    onClick={() => toggleCapability(cap)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-purple-950/80 border-purple-500 text-purple-300 ring-1 ring-purple-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {cap} {active && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Required Onboard Equipment</label>
            <div className="flex flex-wrap gap-2">
              {availableEquipment.map((eq) => {
                const active = selectedEquipment.includes(eq);
                return (
                  <button
                    type="button"
                    key={eq}
                    onClick={() => toggleEquipment(eq)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-sky-950/80 border-sky-500 text-sky-300 ring-1 ring-sky-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {eq} {active && '✓'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-xl shadow-red-900/40 transition-all disabled:opacity-50"
          >
            <span>{submitting ? 'CALCULATING PRIORITY & CANDIDATES...' : 'REGISTER EMERGENCY & BEGIN ALLOCATION'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
