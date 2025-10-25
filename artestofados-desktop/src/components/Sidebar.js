import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <h1>ARTESTOFADOS</h1>
          <p>FOR HOME</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink 
          to="/chatbot" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <span className="nav-icon">💬</span>
          <span className="nav-text">Chatbot WhatsApp</span>
        </NavLink>

        <NavLink 
          to="/gerar-os" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <span className="nav-icon">📝</span>
          <span className="nav-text">Gerar OS</span>
        </NavLink>

        <NavLink 
          to="/banco-os" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <span className="nav-icon">📁</span>
          <span className="nav-text">Banco de OS</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <p>© 2025 Artestofados</p>
      </div>
    </aside>
  );
};

export default Sidebar;