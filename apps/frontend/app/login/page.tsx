"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useState } from "react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
    } catch (e) {
      alert("Login failed");
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/20">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">TallyMe Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded-md px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded-md px-3 py-2" required />
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
