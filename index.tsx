
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("LinguaGen: Initializing React Application...");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("LinguaGen Error: Target container #root not found in DOM.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("LinguaGen: Successfully mounted to #root.");
  } catch (err) {
    console.error("LinguaGen Error during render:", err);
  }
}
