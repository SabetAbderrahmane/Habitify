import React, { useState } from 'react';
import axios from 'axios';

const LoginSignupForm = ({ setAuthenticated }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isSignup ? 'http://127.0.0.1:8000/signup/' : 'http://127.0.0.1:8000/login/';

    try {
      const response = await axios.post(url, { email, password });

      if (response.status === 200) {
        setAuthenticated(true);
        alert(isSignup ? 'Signup successful!' : 'Login successful!');
      }
    } catch (error) {
      alert('Authentication failed!');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-purple-600 to-blue-600">
      <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-xl transform transition duration-500 hover:scale-105 hover:rotate-1">
        <h2 className="text-4xl font-semibold text-center text-gray-800">{isSignup ? 'Sign Up' : 'Log In'}</h2>

        <form onSubmit={handleSubmit} className="mt-8">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 p-3 w-full rounded-lg bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-2 p-3 w-full rounded-lg bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-300"
          >
            {isSignup ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span
              onClick={() => setIsSignup(!isSignup)}
              className="text-blue-500 cursor-pointer hover:underline"
            >
              {isSignup ? 'Log In' : 'Sign Up'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginSignupForm;
