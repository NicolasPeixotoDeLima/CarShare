import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white pt-12 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Car className="h-8 w-8 text-red-500" />
              <span className="text-xl font-bold">CarShare</span>
            </div>
            <p className="text-gray-400 mb-4">
              Conectando proprietários de carros e pessoas que precisam de um veículo.
              A maneira mais fácil de alugar um carro.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/cars" className="text-gray-400 hover:text-white transition-colors">Catálogo</Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-gray-400 hover:text-white transition-colors">Como Funciona</Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white transition-colors">Sobre Nós</Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contato</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Para Proprietários</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/owner/register" className="text-gray-400 hover:text-white transition-colors">Cadastre seu Carro</Link>
              </li>
              <li>
                <Link to="/owner/guide" className="text-gray-400 hover:text-white transition-colors">Guia do Proprietário</Link>
              </li>
              <li>
                <Link to="/owner/faq" className="text-gray-400 hover:text-white transition-colors">Perguntas Frequentes</Link>
              </li>
              <li>
                <Link to="/owner/insurance" className="text-gray-400 hover:text-white transition-colors">Seguro</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contato</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-red-500 mt-0.5" />
                <span className="text-gray-400">contato@carshare.com.br</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-red-500 mt-0.5" />
                <span className="text-gray-400">(11) 4002-8922</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} CarShare. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/terms" className="text-gray-500 text-sm hover:text-white transition-colors">
                Termos de Uso
              </Link>
              <Link to="/privacy" className="text-gray-500 text-sm hover:text-white transition-colors">
                Política de Privacidade
              </Link>
              <Link to="/cookies" className="text-gray-500 text-sm hover:text-white transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;