
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Login: React.FC = () => {
    const { login, isLoading } = useApp();
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
        <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-[#0c0c0c] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
                    <div className="text-center mb-10">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black italic text-white text-xl mx-auto mb-6 shadow-lg shadow-blue-600/20">
                            A
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Benvenuto</h1>
                        <p className="text-zinc-500 font-medium">Accedi al tuo hub operativo Advenire</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Username o Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
                                        placeholder="nome.cognome o email"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
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
                                className="flex items-center space-x-2 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-sm font-medium"
                            >
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {isSubmitting ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>
                                    <span>Accedi</span>
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Quick Login for Demo */}
                    <div className="mt-8 pt-8 border-t border-white/5">
                        <p className="text-center text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-4">Accesso Rapido Demo</p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleDemoLogin('admin')}
                                className="flex-1 py-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-colors border border-white/5 hover:border-blue-500/30"
                            >
                                Admin
                            </button>
                            <button
                                onClick={() => handleDemoLogin('talent')}
                                className="flex-1 py-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-colors border border-white/5 hover:border-blue-500/30"
                            >
                                Talent
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
