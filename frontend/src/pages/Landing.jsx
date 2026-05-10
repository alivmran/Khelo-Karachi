import { useEffect, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "How do I book a court on Khelo Karachi?",
      answer: "Booking is simple! Navigate to the 'Browse Courts' page, select your preferred facility (Futsal, Padel, or Cricket), choose a date and time slot, and submit your request. You'll then be prompted to upload payment proof to confirm your booking."
    },
    {
      question: "How does competitive matchmaking work?",
      answer: "If you don't have a full squad or want to test your team against others, use our matchmaking feature. Create an open match post with your squad size and wait for other teams to challenge you. Accept a challenge, and the match is set!"
    },
    {
      question: "What is the cancellation and refund policy?",
      answer: "Refunds and cancellations depend on the specific court's policy and how close you are to the booking time. If a booking is rejected by the manager or successfully disputed, a full refund will be processed. You can also request a reschedule up to 6 hours before your match."
    },
    {
      question: "Can I manage my own sports facility on this platform?",
      answer: "Absolutely! We partner with facility owners across Karachi. Contact us using the link at the bottom of the page to get your court listed and start receiving online bookings."
    }
  ];

  useEffect(() => {
    if (user && user.role === 'manager') {
      navigate('/manager/dashboard');
    } else if (user && (user.role === 'admin' || user.isAdmin)) {
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  const handleNav = (path) => {
    navigate(path);
  };

  return (
    <div className="landing-container">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-grid-bg"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="dot"></span> NOW LIVE IN KARACHI, PAKISTAN
          </div>
          <h1 className="hero-title">
            <span className="text-white">BOOK COURTS.</span><br />
            <span className="text-blue">CHALLENGE TEAMS.</span><br />
            <span className="text-white">KARACHI'S ULTIMATE SPORTS HUB.</span>
          </h1>
          <p className="hero-subtitle">
            The only platform in Karachi that goes beyond just booking. Create your squad, challenge local teams, and dominate the pitch.
          </p>
          <div className="hero-actions">
            <button className="primary-btn-large" onClick={() => handleNav('/courts')}>
              FIND A COURT
            </button>
            <button className="secondary-btn-large" onClick={() => handleNav('/find-team')}>
              FIND A MATCH
            </button>
          </div>
        </div>

        {/* Stats temporarily hidden
        <div className="hero-stats">
          <div className="stat-item">
            <h2 className="stat-number">50+</h2>
            <p className="stat-label">VENUES LISTED</p>
          </div>
          <div className="stat-item">
            <h2 className="stat-number">2K+</h2>
            <p className="stat-label">ACTIVE PLAYERS</p>
          </div>
          <div className="stat-item">
            <h2 className="stat-number">500+</h2>
            <p className="stat-label">MATCHES PLAYED</p>
          </div>
        </div>
        */}
      </section>

      {/* SERVICES SECTION */}
      <section className="services-section">
        <div className="services-header">
          <span className="section-label">WHAT WE OFFER</span>
          <h2 className="section-title">EVERYTHING YOU NEED TO GET ON THE PITCH</h2>
        </div>
        
        <div className="services-grid">
          {/* Emphasized Matchmaking Service */}
          <div className="service-card premium-card" onClick={() => handleNav('/find-team')}>
            <div className="icon-wrapper">
              <span className="icon">⚔️</span>
            </div>
            <h3 className="text-blue">COMPETITIVE MATCHMAKING</h3>
            <p>
              This is what sets us apart. Don't have a full squad? Want to test your team against the best in Karachi? Post an open match and receive challenges from other teams.
            </p>
            <span className="service-link">FIND A MATCH <span>&rarr;</span></span>
          </div>

          <div className="service-card" onClick={() => handleNav('/courts')}>
            <div className="icon-wrapper">
              <span className="icon">📍</span>
            </div>
            <h3>BOOK A COURT</h3>
            <p>
              Instantly browse and reserve Futsal, Padel, and Cricket facilities across the city. View real-time availability and pay securely.
            </p>
            <span className="service-link">BROWSE COURTS <span>&rarr;</span></span>
          </div>

          <div className="service-card" onClick={() => handleNav('/profile')}>
            <div className="icon-wrapper">
              <span className="icon">🏆</span>
            </div>
            <h3>MANAGE YOUR PROFILE</h3>
            <p>
              Track your match history, view attendance records, and build your team's legacy.
            </p>
            <span className="service-link">VIEW PROFILE <span>&rarr;</span></span>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="faq-section" style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-main)' }}>FREQUENTLY ASKED QUESTIONS</h2>
          <p style={{ color: 'var(--text-muted)' }}>Everything you need to know about Khelo Karachi.</p>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={index} style={{ marginBottom: '1rem', background: 'var(--bg-secondary)', borderRadius: '10px', overflow: 'hidden' }}>
              <button 
                onClick={() => toggleFaq(index)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' }}
              >
                {faq.question}
                <span style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}>{openFaq === index ? '−' : '+'}</span>
              </button>
              {openFaq === index && (
                <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA SECTION FOR COURT OWNERS */}
      <section className="owner-cta-section" style={{ padding: '5rem 2rem', background: 'linear-gradient(to right, #0a0f1d, #1e3a8a)', textAlign: 'center', marginTop: '3rem', borderRadius: '20px', margin: '3rem 2rem' }}>
        <h2 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '800' }}>OWN A SPORTS FACILITY IN KARACHI?</h2>
        <p style={{ color: '#cbd5e1', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto 2rem auto', lineHeight: '1.6' }}>
          Partner with Khelo Karachi to manage your bookings, increase your visibility, and streamline your operations. List your futsal, padel, or cricket ground with us today.
        </p>
        <a href="mailto:contact@khelokarachi.com" className="primary-btn-large" style={{ display: 'inline-block', textDecoration: 'none' }}>
          CONTACT US TO LIST
        </a>
      </section>
    </div>
  );
};

export default Landing;