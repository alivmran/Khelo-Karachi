import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  Search, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Trophy, 
  Activity, 
  Star,
  Users,
  LayoutGrid,
  Filter
} from 'lucide-react';

const to12Hour = (time24 = '00:00') => {
  const [hourRaw] = time24.split(':').map(Number);
  const hour = Number.isNaN(hourRaw) ? 0 : hourRaw;
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const hour12 = normalized % 12 || 12;
  return `${hour12}:00 ${suffix}`;
};

const isCurrentlyOpen = (start = '00:00', end = '23:59') => {
  const now = new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes();
  
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  
  const startTime = sH * 100 + (sM || 0);
  const endTime = eH * 100 + (eM || 0);
  
  if (endTime < startTime) {
    // Overlays midnight (e.g., 6PM to 2AM)
    return currentTime >= startTime || currentTime <= endTime;
  }
  return currentTime >= startTime && currentTime <= endTime;
};

const parseHourHelper = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return null;
  const [h] = timeString.split(':').map(Number);
  return Number.isNaN(h) ? null : h;
};

const Home = () => {
  const [courts, setCourts] = useState([]);
  const [filteredCourts, setFilteredCourts] = useState([]);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Filter State
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Admin State (Keep existing)
  const [showAdminModal, setShowAdminModal] = useState(false);
  // ... (keep admin state and handlers from previous code if needed, simplified here for brevity of the new feature) ...

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (user && user.role === 'manager') {
      navigate('/manager/dashboard');
    } else if (user && (user.role === 'admin' || user.isAdmin)) {
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const { data } = await API.get(`/courts?page=${page}&limit=10&search=${search}&facility=${filterType}`);
        if (data.courts) {
            setFilteredCourts(data.courts);
            setTotalPages(data.pages);
        } else {
            setFilteredCourts(data); // fallback if it returns array directly somehow
        }
      } catch {
        toast.error('Failed to load courts');
      }
    };
    
    const delayDebounceFn = setTimeout(() => {
      fetchCourts();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [page, search, filterType]);

  return (
    <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: '3rem', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6', marginBottom: '8px' }}>
          <LayoutGrid size={18} />
          <span style={{ fontSize: '0.8rem', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase' }}>Explore Venues</span>
        </div>
        <h1 style={{ margin: 0, fontSize: '2.8rem', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>Available Arenas</h1>
        <p style={{ color: '#9ca3af', marginTop: '8px', fontSize: '1.1rem', maxWidth: '600px' }}>Premium sports facilities across Karachi.</p>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: '20px', 
        marginBottom: '3rem',
        flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.02)',
        padding: '12px',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} size={20} />
          <input 
              type="text" 
              placeholder="Search by arena name or location..." 
              style={{
                width: '100%',
                padding: '16px 16px 16px 48px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '18px',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '16px' }}>
            {['All', 'Futsal', 'Padel', 'Cricket'].map(type => (
                <button 
                    key={type}
                    style={{
                      padding: '10px 20px',
                      background: filterType === type ? '#3b82f6' : 'transparent',
                      color: filterType === type ? 'white' : '#9ca3af',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s',
                      boxShadow: filterType === type ? '0 4px 15px rgba(59, 130, 246, 0.3)' : 'none'
                    }}
                    onClick={() => { setFilterType(type); setPage(1); }}
                >
                    {type}
                </button>
            ))}
        </div>
      </div>

      {/* COURTS GRID */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
        gap: '2.5rem',
        marginBottom: '4rem'
      }}>
        {filteredCourts.map((court) => {
          const currentH = new Date().getHours();
          let isLivePeak = false;
          let liveBasePrice = court.pricePerHour || 0;
          if (court.pricePeak && court.peakStartTime && court.peakEndTime) {
            const pS = parseHourHelper(court.peakStartTime);
            const pE = parseHourHelper(court.peakEndTime);
            if (pS !== null && pE !== null && currentH >= pS && currentH < pE) {
              isLivePeak = true;
              liveBasePrice = court.pricePeak;
            }
          }

          const isDiscountActive = court.discount?.percentage > 0 && 
            (!court.discount.validUntil || new Date() <= new Date(court.discount.validUntil));
          
          let livePrice = liveBasePrice;
          if (isDiscountActive) {
            livePrice = Math.round(liveBasePrice * (1 - court.discount.percentage / 100));
          }

          return (
          <div 
            key={court._id} 
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '32px',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onClick={() => navigate(`/courts/${court._id}`)} 
          >
            {/* Image Section */}
            <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
                {court.images && court.images.length > 0 ? (
                  <img 
                    src={court.images[0]} 
                    alt={court.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                    <Activity size={40} />
                  </div>
                )}
                
                {/* Premium Promo Ribbon */}
                {isDiscountActive && (
                  <div className="theme-discount-ribbon">
                    {court.discount.percentage}% OFF
                  </div>
                )}

                {/* Floating Badges */}
                <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap', zIndex: 5 }}>
                  {(court.facilities || []).map(f => (
                    <span key={f} style={{ 
                      background: 'rgba(15, 23, 42, 0.8)', 
                      backdropFilter: 'blur(10px)', 
                      color: '#60a5fa', 
                      fontSize: '0.65rem', 
                      fontWeight: '900', 
                      padding: '6px 12px', 
                      borderRadius: '8px',
                      textTransform: 'uppercase',
                      border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                      {f}
                    </span>
                  ))}
                </div>
                
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.9), transparent)' }}></div>
            </div>

            {/* Content Section */}
            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.5px' }}>{court.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '0.9rem', marginTop: '6px' }}>
                    <MapPin size={14} color="#ef4444" /> {court.location || 'Karachi'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Hours</span>
                    <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} color="#3b82f6" /> {to12Hour(court.operationalStartTime)} - {to12Hour(court.operationalEndTime)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Status</span>
                    <span style={{ 
                      color: isCurrentlyOpen(court.operationalStartTime, court.operationalEndTime) ? '#10b981' : '#ef4444', 
                      fontSize: '0.75rem', 
                      fontWeight: '800', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px' 
                    }}>
                      <Activity size={12} /> {isCurrentlyOpen(court.operationalStartTime, court.operationalEndTime) ? 'OPEN NOW' : 'CLOSED'}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Live Rate</span>
                      {isLivePeak && (
                        <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '0.65rem', fontWeight: '900', padding: '2px 6px', borderRadius: '4px' }}>
                          ⚡ PEAK HOUR
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'white', fontSize: '1.25rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isDiscountActive ? (
                        <>
                          <span style={{ textDecoration: 'line-through', color: '#6b7280', fontSize: '0.9rem', fontWeight: '600' }}>
                            PKR {liveBasePrice}
                          </span>
                          <span style={{ color: '#10b981' }}>PKR {livePrice}</span>
                        </>
                      ) : (
                        <span>PKR {livePrice}</span>
                      )}
                      <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '500' }}>/hr</span>
                    </div>
                  </div>
                  <button style={{ 
                    background: '#3b82f6', 
                    color: 'white', 
                    border: 'none', 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '16px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.2s'
                  }}>
                    <ChevronRight size={24} />
                  </button>
                </div>
            </div>
          </div>
          );
        })}
        {filteredCourts.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem 0' }}>
            <Search size={48} color="#1e293b" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ color: 'white' }}>No arenas match your search</h3>
            <p style={{ color: '#6b7280' }}>Try adjusting your filters or searching for something else.</p>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '4rem' }}>
          <button 
            disabled={page === 1} 
            onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: page === 1 ? '#4b5563' : 'white',
              borderRadius: '14px',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              fontWeight: '800',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            Previous
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button 
                key={p}
                onClick={() => { setPage(p); window.scrollTo(0, 0); }}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  border: 'none',
                  background: page === p ? '#3b82f6' : 'rgba(255,255,255,0.03)',
                  color: page === p ? 'white' : '#6b7280',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <button 
            disabled={page === totalPages} 
            onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: page === totalPages ? '#4b5563' : 'white',
              borderRadius: '14px',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: '800',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;