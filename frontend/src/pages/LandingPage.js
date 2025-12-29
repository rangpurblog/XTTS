import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Zap, Shield, Users, ChevronRight, Play, Volume2 } from 'lucide-react';
import { getPlans } from '@/lib/api';

export default function LandingPage() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    getPlans().then(res => setPlans(res.data)).catch(() => {});
  }, []);

  const formatCredits = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-xl text-slate-900">VoiceClone AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-indigo-600 transition-colors">Features</a>
            <a href="#pricing" className="text-slate-600 hover:text-indigo-600 transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-slate-600 hover:text-indigo-600" data-testid="login-btn">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button className="btn-primary" data-testid="get-started-btn">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-grid">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Powered by XTTS v2
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                Clone Any Voice with
                <span className="gradient-text"> AI Precision</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-lg">
                Transform your audio projects with state-of-the-art voice cloning technology. 
                Create realistic voice replicas in seconds.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register">
                  <Button className="btn-primary text-lg px-8 py-4" data-testid="hero-cta-btn">
                    Start Cloning Free
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button variant="outline" className="btn-secondary text-lg px-8 py-4" data-testid="demo-btn">
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </div>
            </div>
            <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1643652631396-181154ca7d8a?crop=entropy&cs=srgb&fm=jpg&q=85&w=800" 
                  alt="Voice recording studio"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="glass rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center animate-pulse-glow">
                      <Volume2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 h-8">
                        {[...Array(20)].map((_, i) => (
                          <div 
                            key={i} 
                            className="w-1 bg-indigo-500 rounded-full waveform-bar"
                            style={{ 
                              height: `${20 + Math.random() * 80}%`,
                              animationDelay: `${i * 0.05}s`
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Why Choose VoiceClone AI?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Industry-leading voice cloning technology with enterprise-grade features
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Mic, title: 'High-Quality Cloning', desc: 'Crystal clear voice clones with natural intonation and emotion preservation' },
              { icon: Zap, title: 'Lightning Fast', desc: 'Generate voice clones in seconds, not hours. Powered by GPU acceleration' },
              { icon: Shield, title: 'Secure & Private', desc: 'Your voice data is encrypted and never shared. Full privacy guaranteed' },
            ].map((feature, i) => (
              <Card key={i} className="bg-white border-0 shadow-soft card-hover" data-testid={`feature-card-${i}`}>
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-6">
                    <feature.icon className="w-7 h-7 text-indigo-600" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-slate-600">
              Choose the plan that fits your needs
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden border-2 transition-all duration-300 hover:border-indigo-300 ${i === 2 ? 'border-indigo-500 shadow-glow' : 'border-slate-100'}`}
                data-testid={`plan-card-${plan.name.toLowerCase()}`}
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
                    <span className="text-slate-500">/month</span>
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
                      <Users className="w-4 h-4 text-indigo-600" />
                      {plan.expire_days} Days Validity
                    </li>
                  </ul>
                  <Link to="/register">
                    <Button 
                      className={`w-full ${i === 2 ? 'btn-primary' : 'btn-secondary'}`}
                      data-testid={`select-plan-${plan.name.toLowerCase()}`}
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Clone Your First Voice?
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            Join thousands of creators using VoiceClone AI for their projects
          </p>
          <Link to="/register">
            <Button className="btn-primary text-lg px-8 py-4" data-testid="cta-signup-btn">
              Create Free Account
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-semibold text-slate-900">VoiceClone AI</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2024 VoiceClone AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
