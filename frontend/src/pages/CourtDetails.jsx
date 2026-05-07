import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';
import AdminCourtView from './AdminCourtView';
import TimeSlotPicker from '../components/TimeSlotPicker';

const to12Hour = (time24 = '00:00') => {
  const [hourRaw] = time24.split(':').map(Number);
  const hour = Number.isNaN(hourRaw) ? 0 : hourRaw;
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const hour12 = normalized % 12 || 12;
  return `${hour12}:00 ${suffix}`;
};

const parseHour = (timeString, fallback) => {
  if (!timeString || typeof timeString !== 'string') return fallback;
  const [h] = timeString.split(':').map(Number);
  if (Number.isNaN(h)) return fallback;
  return h;
};

const getEmbedMapUrl = (url) => {
  if (!url) return '';
  try {
    const iframeSrcMatch = url.match(/src=["']([^"']+)["']/i);
    if (iframeSrcMatch?.[1]) return iframeSrcMatch[1];
    const parsed = new URL(url);
    if (parsed.pathname.includes('/maps/embed') || parsed.searchParams.has('pb')) {
      return url;
    }
    if (parsed.hostname.includes('google.com')) {
      const q = parsed.searchParams.get('q');
      if (q) return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
      const atMatch = parsed.pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (atMatch) return `https://www.google.com/maps?q=${atMatch[1]},${atMatch[2]}&output=embed`;
      return `${url}${url.includes('?') ? '&' : '?'}output=embed`;
    }
    return '';
  } catch {
    return '';
  }
};

const CourtDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [court, setCourt] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  
  // --- SLIDER LOGIC ---
  const nextImage = () => {
    if (!court?.images?.length) return;
    setActiveImage(prev => {
      const idx = court.images.indexOf(prev);
      return court.images[(idx + 1) % court.images.length];
    });
  };

  const prevImage = () => {
    if (!court?.images?.length) return;
    setActiveImage(prev => {
      const idx = court.images.indexOf(prev);
      return court.images[(idx - 1 + court.images.length) % court.images.length];
    });
  };

  useEffect(() => {
    if (!court || !court.images || court.images.length <= 1) return;
    const interval = setInterval(nextImage, 7000);
    return () => clearInterval(interval);
  }, [court, activeImage]);
  
  const [date, setDate] = useState('');
  const [facility, setFacility] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [activePrice, setActivePrice] = useState(0);
  const [unavailableSlots, setUnavailableSlots] = useState([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [newBookingIds, setNewBookingIds] = useState([]);
  const [senderName, setSenderName] = useState('');
  const [transactionIdShort, setTransactionIdShort] = useState('');

  // --- MANAGER LOGIC ---
  useEffect(() => {
      if (user && user.role === 'manager') {
          navigate('/manager/dashboard');
      }
  }, [user, navigate]);

  // --- STANDARD USER LOGIC ---
  useEffect(() => {
    const fetchCourt = async () => {
      try {
        const { data } = await API.get('/courts?all=true');
        const found = data.find(c => c._id === id);
        setCourt(found);
        if (found?.images?.length > 0) setActiveImage(found.images[0]);
        setFacility(found?.facilities?.[0] || '');
        setActivePrice(found?.pricePerHour || 0);
      } catch (error) { console.error(error); }
    };
    fetchCourt();
  }, [id]);

  useEffect(() => {
    if (date && court && facility) {
        const day = new Date(date).getDay();
        const isWeekend = (day === 0 || day === 6); 
        if (isWeekend && court.priceWeekend) setActivePrice(court.priceWeekend);
        else setActivePrice(court.pricePerHour);

        const fetchAvailability = async () => {
            try {
                const { data } = await API.get(`/bookings/availability?courtId=${court._id}&date=${date}&facility=${facility}`);
                setUnavailableSlots(data);
                setSelectedSlots([]); // Clear when date changes
            } catch(e) { console.error(e); }
        };
        fetchAvailability();
    }
  }, [date, court, facility]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (selectedSlots.length === 0) {
      toast.error('Please select at least one time slot');
      return;
    }
    if (!facility) {
      toast.error('Please select a facility');
      return;
    }
    const groupTimeSlots = (slotsArray) => {
      const sorted = [...slotsArray].sort();
      const blocks = [];
      let currentStart = sorted[0].split('-')[0];
      let currentEnd = sorted[0].split('-')[1];
      for (let i = 1; i < sorted.length; i++) {
        const [nextStart, nextEnd] = sorted[i].split('-');
        if (currentEnd === nextStart) {
          currentEnd = nextEnd;
        } else {
          blocks.push({ startTime: currentStart, endTime: currentEnd });
          currentStart = nextStart;
          currentEnd = nextEnd;
        }
      }
      blocks.push({ startTime: currentStart, endTime: currentEnd });
      return blocks;
    };

    try {
      const timeBlocks = groupTimeSlots(selectedSlots);
      const totalPrice = activePrice * selectedSlots.length;
      const { data } = await API.post('/bookings', { courtId: id, date, facility, timeBlocks, totalPrice });
      setNewBookingIds(data.map((b) => b._id));
      setPaymentModalOpen(true);
      toast.info('Booking placed. Complete payment proof to move it to pending approval.');
    } catch (error) { toast.error(error.response?.data?.message || 'Failed'); }
  };

  const handleSubmitPaymentProof = async () => {
    if (!senderName.trim()) {
      toast.error('Please enter sender account name');
      return;
    }
    if (!/^\d{4}$/.test(transactionIdShort)) {
      toast.error('Please enter exactly 4 digits for TID');
      return;
    }
    try {
      await Promise.all(
        newBookingIds.map((bookingId) =>
          API.put(`/bookings/${bookingId}/submit-payment-proof`, {
            senderName,
            transactionIdShort
          })
        )
      );
      toast.success('Payment proof submitted. Booking is now pending manager approval.');
      setPaymentModalOpen(false);
      navigate('/profile');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit payment proof');
    }
  };

  // --- ADMIN LOGIC ---
  // If admin, hijack the view to show the Admin Control Panel
  if (user && (user.isAdmin || user.role === 'admin')) {
      return (
        <div className="page-container">
            <AdminCourtView courtId={id} />
        </div>
      );
  }

  if (!court) return <div className="page-container">Loading...</div>;

  return (
    <div className="page-container">
        <div className="details-header">
            <h1>{court.name}</h1>
            <div style={{marginTop:'10px'}}>
              <span className="badge large">{(court.facilities || []).join(', ')}</span>
            </div>
        </div>
        
        <div className="details-layout">
          <div className="left-column">
            <div className="gallery-box" style={{marginBottom:'20px', position: 'relative'}}>
                {activeImage ? (
                  <>
                    <img src={activeImage} className="main-image" style={{ transition: 'opacity 0.3s ease-in-out' }} />
                    {court.images && court.images.length > 1 && (
                      <>
                        <button onClick={(e) => { e.preventDefault(); prevImage(); }} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', zIndex: 10 }}>❮</button>
                        <button onClick={(e) => { e.preventDefault(); nextImage(); }} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', zIndex: 10 }}>❯</button>
                        <div style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 10, background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: '20px' }}>
                          {court.images.map((img, idx) => (
                            <div key={idx} onClick={() => setActiveImage(img)} style={{ width: '10px', height: '10px', borderRadius: '50%', background: activeImage === img ? '#3b82f6' : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'background 0.2s' }} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : <div className="placeholder-large">No Image</div>}
            </div>
            
            <div className="info-box">
                <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '12px', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🕒
                    </div>
                    <div>
                        <h4 style={{ margin: 0, color: '#60a5fa', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Operating Hours</h4>
                        <p style={{ margin: 0, color: '#ffffff', fontWeight: '800', fontSize: '1.4rem' }}>
                            {to12Hour(court.operationalStartTime || '00:00')} - {to12Hour(court.operationalEndTime || '24:00')}
                        </p>
                    </div>
                </div>
                
                <p className="desc-text" style={{ fontSize: '1.05rem', lineHeight: '1.7' }}>{court.description}</p>
                <h3 style={{ marginTop: '2rem' }}>Amenities</h3>
                <div className="amenities-list">
                    <ul>
                      {(court.amenities?.length ? court.amenities : ['Parking', 'Showers', 'Floodlights', 'Cafe']).map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                </div>
                {court.googleMapLink && (
                  <div style={{marginTop:'12px'}}>
                    <h3>Location Map</h3>
                    {getEmbedMapUrl(court.googleMapLink) ? (
                      <iframe
                        title="Court location map"
                        src={getEmbedMapUrl(court.googleMapLink)}
                        style={{width:'100%', height:'260px', border:'1px solid #333', borderRadius:'10px'}}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : null}
                  </div>
                )}
                {court.reviews && court.reviews.length > 0 && (
                  <div style={{marginTop:'2rem'}}>
                    <h3>Reviews ({court.numReviews}) - {court.rating?.toFixed(1)} ⭐</h3>
                    <div style={{display:'flex', flexDirection:'column', gap:'12px', marginTop:'12px'}}>
                      {court.reviews.map(r => (
                        <div key={r._id} style={{padding:'12px', background:'rgba(255,255,255,0.05)', borderRadius:'8px', border:'1px solid #333'}}>
                          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                            <strong>{r.name}</strong>
                            <span style={{color:'#facc15'}}>{'⭐'.repeat(r.rating)}</span>
                          </div>
                          <p style={{margin:0, color:'#ddd', fontSize:'0.9rem'}}>{r.comment}</p>
                          <small style={{color:'#888', display:'block', marginTop:'8px'}}>{new Date(r.createdAt).toLocaleDateString()}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
            
            <div className="booking-sidebar">
                <div className="booking-card">
                    {user ? (
                        <div className="book-slot-container">
                            <div className="book-slot-header">
                                <h3>Book Slot</h3>
                                <div className="price-display">PKR {activePrice * (selectedSlots.length || 1)} <span>{selectedSlots.length > 0 ? '/ total' : '/ hr'}</span></div>
                            </div>
                            <form onSubmit={handleBooking}>
                                <div className="form-group">
                                    <label>Select Facility</label>
                                    <select value={facility} onChange={e => setFacility(e.target.value)} required>
                                      {(court.facilities || []).map((f) => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input type="date" min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]} value={date} onChange={e => setDate(e.target.value)} required />
                                </div>
                                {date && (
                                    <div className="form-group">
                                        <label>Select Time Slots</label>
                                        <TimeSlotPicker
                                          selectedSlots={selectedSlots}
                                          onChange={setSelectedSlots}
                                          unavailableSlots={unavailableSlots}
                                          startHour={parseHour(court.operationalStartTime, 0)}
                                          endHour={parseHour(court.operationalEndTime, 24)}
                                          selectedDate={date}
                                        />
                                    </div>
                                )}
                                <button type="submit" className="book-btn large confirm-btn-styled" disabled={selectedSlots.length === 0}>Confirm Booking</button>
                            </form>
                        </div>
                    ) : (
                        <div style={{textAlign:'center', padding:'20px 0'}}>
                            <p style={{marginBottom:'15px', color:'#aaa'}}>Please login to view availability and book courts.</p>
                            <button onClick={() => navigate('/login')} className="book-btn large">Login to Book</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
        {paymentModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 style={{marginBottom:'10px'}}>Awaiting Payment</h3>
              <p style={{color:'#ccc', marginBottom:'12px'}}>Send payment now, then submit proof to continue for manager approval.</p>
              <div style={{padding:'12px', border:'1px solid rgba(16,185,129,0.4)', borderRadius:'8px', marginBottom:'12px', background:'rgba(16,185,129,0.08)'}}>
                <p style={{margin:'6px 0', color:'#cfcfcf'}}>Advance Amount: PKR {court.advanceRequired || 0}</p>
                <p style={{margin:'6px 0', color:'#cfcfcf'}}>Bank: {court.paymentBank || '-'}</p>
                <p style={{margin:'6px 0', color:'#cfcfcf'}}>Account Title: {court.paymentAccountTitle || '-'}</p>
                <p style={{margin:'6px 0', color:'#cfcfcf'}}>Account Number: {court.paymentAccountNumber || '-'}</p>
              </div>
              <div className="form-group">
                <label>Sender Account Name</label>
                <input value={senderName} onChange={e => setSenderName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Last 4 Digits of TID</label>
                <input value={transactionIdShort} onChange={e => setTransactionIdShort(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength="4" pattern="\d{4}" title="Please enter exactly 4 numbers" />
              </div>
              <div className="modal-actions">
                <button className="confirm-btn" onClick={handleSubmitPaymentProof}>Submit Payment Proof</button>
                <button className="cancel-btn" onClick={() => setPaymentModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default CourtDetails;