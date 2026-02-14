
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("GlossaForge: Initializing React Application...");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("GlossaForge Error: Target container #root not found in DOM.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("GlossaForge: Successfully mounted to #root.");
  } catch (err) {
    console.error("GlossaForge Error during render:", err);
  }
}
