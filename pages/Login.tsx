
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/ui/glass-card';

const Login: React.FC = () => {
    const { login } = useApp();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Credenziali non valide');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDemoLogin = (role: 'admin' | 'talent') => {
        if (role === 'admin') {
            setEmail('admin@advenire.com');
            setPassword('admin123');
        } else {
            setEmail('talent@demo.com');
            setPassword('talent123');
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
            {/* Animated gradient orbs */}
            <motion.div
                animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-[-15%] left-[-15%] w-[55%] h-[55%] bg-primary/15 blur-[150px] rounded-full"
            />
            <motion.div
                animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] bg-purple-600/15 blur-[150px] rounded-full"
            />
            <motion.div
                animate={{ x: [0, 15, 0], y: [0, 15, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-[40%] right-[20%] w-[25%] h-[25%] bg-blue-400/10 blur-[100px] rounded-full"
            />

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="w-full max-w-md relative z-10"
            >
                <GlassCard variant="prominent" className="p-8 sm:p-10 rounded-3xl">
                    {/* Logo & Title */}
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-400 rounded-2xl flex items-center justify-center font-black italic text-white text-xl mx-auto mb-5 shadow-lg shadow-primary/25">
                            A
                        </div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1.5">Benvenuto</h1>
                        <p className="text-sm text-muted-foreground">Accedi al tuo hub operativo Advenire</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                                    <Input
                                        id="email"
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 h-12 rounded-xl"
                                        placeholder="nome@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 h-12 rounded-xl"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3.5 rounded-xl border border-red-500/20 text-sm"
                            >
                                <AlertCircle size={14} className="shrink-0" />
                                <span className="text-xs font-medium">{error}</span>
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            size="lg"
                            className="w-full h-12 rounded-xl font-bold text-sm"
                        >
                            {isSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <span>Accedi</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Demo Quick Login */}
                    <div className="mt-8 pt-6 border-t border-white/[0.06]">
                        <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-4">
                            Accesso Rapido Demo
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="glass"
                                onClick={() => handleDemoLogin('admin')}
                                className="flex-1 text-xs"
                            >
                                Admin
                            </Button>
                            <Button
                                variant="glass"
                                onClick={() => handleDemoLogin('talent')}
                                className="flex-1 text-xs"
                            >
                                Talent
                            </Button>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
};

export default Login;
