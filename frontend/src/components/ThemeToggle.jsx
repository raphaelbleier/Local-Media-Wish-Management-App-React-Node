import React, { useEffect, useState } from 'react';

function ThemeToggle() {
  // Get theme from localStorage or default to 'light'
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  // Apply theme class to the body element
  useEffect(() => {
    document.body.className = ''; // Remove existing theme classes
    document.body.classList.add(theme + '-mode'); // Add current theme class
    localStorage.setItem('theme', theme); // Save theme to localStorage
  }, [theme]); // Re-run effect whenever theme changes

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    // Basic styling for the toggle button. Add more sophisticated styling if needed.
    <button
      onClick={toggleTheme}
      style={{
        padding: '5px 10px',
        fontSize: '0.9em',
        backgroundColor: 'var(--secondary-color)', /* Use secondary color for toggle */
        color: 'var(--button-text-color)',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginLeft: '15px', // Space from nav items
      }}
    >
      Zum {theme === 'light' ? 'Dark' : 'Light'} Mode wechseln
    </button>
  );
}

export default ThemeToggle;