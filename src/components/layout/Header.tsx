import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, Menu, User, LogOut, Plus, Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { currentUser, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <Car className="h-8 w-8 text-red-500" />
          <span className="text-xl font-bold text-gray-900">CarShare</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link to="/cars" className="text-gray-700 hover:text-red-500 transition-colors">
            Catálogo
          </Link>
          <Link to="/how-it-works" className="text-gray-700 hover:text-red-500 transition-colors">
            Como Funciona
          </Link>
          
          {isAuthenticated ? (
            <div className="flex items-center space-x-6">
              {currentUser?.role === 'owner' && (
                <Link to="/owner/add-car\" className="flex items-center gap-1 text-gray-700 hover:text-red-500">
                  <Plus size={18} />
                  <span>Anunciar Carro</span>
                </Link>
              )}
              <Link to="/favorites" className="text-gray-700 hover:text-red-500">
                <Heart size={20} />
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-2">
                  <img 
                    src={currentUser?.avatar} 
                    alt={currentUser?.name} 
                    className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                  />
                  <span className="text-gray-700">{currentUser?.name.split(' ')[0]}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                  <div className="py-1">
                    <Link to="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                      Dashboard
                    </Link>
                    <Link to="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                      Meu Perfil
                    </Link>
                    <button 
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      Sair
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-700 hover:text-red-500 transition-colors">
                Login
              </Link>
              <Link to="/register" className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors">
                Cadastre-se
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <button 
          className="md:hidden text-gray-700 focus:outline-none"
          onClick={toggleMenu}
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            <Link to="/cars" className="text-gray-700 hover:text-red-500 py-2">
              Catálogo
            </Link>
            <Link to="/how-it-works" className="text-gray-700 hover:text-red-500 py-2">
              Como Funciona
            </Link>
            
            {isAuthenticated ? (
              <>
                {currentUser?.role === 'owner' && (
                  <Link to="/owner/add-car\" className="flex items-center gap-2 text-gray-700 hover:text-red-500 py-2">
                    <Plus size={18} />
                    <span>Anunciar Carro</span>
                  </Link>
                )}
                <Link to="/favorites" className="flex items-center gap-2 text-gray-700 hover:text-red-500 py-2">
                  <Heart size={18} />
                  <span>Favoritos</span>
                </Link>
                <Link to="/dashboard" className="flex items-center gap-2 text-gray-700 hover:text-red-500 py-2">
                  <User size={18} />
                  <span>Dashboard</span>
                </Link>
                <Link to="/profile" className="text-gray-700 hover:text-red-500 py-2">
                  Meu Perfil
                </Link>
                <button 
                  onClick={logout}
                  className="flex items-center gap-2 text-gray-700 hover:text-red-500 py-2"
                >
                  <LogOut size={18} />
                  <span>Sair</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col space-y-3 pt-2">
                <Link to="/login" className="text-gray-700 hover:text-red-500 py-2">
                  Login
                </Link>
                <Link to="/register" className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors text-center">
                  Cadastre-se
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;