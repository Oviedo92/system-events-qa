import { Ticket } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="site-footer" id="contacto">
      <div className="container">
        <div className="footer-main">
          <div>
            <a className="brand" href="#inicio">
              <span className="brand-mark">
                <Ticket size={23} />
              </span>
              <span className="brand-name">
                EVENT<span>IA</span>
              </span>
            </a>

            <p className="footer-description">
              Descubre eventos, encuentra tu comunidad y transforma tus
              planes en experiencias memorables.
            </p>
          </div>

          <div className="footer-column">
            <h3>Explora</h3>
            <div className="footer-links">
              <a href="#eventos">Todos los eventos</a>
              <a href="#categorias">Categorías</a>
              <a href="#eventos">Planes destacados</a>
            </div>
          </div>

          <div className="footer-column">
            <h3>Organizadores</h3>
            <div className="footer-links">
              <a href="#organizadores">Publica tu evento</a>
              <a href="#organizadores">Nuestra propuesta</a>
            </div>
          </div>

          <div className="footer-column">
            <h3>EVENTIA</h3>
            <div className="footer-links">
              <a href="#contacto">Sobre nosotros</a>
              <a href="#contacto">Contacto</a>
              <a href="#contacto">Privacidad y condiciones</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} EVENTIA. Todos los derechos reservados.
          </p>
          <p>Diseñado para descubrir experiencias.</p>
        </div>
      </div>
    </footer>
  );
}