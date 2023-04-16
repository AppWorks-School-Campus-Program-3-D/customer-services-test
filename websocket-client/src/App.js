import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Client from './pages/Client';
import ManagerDashboard from './pages/ManagerDashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Client />} />
          <Route path="/manager" element={<ManagerDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
