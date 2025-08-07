import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Car, UserCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { UserRole } from '../types';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'renter' as UserRole
  });
  
  const [error, setError] = useState<string | null>(null);
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleRoleChange = (role: UserRole) => {
    setFormData(prev => ({ ...prev, role }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    
    try {
      await register(formData.name, formData.email, formData.password, formData.role);
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <div className="flex justify-center">
              <Car className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Criar uma conta</h2>
            <p className="mt-2 text-sm text-gray-600">
              Ou{' '}
              <Link to="/login" className="font-medium text-red-600 hover:text-red-500">
                entrar na sua conta existente
              </Link>
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <Input
                id="name"
                name="name"
                type="text"
                label="Nome completo"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                required
                leftIcon={<User size={18} className="text-gray-500" />}
                fullWidth
              />
              
              <Input
                id="email"
                name="email"
                type="email"
                label="Email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
                leftIcon={<Mail size={18} className="text-gray-500" />}
                fullWidth
              />
              
              <Input
                id="password"
                name="password"
                type="password"
                label="Senha"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
                leftIcon={<Lock size={18} className="text-gray-500" />}
                fullWidth
                helperText="Mínimo de 6 caracteres"
              />
              
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label="Confirmar senha"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
                leftIcon={<Lock size={18} className="text-gray-500" />}
                fullWidth
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eu quero:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`flex items-center justify-center px-4 py-3 border rounded-md text-sm font-medium ${
                      formData.role === 'renter'
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => handleRoleChange('renter')}
                  >
                    <UserCircle size={18} className="mr-2" />
                    Alugar carros
                  </button>
                  <button
                    type="button"
                    className={`flex items-center justify-center px-4 py-3 border rounded-md text-sm font-medium ${
                      formData.role === 'owner'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => handleRoleChange('owner')}
                  >
                    <Car size={18} className="mr-2" />
                    Anunciar meu carro
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              disabled={loading}
              fullWidth
            >
              Criar conta
            </Button>
            
            <div className="text-center text-sm text-gray-500 mt-4">
              Ao criar uma conta, você concorda com nossos{' '}
              <Link to="/terms" className="text-red-600 hover:text-red-500">
                Termos de Serviço
              </Link>{' '}
              e{' '}
              <Link to="/privacy" className="text-red-600 hover:text-red-500">
                Política de Privacidade
              </Link>
              .
            </div>
          </form>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default RegisterPage;