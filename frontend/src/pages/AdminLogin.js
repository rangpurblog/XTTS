import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Mail, Lock, Key, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminLogin(email, password, secretKey);
      toast.success('Welcome, Admin!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
        
        <Card className="border-slate-800 bg-slate-800/50 backdrop-blur" data-testid="admin-login-card">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="font-heading text-2xl text-white">Admin Login</CardTitle>
            <CardDescription className="text-slate-400">Access the admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    required
                    data-testid="admin-email-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    required
                    data-testid="admin-password-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secretKey" className="text-slate-300">Secret Key</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    id="secretKey"
                    type="password"
                    placeholder="Admin secret key"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    required
                    data-testid="admin-secret-input"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full btn-primary"
                disabled={loading}
                data-testid="admin-login-btn"
              >
                {loading ? 'Signing in...' : 'Access Dashboard'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
