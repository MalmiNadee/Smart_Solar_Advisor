import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Register = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
            toast.warning('Please fill all fields.');
            setIsLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match.');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            toast.warning('Password must be at least 6 characters.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_BASE_URL}/api/auth/createUser`,
                {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password
                },
                { headers: { 'Content-Type': 'application/json' } }
            );

            console.log(response.data);

            if (response.data.success) {
                // Auto-login after registration
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('userEmail', response.data.user.email);

                toast.success('Registration successful! Redirecting...');

                setTimeout(() => {
                    navigate('/dashboard', { replace: true });
                }, 1500);
            } else {
                toast.error(response.data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            const errorMessage = error.response?.data?.message || 'Error connecting to server.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
            {/* Decorative Blobs */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-4000"></div>

            <ToastContainer position="top-center" autoClose={3000} />

            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] z-10 relative mt-8 mb-8">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Create Account</h1>
                    <p className="text-blue-200 text-sm">Join Smart Solar Advisor today</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                    <div>
                        <label htmlFor="name" className="block mb-2 font-medium text-blue-100 text-sm">Full Name</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-white/50" />
                            </div>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full bg-black/20 border border-white/10 text-white placeholder-white/30 pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="block mb-2 font-medium text-blue-100 text-sm">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-white/50" />
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full bg-black/20 border border-white/10 text-white placeholder-white/30 pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block mb-2 font-medium text-blue-100 text-sm">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-white/50" />
                            </div>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleInputChange}
                                className="w-full bg-black/20 border border-white/10 text-white placeholder-white/30 pl-11 pr-11 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        <p className="text-xs text-blue-200/50 mt-2">Must be at least 6 characters</p>
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block mb-2 font-medium text-blue-100 text-sm">Confirm Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-white/50" />
                            </div>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                className="w-full bg-black/20 border border-white/10 text-white placeholder-white/30 pl-11 pr-11 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-lg mt-4"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Creating...
                            </span>
                        ) : 'Create Account'}
                    </button>
                </form>

                <div className="mt-8 text-center pt-6 border-t border-white/10">
                    <p className="text-blue-100/70 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-yellow-400 font-semibold hover:text-yellow-300 transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
