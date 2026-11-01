import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Landing from './Pages/Landing';

import Login from "./Pages/login";
import Register from "./Pages/register";
import AddDevice from './Pages/addDevice';
import LiveData from './Pages/liveData';
import Plant from './Pages/plant';
import DailyHistory from './Pages/dailyHistory';
import Forecast from './Pages/forecast';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Sync auth from query params if embedded in iframe
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const email = urlParams.get('email');
if (token) localStorage.setItem('token', token);
if (email) localStorage.setItem('userEmail', email);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<App />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/add-device" element={<AddDevice />} />
        <Route path="/live-data" element={<LiveData />} />
        <Route path="/plant" element={<Plant />} />
        <Route path="/daily-history" element={<DailyHistory />} />
        <Route path="/forecast" element={<Forecast />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
