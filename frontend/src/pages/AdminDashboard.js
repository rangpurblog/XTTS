import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Shield, LogOut, LayoutDashboard, Users, CreditCard, 
  ShoppingCart, Volume2, Cpu, MoreVertical, Search,
  Plus, Edit, Trash2, Check, X, Mic, Wallet, DollarSign
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { 
  getAdminStats, getAdminPlans, createPlan, updatePlan, deletePlan, seedPlans,
  getAdminOrders, approveOrder, rejectOrder,
  getUsers, updateUser, deleteUser, addUserCredits,
  getPublicVoices, clonePublicVoice, deletePublicVoice,
  getAdminPaymentAccounts, createPaymentAccount, deletePaymentAccount
} from '@/lib/api';
import { toast } from 'sonner';

const adminNavItems = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/plans', icon: CreditCard, label: 'Plans' },
  { path: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { path: '/admin/voices', icon: Volume2, label: 'Public Voices' },
  { path: '/admin/payments', icon: Wallet, label: 'Payment Accounts' },
];

// Overview Component
const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats()
      .then(res => setStats(res.data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const statCards = [
    { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'indigo' },
    { label: 'Active Users', value: stats?.active_users || 0, icon: Users, color: 'emerald' },
    { label: 'Pending Orders', value: stats?.pending_orders || 0, icon: ShoppingCart, color: 'yellow' },
    { label: 'Total Revenue', value: `$${stats?.total_revenue || 0}`, icon: DollarSign, color: 'green' },
    { label: 'Credits Sold', value: (stats?.total_credits_sold || 0).toLocaleString(), icon: CreditCard, color: 'violet' },
    { label: 'Credits Used', value: (stats?.total_credits_used || 0).toLocaleString(), icon: CreditCard, color: 'rose' },
    { label: 'Total Generations', value: stats?.total_generations || 0, icon: Volume2, color: 'blue' },
  ];

  return (
    <div className="space-y-6" data-testid="admin-overview">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600">Overview of your platform</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="stat-card" data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* GPU Usage */}
      <Card data-testid="gpu-usage-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            GPU Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">GPU Load</span>
              <span className="font-medium">{stats?.gpu_usage?.current || 0}%</span>
            </div>
            <Progress value={stats?.gpu_usage?.current || 0} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Memory Usage</span>
              <span className="font-medium">
                {stats?.gpu_usage?.memory_used || 0}GB / {stats?.gpu_usage?.memory_total || 0}GB
              </span>
            </div>
            <Progress 
              value={((stats?.gpu_usage?.memory_used || 0) / (stats?.gpu_usage?.memory_total || 16)) * 100} 
              className="h-2" 
            />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">Temperature:</span>
            <span className="font-medium">{stats?.gpu_usage?.temperature || 0}°C</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Users Management Component
const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editUser, setEditUser] = useState(null);
  const [creditAmount, setCreditAmount] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers(search, page);
      setUsers(res.data.users);
      setTotalPages(res.data.pages);
    } catch (e) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [search, page]);

  const handleBlock = async (user) => {
    try {
      await updateUser(user.id, { is_blocked: !user.is_blocked });
      toast.success(user.is_blocked ? 'User unblocked' : 'User blocked');
      loadUsers();
    } catch (e) {
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await deleteUser(userId);
      toast.success('User deleted');
      loadUsers();
    } catch (e) {
      toast.error('Failed to delete user');
    }
  };

  const handleAddCredits = async (userId) => {
    if (!creditAmount || isNaN(creditAmount)) {
      toast.error('Enter valid credit amount');
      return;
    }
    try {
      await addUserCredits(userId, parseInt(creditAmount));
      toast.success('Credits added');
      setCreditAmount('');
      setEditUser(null);
      loadUsers();
    } catch (e) {
      toast.error('Failed to add credits');
    }
  };

  return (
    <div className="space-y-6" data-testid="users-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-600">Manage platform users</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="user-search-input"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Voices</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">No users found</TableCell>
                </TableRow>
              ) : users.map((user) => (
                <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.plan_name ? (
                      <div>
                        <Badge variant="secondary">{user.plan_name}</Badge>
                        {user.plan_expires_at && (
                          <p className="text-xs text-slate-500 mt-1">
                            Expires: {new Date(user.plan_expires_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">No plan</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">{user.credits?.toLocaleString()}</TableCell>
                  <TableCell>{user.voice_clone_used}/{user.voice_clone_limit}</TableCell>
                  <TableCell>
                    {user.is_blocked ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditUser(user)}>
                          <Plus className="w-4 h-4 mr-2" /> Add Credits
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBlock(user)}>
                          {user.is_blocked ? (
                            <><Check className="w-4 h-4 mr-2" /> Unblock</>
                          ) : (
                            <><X className="w-4 h-4 mr-2" /> Block</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600" 
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button 
            variant="outline" 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">Page {page} of {totalPages}</span>
          <Button 
            variant="outline" 
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credits</DialogTitle>
            <DialogDescription>Add credits to {editUser?.name}'s account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Credit Amount</Label>
              <Input 
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Enter amount"
                data-testid="credit-amount-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button 
              className="btn-primary" 
              onClick={() => handleAddCredits(editUser?.id)}
              data-testid="add-credits-btn"
            >
              Add Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Plans Management Component
const PlansManagement = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '', credits: '', price: '', voice_clone_limit: '', expire_days: 30, is_active: true
  });

  const loadPlans = async () => {
    try {
      const res = await getAdminPlans();
      setPlans(res.data);
    } catch (e) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const handleSeed = async () => {
    try {
      await seedPlans();
      toast.success('Default plans created');
      loadPlans();
    } catch (e) {
      toast.error('Failed to seed plans');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      credits: parseInt(formData.credits),
      price: parseFloat(formData.price),
      voice_clone_limit: parseInt(formData.voice_clone_limit),
      expire_days: parseInt(formData.expire_days)
    };
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, data);
        toast.success('Plan updated');
      } else {
        await createPlan(data);
        toast.success('Plan created');
      }
      setShowDialog(false);
      setEditingPlan(null);
      setFormData({ name: '', credits: '', price: '', voice_clone_limit: '', expire_days: 30, is_active: true });
      loadPlans();
    } catch (e) {
      toast.error('Failed to save plan');
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      credits: plan.credits.toString(),
      price: plan.price.toString(),
      voice_clone_limit: plan.voice_clone_limit.toString(),
      expire_days: plan.expire_days,
      is_active: plan.is_active
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this plan?')) return;
    try {
      await deletePlan(id);
      toast.success('Plan deleted');
      loadPlans();
    } catch (e) {
      toast.error('Failed to delete plan');
    }
  };

  return (
    <div className="space-y-6" data-testid="plans-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Plan Management</h1>
          <p className="text-slate-600">Configure subscription plans</p>
        </div>
        <div className="flex gap-2">
          {plans.length === 0 && (
            <Button variant="outline" onClick={handleSeed} data-testid="seed-plans-btn">
              Create Default Plans
            </Button>
          )}
          <Button className="btn-primary" onClick={() => setShowDialog(true)} data-testid="add-plan-btn">
            <Plus className="w-4 h-4 mr-2" /> Add Plan
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.is_active ? 'opacity-50' : ''} data-testid={`plan-card-${plan.id}`}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-heading text-lg font-semibold">{plan.name}</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(plan)}>
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(plan.id)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-4">${plan.price}</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>{plan.credits.toLocaleString()} Credits</li>
                <li>{plan.voice_clone_limit} Voice Clones</li>
                <li>{plan.expire_days} Days Validity</li>
              </ul>
              <Badge className="mt-4" variant={plan.is_active ? 'default' : 'secondary'}>
                {plan.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  data-testid="plan-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  required
                  data-testid="plan-price-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Credits</Label>
                <Input 
                  type="number"
                  value={formData.credits}
                  onChange={(e) => setFormData({...formData, credits: e.target.value})}
                  required
                  data-testid="plan-credits-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Voice Clone Limit</Label>
                <Input 
                  type="number"
                  value={formData.voice_clone_limit}
                  onChange={(e) => setFormData({...formData, voice_clone_limit: e.target.value})}
                  required
                  data-testid="plan-voice-limit-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Validity (Days)</Label>
                <Input 
                  type="number"
                  value={formData.expire_days}
                  onChange={(e) => setFormData({...formData, expire_days: e.target.value})}
                  required
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch 
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" className="btn-primary" data-testid="save-plan-btn">
                {editingPlan ? 'Update' : 'Create'} Plan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Orders Management Component
const OrdersManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await getAdminOrders(filter);
      setOrders(res.data);
    } catch (e) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [filter]);

  const handleApprove = async (id) => {
    try {
      await approveOrder(id);
      toast.success('Order approved');
      loadOrders();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectOrder(id);
      toast.success('Order rejected');
      loadOrders();
    } catch (e) {
      toast.error('Failed to reject');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="orders-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Order Management</h1>
          <p className="text-slate-600">Approve or reject orders</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filter === '' ? 'default' : 'outline'}
            onClick={() => setFilter('')}
          >
            All
          </Button>
          <Button 
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            Pending
          </Button>
          <Button 
            variant={filter === 'approved' ? 'default' : 'outline'}
            onClick={() => setFilter('approved')}
          >
            Approved
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">No orders found</TableCell>
                </TableRow>
              ) : orders.map((order) => (
                <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.user_name}</p>
                      <p className="text-sm text-slate-500">{order.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{order.plan_name}</TableCell>
                  <TableCell className="font-medium">${order.amount}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.payment_method}</p>
                      <p className="text-xs text-slate-500 font-mono">{order.transaction_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {order.status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(order.id)}
                          data-testid={`approve-order-${order.id}`}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleReject(order.id)}
                          data-testid={`reject-order-${order.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// Public Voices Management
const PublicVoicesManagement = () => {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [voiceName, setVoiceName] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadVoices = async () => {
    try {
      const res = await getPublicVoices();
      setVoices(res.data);
    } catch (e) {
      toast.error('Failed to load voices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVoices(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!audioFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', voiceName);
      formData.append('audio_file', audioFile);
      await clonePublicVoice(formData);
      toast.success('Public voice created');
      setShowDialog(false);
      setVoiceName('');
      setAudioFile(null);
      loadVoices();
    } catch (e) {
      toast.error('Failed to create voice');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this voice?')) return;
    try {
      await deletePublicVoice(id);
      toast.success('Voice deleted');
      loadVoices();
    } catch (e) {
      toast.error('Failed to delete voice');
    }
  };

  return (
    <div className="space-y-6" data-testid="public-voices-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Public Voices</h1>
          <p className="text-slate-600">Manage voices available to all users</p>
        </div>
        <Button className="btn-primary" onClick={() => setShowDialog(true)} data-testid="add-public-voice-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Voice
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : voices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Volume2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">No public voices</h3>
            <p className="text-slate-500">Create public voices for all users</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {voices.map((voice) => (
            <Card key={voice.id} data-testid={`public-voice-card-${voice.id}`}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Mic className="w-6 h-6 text-violet-600" />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-red-500"
                    onClick={() => handleDelete(voice.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="font-medium text-slate-900">{voice.name}</h3>
                <p className="text-sm text-slate-500">
                  {new Date(voice.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Public Voice</DialogTitle>
            <DialogDescription>Upload an audio sample for public voice</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label>Voice Name</Label>
              <Input 
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g., Professional Male"
                required
                data-testid="public-voice-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Audio File</Label>
              <Input 
                type="file" 
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files[0])}
                required
                data-testid="public-voice-file-input"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" className="btn-primary" disabled={uploading} data-testid="create-public-voice-btn">
                {uploading ? 'Creating...' : 'Create Voice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Payment Accounts Management
const PaymentAccountsManagement = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ method: '', account_number: '', account_name: '', is_active: true });

  const loadAccounts = async () => {
    try {
      const res = await getAdminPaymentAccounts();
      setAccounts(res.data);
    } catch (e) {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createPaymentAccount(formData);
      toast.success('Account added');
      setShowDialog(false);
      setFormData({ method: '', account_number: '', account_name: '', is_active: true });
      loadAccounts();
    } catch (e) {
      toast.error('Failed to add account');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this account?')) return;
    try {
      await deletePaymentAccount(id);
      toast.success('Account deleted');
      loadAccounts();
    } catch (e) {
      toast.error('Failed to delete account');
    }
  };

  return (
    <div className="space-y-6" data-testid="payment-accounts-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Payment Accounts</h1>
          <p className="text-slate-600">Configure payment methods</p>
        </div>
        <Button className="btn-primary" onClick={() => setShowDialog(true)} data-testid="add-payment-account-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Account
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <Card key={acc.id} data-testid={`payment-account-${acc.id}`}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-emerald-600" />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-red-500"
                  onClick={() => handleDelete(acc.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <h3 className="font-medium text-slate-900">{acc.method}</h3>
              <p className="text-sm text-slate-600 font-mono">{acc.account_number}</p>
              <p className="text-sm text-slate-500">{acc.account_name}</p>
              <Badge className="mt-2" variant={acc.is_active ? 'default' : 'secondary'}>
                {acc.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Method Name</Label>
              <Input 
                value={formData.method}
                onChange={(e) => setFormData({...formData, method: e.target.value})}
                placeholder="e.g., Bkash, Nagad, Binance"
                required
                data-testid="payment-method-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input 
                value={formData.account_number}
                onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                placeholder="e.g., 01XXXXXXXXX"
                required
                data-testid="payment-number-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input 
                value={formData.account_name}
                onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                placeholder="Account holder name"
                required
                data-testid="payment-name-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label>Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" className="btn-primary" data-testid="save-payment-account-btn">
                Add Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main Admin Dashboard Component
export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminLogout } = useAuth();

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 p-4 hidden lg:block">
        <Link to="/admin/dashboard" className="flex items-center gap-2 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading font-bold text-lg text-white">Admin Panel</span>
        </Link>

        <nav className="space-y-1">
          {adminNavItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                data-testid={`admin-nav-${item.label.toLowerCase().replace(' ', '-')}`}
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
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={handleLogout}
            data-testid="admin-logout-btn"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-6">
        <Routes>
          <Route path="dashboard" element={<AdminOverview />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="plans" element={<PlansManagement />} />
          <Route path="orders" element={<OrdersManagement />} />
          <Route path="voices" element={<PublicVoicesManagement />} />
          <Route path="payments" element={<PaymentAccountsManagement />} />
        </Routes>
      </main>
    </div>
  );
}
