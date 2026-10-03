import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Verify from "./pages/Verify";
import HowItWorks from "./pages/HowItWorks";
import History from "./pages/History";
import ArchitectureDiagram from "./components/ArchitectureDiagram";
import "./App.css";

export default function App() {
  const [activePage, setActivePage] = useState("home");
  const [demoRequested, setDemoRequested] = useState(false);

  const handleStartDemo = () => {
    setDemoRequested(true);
    setActivePage("verify");
  };

  return (
    <div className="app-shell">
      {/* Top Navigation */}
      <Navbar
        activePage={activePage}
        setActivePage={(page) => {
          setActivePage(page);
          if (page !== "verify") setDemoRequested(false);
        }}
        onStartDemo={handleStartDemo}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activePage === "home" && (
          <Home setActivePage={setActivePage} onStartDemo={handleStartDemo} />
        )}

        {activePage === "verify" && (
          <Verify prefillDemo={demoRequested} />
        )}

        {activePage === "how-it-works" && (
          <HowItWorks setActivePage={setActivePage} />
        )}

        {activePage === "architecture" && (
          <div className="section-container mt-4">
            <ArchitectureDiagram />
          </div>
        )}

        {activePage === "history" && (
          <History
            onSelectRecord={(rec) => {
              setActivePage("verify");
            }}
          />
        )}
      </main>

      {/* Footer */}
      <Footer setActivePage={setActivePage} />
    </div>
  );
}