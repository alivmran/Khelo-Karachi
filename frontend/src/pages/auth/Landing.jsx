import { useEffect, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { 
  Trophy, 
  MapPin, 
  Activity, 
  ShieldCheck, 
  ArrowRight
} from 'lucide-react';

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
      answer: "Refunds and cancellations depend on the specific court's policy and how close you are to the booking time. If a booking is rejected by the manager or successfully disputed, a full refund will be processed."
    },
    {
      question: "Can I manage my own sports facility?",
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

  return (
    <div className="landing-container">
      {/* HERO SECTION */}
      <section className="hero-section">

        <div className="hero-content">
          <div className="hero-badge">
            <span className="dot"></span> NOW LIVE IN KARACHI, PAKISTAN
          </div>

          <h1 className="hero-title" style={{ color: 'white' }}>
            BOOK. CHALLENGE.<br />
            <span style={{ 
              background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>CONQUER.</span>
          </h1>

          <p className="hero-subtitle">
            The only platform in Karachi that goes beyond just booking. Create your squad, challenge local teams, and dominate the pitch.
          </p>

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
            <button 
              onClick={() => navigate('/courts')}
              style={{ 
                background: '#3b82f6', 
                color: 'white', 
                padding: '18px 40px', 
                borderRadius: '16px', 
                fontSize: '1rem', 
                fontWeight: '900', 
                border: 'none', 
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.background = '#2563eb'}}
              onMouseLeave={e => {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#3b82f6'}}
            >
              FIND A COURT <ArrowRight size={18} />
            </button>
            <button 
              onClick={() => navigate('/find-team')}
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                color: 'white', 
                padding: '18px 40px', 
                borderRadius: '16px', 
                fontSize: '1rem', 
                fontWeight: '900', 
                border: '1px solid rgba(255,255,255,0.1)', 
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}}
              onMouseLeave={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}}
            >
              FIND A MATCH
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section style={{ padding: '8rem 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
          <div style={{ color: '#3b82f6', fontWeight: '900', fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>Our Ecosystem</div>
          <h2 style={{ color: 'white', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: '900', letterSpacing: '-1px' }}>DOMINATE THE FIELD</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.04)', 
            padding: '3rem 2rem', 
            borderRadius: '32px', 
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }} onMouseEnter={e => {e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'; e.currentTarget.style.transform = 'translateY(-10px)'}} onMouseLeave={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'}} onClick={() => navigate('/find-team')}>
            <div>
              <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #3b82f6, #1e40af)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)' }}>
                <Activity size={32} color="white" />
              </div>
              <h3 style={{ color: 'white', fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.75rem' }}>MATCHMAKING</h3>
              <p style={{ color: '#9ca3af', lineHeight: '1.6', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Challenge local teams, post open matches, and climb the Karachi leaderboards.</p>
            </div>
            <div style={{ color: '#3b82f6', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
              FIND A MATCH <ArrowRight size={16} />
            </div>
          </div>

          <div style={{ 
            background: 'rgba(255,255,255,0.04)', 
            padding: '3rem 2rem', 
            borderRadius: '32px', 
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }} onMouseEnter={e => {e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'; e.currentTarget.style.transform = 'translateY(-10px)'}} onMouseLeave={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'}} onClick={() => navigate('/courts')}>
            <div>
              <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #10b981, #065f46)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)' }}>
                <MapPin size={32} color="white" />
              </div>
              <h3 style={{ color: 'white', fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.75rem' }}>ARENA BOOKING</h3>
              <p style={{ color: '#9ca3af', lineHeight: '1.6', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Reserve premium Futsal, Padel, and Cricket arenas across the city in seconds.</p>
            </div>
            <div style={{ color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
              BROWSE COURTS <ArrowRight size={16} />
            </div>
          </div>

          <div style={{ 
            background: 'rgba(255,255,255,0.04)', 
            padding: '3rem 2rem', 
            borderRadius: '32px', 
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }} onMouseEnter={e => {e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'; e.currentTarget.style.transform = 'translateY(-10px)'}} onMouseLeave={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'}} onClick={() => navigate('/profile')}>
            <div>
              <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #f59e0b, #92400e)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 8px 16px rgba(245, 158, 11, 0.2)' }}>
                <Trophy size={32} color="white" />
              </div>
              <h3 style={{ color: 'white', fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.75rem' }}>YOUR LEGACY</h3>
              <p style={{ color: '#9ca3af', lineHeight: '1.6', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Track match history, manage your squad, and build your profile as a top athlete.</p>
            </div>
            <div style={{ color: '#f59e0b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
              VIEW PROFILE <ArrowRight size={16} />
            </div>
          </div>

        </div>
      </section>

      {/* FAQ & PARTNER SECTION */}
      <section style={{ padding: '6rem 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ 
          position: 'absolute', 
          top: '50%', left: '50%', 
          transform: 'translate(-50%, -50%)', 
          width: '600px', height: '600px', 
          background: 'rgba(59, 130, 246, 0.05)', 
          filter: 'blur(120px)', 
          borderRadius: '50%',
          zIndex: 0
        }}></div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '3rem', 
            justifyContent: 'center',
            alignItems: 'flex-start' 
          }}>
            
            {/* FAQ Column */}
            <div style={{ flex: '1 1 450px', minWidth: '300px' }}>
              <div style={{ color: '#3b82f6', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>Questions?</div>
              <h2 style={{ color: 'white', fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: '900', marginBottom: '2.5rem', letterSpacing: '-1px' }}>WE HAVE ANSWERS</h2>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {faqs.map((faq, index) => (
                  <div key={index} style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.3s'
                  }}>
                    <button 
                      onClick={() => toggleFaq(index)}
                      style={{ 
                        width: '100%', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '1.25rem 1.5rem', 
                        background: 'none', 
                        border: 'none', 
                        color: 'white', 
                        fontSize: '1rem', 
                        fontWeight: '700', 
                        cursor: 'pointer', 
                        textAlign: 'left' 
                      }}
                    >
                      {faq.question}
                      <div style={{ 
                        width: '24px', height: '24px', 
                        background: openFaq === index ? '#3b82f6' : 'rgba(255,255,255,0.05)', 
                        borderRadius: '8px', 
                        flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {openFaq === index ? 'âˆ’' : '+'}
                      </div>
                    </button>
                    {openFaq === index && (
                      <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', color: '#9ca3af', lineHeight: '1.6', fontSize: '0.9rem' }}>
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Partner Column */}
            <div style={{ 
              flex: '1 1 350px',
              minWidth: '300px',
              background: 'rgba(255,255,255,0.02)', 
              padding: 'clamp(2rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3rem)', 
              borderRadius: '40px', 
              border: '1px solid rgba(255,255,255,0.05)',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                <ShieldCheck size={40} color="#3b82f6" />
              </div>
              <h2 style={{ color: 'white', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: '900', marginBottom: '1.5rem', lineHeight: '1.2' }}>PARTNER WITH US</h2>
              <p style={{ color: '#9ca3af', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2.5rem' }}>
                Own a sports facility? Join Karachi's fastest-growing sports network and streamline your bookings today.
              </p>
              <a href="mailto:khelokarachi@gmail.com" style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '12px', 
                background: 'white', 
                color: '#0a1120', 
                padding: '16px 36px', 
                borderRadius: '16px', 
                fontSize: '1rem', 
                fontWeight: '900', 
                textDecoration: 'none',
                transition: 'all 0.2s',
                width: '100%',
                justifyContent: 'center'
              }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                GET STARTED
              </a>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
