import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Mic, LogOut, Home, Volume2, Library, CreditCard, 
  ShoppingCart, Upload, Trash2, Play, Zap, Clock, Plus
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { 
  getMyVoices, getPublicVoices, cloneVoice, deleteVoice, 
  generateVoice, getPlans, createOrder, getUserOrders, getPaymentAccounts
} from '@/lib/api';
import { toast } from 'sonner';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Overview' },
  { path: '/dashboard/my-voices', icon: Mic, label: 'My Voices' },
  { path: '/dashboard/library', icon: Library, label: 'Voice Library' },
  { path: '/dashboard/generate', icon: Volume2, label: 'Generate' },
  { path: '/dashboard/plans', icon: CreditCard, label: 'Plans' },
  { path: '/dashboard/orders', icon: ShoppingCart, label: 'Orders' },
];

// Overview Component
const Overview = ({ user }) => {
  const planExpiry = user?.plan_expires_at ? new Date(user.plan_expires_at) : null;
  const daysLeft = planExpiry ? Math.max(0, Math.ceil((planExpiry - new Date()) / (1000 * 60 * 60 * 24))) : 0;
  
  return (
    <div className="space-y-6" data-testid="user-overview">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">Welcome, {user?.name}!</h1>
        <p className="text-slate-600">Manage your voice cloning account</p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="stat-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Credits</p>
                <p className="text-3xl font-bold text-slate-900">{(user?.credits || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="stat-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Voice Clones</p>
                <p className="text-3xl font-bold text-slate-900">
                  {user?.voice_clone_used || 0} / {user?.voice_clone_limit || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <Mic className="w-6 h-6 text-violet-600" />
              </div>
            </div>
            <Progress 
              value={user?.voice_clone_limit ? (user.voice_clone_used / user.voice_clone_limit) * 100 : 0} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>
        
        <Card className="stat-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Plan Status</p>
                <p className="text-xl font-bold text-slate-900">{user?.plan_name || 'No Plan'}</p>
                {daysLeft > 0 && (
                  <p className="text-sm text-slate-500">{daysLeft} days left</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {!user?.plan_name && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-semibold text-slate-900">Get Started with a Plan</h3>
                <p className="text-slate-600">Purchase a plan to start cloning voices</p>
              </div>
              <Link to="/dashboard/plans">
                <Button className="btn-primary" data-testid="view-plans-btn">View Plans</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// My Voices Component
const MyVoices = ({ user, refreshUser }) => {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [voiceName, setVoiceName] = useState('');
  const [audioFile, setAudioFile] = useState(null);

  const loadVoices = async () => {
    try {
      const res = await getMyVoices();
      setVoices(res.data);
    } catch (e) {
      toast.error('Failed to load voices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVoices(); }, []);

  const handleClone = async (e) => {
    e.preventDefault();
    if (!audioFile) {
      toast.error('Please select an audio file');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', voiceName);
      formData.append('audio_file', audioFile);
      await cloneVoice(formData);
      toast.success('Voice cloned successfully!');
      setShowDialog(false);
      setVoiceName('');
      setAudioFile(null);
      loadVoices();
      refreshUser();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to clone voice');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this voice?')) return;
    try {
      await deleteVoice(id);
      toast.success('Voice deleted');
      loadVoices();
      refreshUser();
    } catch (e) {
      toast.error('Failed to delete voice');
    }
  };

  return (
    <div className="space-y-6" data-testid="my-voices-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">My Voices</h1>
          <p className="text-slate-600">Manage your cloned voices</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button 
              className="btn-primary" 
              disabled={user?.voice_clone_used >= user?.voice_clone_limit}
              data-testid="clone-voice-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Clone Voice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clone New Voice</DialogTitle>
              <DialogDescription>Upload an audio sample to create a voice clone</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleClone} className="space-y-4">
              <div className="space-y-2">
                <Label>Voice Name</Label>
                <Input 
                  value={voiceName} 
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="e.g., My Voice"
                  required
                  data-testid="voice-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Audio File</Label>
                <Input 
                  type="file" 
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files[0])}
                  required
                  data-testid="audio-file-input"
                />
                <p className="text-xs text-slate-500">Supported: MP3, WAV, M4A (max 10MB)</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button type="submit" className="btn-primary" disabled={uploading} data-testid="submit-clone-btn">
                  {uploading ? 'Cloning...' : 'Clone Voice'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : voices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Mic className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">No voices yet</h3>
            <p className="text-slate-500">Clone your first voice to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {voices.map((voice) => (
            <Card key={voice.id} className="card-hover" data-testid={`voice-card-${voice.id}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Mic className="w-6 h-6 text-indigo-600" />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(voice.id)}
                    data-testid={`delete-voice-${voice.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="font-medium text-slate-900">{voice.name}</h3>
                <p className="text-sm text-slate-500">
                  Created {new Date(voice.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Voice Library Component
const VoiceLibrary = () => {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicVoices()
      .then(res => setVoices(res.data))
      .catch(() => toast.error('Failed to load library'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6" data-testid="voice-library-page">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">Voice Library</h1>
        <p className="text-slate-600">Browse public voices available for use</p>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : voices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Library className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">No public voices</h3>
            <p className="text-slate-500">Public voices will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {voices.map((voice) => (
            <Card key={voice.id} className="card-hover" data-testid={`public-voice-${voice.id}`}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Volume2 className="w-6 h-6 text-violet-600" />
                  </div>
                  <Badge variant="secondary">Public</Badge>
                </div>
                <h3 className="font-medium text-slate-900">{voice.name}</h3>
                <p className="text-sm text-slate-500">
                  Added {new Date(voice.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Generate Voice Component
const GenerateVoice = ({ user, refreshUser }) => {
  const [myVoices, setMyVoices] = useState([]);
  const [publicVoices, setPublicVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState(null);
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    Promise.all([getMyVoices(), getPublicVoices()])
      .then(([my, pub]) => {
        setMyVoices(my.data);
        setPublicVoices(pub.data);
      });
  }, []);

  const allVoices = [...myVoices, ...publicVoices];
  const selectedVoiceData = allVoices.find(v => v.id === selectedVoice);
  const creditsNeeded = Math.max(1, Math.floor(text.length / 10));

  const handleGenerate = async () => {
    if (!selectedVoice || !text.trim()) {
      toast.error('Please select a voice and enter text');
      return;
    }
    if (user.credits < creditsNeeded) {
      toast.error('Insufficient credits');
      return;
    }
    setGenerating(true);
    setGeneratedAudio(null);
    try {
      const response = await generateVoice({ 
        voice_id: selectedVoice, 
        voice_name: selectedVoiceData?.name || '',
        text,
        language
      });
      toast.success('Voice generated successfully!');
      if (response.data?.audio_url) {
        setGeneratedAudio(response.data.audio_url);
      }
      refreshUser();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="generate-voice-page">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">Generate Voice</h1>
        <p className="text-slate-600">Create speech from text using your cloned voices</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Text to Speech</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Voice</Label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger data-testid="voice-select">
                    <SelectValue placeholder="Choose a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {myVoices.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-slate-500 font-medium">My Voices</div>
                        {myVoices.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </>
                    )}
                    {publicVoices.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-slate-500 font-medium mt-2">Public Voices</div>
                        {publicVoices.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Text</Label>
                <Textarea 
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter the text you want to convert to speech..."
                  rows={6}
                  data-testid="text-input"
                />
                <p className="text-xs text-slate-500">{text.length} characters</p>
              </div>
              <Button 
                className="btn-primary w-full"
                onClick={handleGenerate}
                disabled={generating || !selectedVoice || !text.trim()}
                data-testid="generate-btn"
              >
                {generating ? 'Generating...' : 'Generate Voice'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Your Credits</span>
                <Zap className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{user?.credits?.toLocaleString() || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Credits Needed</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{creditsNeeded}</p>
              <p className="text-xs text-slate-500 mt-1">1 credit per 10 characters</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Plans Component
const Plans = ({ user, refreshUser }) => {
  const [plans, setPlans] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getPlans(), getPaymentAccounts()])
      .then(([plansRes, accountsRes]) => {
        setPlans(plansRes.data);
        setPaymentAccounts(accountsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createOrder({
        plan_id: selectedPlan.id,
        payment_method: paymentMethod,
        transaction_id: transactionId
      });
      toast.success('Order placed! Waiting for approval.');
      setShowPayment(false);
      setSelectedPlan(null);
      setPaymentMethod('');
      setTransactionId('');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCredits = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num;
  };

  const selectedAccount = paymentAccounts.find(a => a.method === paymentMethod);

  return (
    <div className="space-y-6" data-testid="plans-page">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">Plans & Pricing</h1>
        <p className="text-slate-600">Choose a plan that fits your needs</p>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, i) => (
            <Card 
              key={plan.id} 
              className={`relative overflow-hidden transition-all duration-300 hover:border-indigo-300 ${i === 2 ? 'border-2 border-indigo-500 shadow-glow' : 'border'}`}
              data-testid={`plan-${plan.name.toLowerCase()}`}
            >
              {i === 2 && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
                  Popular
                </div>
              )}
              <CardContent className="p-6">
                <h3 className="font-heading text-xl font-semibold text-slate-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-slate-600">
                    <Zap className="w-4 h-4 text-indigo-600" />
                    {formatCredits(plan.credits)} Credits
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <Mic className="w-4 h-4 text-indigo-600" />
                    {plan.voice_clone_limit} Voice Clones
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    {plan.expire_days} Days
                  </li>
                </ul>
                <Button 
                  className={`w-full ${i === 2 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setSelectedPlan(plan); setShowPayment(true); }}
                  data-testid={`buy-${plan.name.toLowerCase()}`}
                >
                  Buy Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Pay ${selectedPlan?.price} for {selectedPlan?.name} plan
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOrder} className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="payment-method-select">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.method}>{acc.method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAccount && (
              <Card className="bg-slate-50">
                <CardContent className="pt-4 text-sm">
                  <p className="font-medium">{selectedAccount.method}</p>
                  <p className="text-slate-600">{selectedAccount.account_number}</p>
                  <p className="text-slate-600">{selectedAccount.account_name}</p>
                </CardContent>
              </Card>
            )}
            <div className="space-y-2">
              <Label>Transaction ID</Label>
              <Input 
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter your transaction ID"
                required
                data-testid="transaction-id-input"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
              <Button 
                type="submit" 
                className="btn-primary" 
                disabled={submitting || !paymentMethod}
                data-testid="submit-order-btn"
              >
                {submitting ? 'Submitting...' : 'Submit Order'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Orders Component
const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserOrders()
      .then(res => setOrders(res.data))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[status] || 'bg-slate-100'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="orders-page">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">My Orders</h1>
        <p className="text-slate-600">Track your plan purchases</p>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">No orders yet</h3>
            <p className="text-slate-500">Your order history will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} data-testid={`order-${order.id}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">{order.plan_name} Plan</h3>
                    <p className="text-sm text-slate-500">
                      {order.payment_method} • {order.transaction_id}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">${order.amount}</p>
                    {getStatusBadge(order.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Dashboard Component
export default function UserDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 p-4 hidden lg:block">
        <Link to="/" className="flex items-center gap-2 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading font-bold text-lg text-slate-900">VoiceClone AI</span>
        </Link>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-600 hover:text-red-600"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 p-4 z-50">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-slate-900">VoiceClone</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64 pt-20 lg:pt-8 p-6">
        <Routes>
          <Route index element={<Overview user={user} />} />
          <Route path="my-voices" element={<MyVoices user={user} refreshUser={refreshUser} />} />
          <Route path="library" element={<VoiceLibrary />} />
          <Route path="generate" element={<GenerateVoice user={user} refreshUser={refreshUser} />} />
          <Route path="plans" element={<Plans user={user} refreshUser={refreshUser} />} />
          <Route path="orders" element={<Orders />} />
        </Routes>
      </main>

      {/* Mobile Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 flex justify-around">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg ${
                isActive ? 'text-indigo-600' : 'text-slate-500'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
