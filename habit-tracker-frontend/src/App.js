import React, { useState } from 'react';
import LoginSignupForm from './components/LoginSignupForm';

const App = () => {
  const [isAuthenticated, setAuthenticated] = useState(false);

  // If not authenticated, show Login/Signup page
  if (!isAuthenticated) {
    return (
      <div>
        <LoginSignupForm setAuthenticated={setAuthenticated} />
      </div>
    );
  }

  // Main content for authenticated users
  return (
    <div className="text-center mt-16">
      <h1 className="text-5xl font-bold text-gray-800">Welcome to the Habit Tracker</h1>
      <p className="mt-4 text-lg text-gray-600">You are logged in and ready to track your habits!</p>
    </div>
  );
};

export default App;
