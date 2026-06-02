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
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-soft)] px-4">
      <div className="w-full max-w-sm rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <h2 className="text-center text-3xl font-semibold text-[var(--color-text-primary)]">{isSignup ? 'Sign Up' : 'Log In'}</h2>

        <form onSubmit={handleSubmit} className="mt-8">
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-[var(--color-text-primary)] transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#3337a6]/20"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-[var(--color-text-primary)] transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#3337a6]/20"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--color-accent)] py-3 font-semibold text-white transition duration-300 hover:bg-[#272b86]"
          >
            {isSignup ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span
              onClick={() => setIsSignup(!isSignup)}
              className="cursor-pointer text-[var(--color-accent)] hover:underline"
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
