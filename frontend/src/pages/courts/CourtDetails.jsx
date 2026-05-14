import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import AuthContext from '../../context/AuthContext';
import { toast } from 'react-toastify';
import AdminCourtView from '../admin/AdminCourtView';
import TimeSlotPicker from '../../components/TimeSlotPicker';
import { 
  Trophy, 
  MapPin, 
  Sparkles, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  X,
  Clock
} from 'lucide-react';

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

const parseHourHelper = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return null;
  const [h] = timeString.split(':').map(Number);
  return Number.isNaN(h) ? null : h;
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
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedSlotsMap, setSelectedSlotsMap] = useState({});
  const [unavailableSlotsMap, setUnavailableSlotsMap] = useState({});
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [newBookingIds, setNewBookingIds] = useState([]);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');

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
        
        const availableSports = found?.facilities || ['Futsal'];
        setSelectedSport(availableSports[0]);
      } catch (error) { console.error(error); }
    };
    fetchCourt();
  }, [id]);

  const handleSportChange = (sport) => {
    setSelectedSport(sport);
    setSelectedSlotsMap({}); // Reset selected slots completely
  };

  useEffect(() => {
    if (date && court && selectedSport) {
      const subCourts = court.courtsDetail?.filter(c => c.sport === selectedSport) || [];
      const facilityNames = subCourts.length > 0 ? subCourts.map(c => c.name) : [selectedSport];

      const fetchAllAvailabilities = async () => {
        const newUnavailableMap = {};
        await Promise.all(facilityNames.map(async (facName) => {
          try {
            const { data } = await API.get(`/bookings/availability?courtId=${court._id}&date=${date}&facility=${facName}`);
            newUnavailableMap[facName] = data;
          } catch (e) {
            console.error(e);
            newUnavailableMap[facName] = [];
          }
        }));
        setUnavailableSlotsMap(newUnavailableMap);
        setSelectedSlotsMap({}); // Keep clear on date change
      };
      fetchAllAvailabilities();
    }
  }, [date, court, selectedSport]);

  const subCourts = court?.courtsDetail?.filter(c => c.sport === selectedSport) || [];
  const facilityNames = subCourts.length > 0 ? subCourts.map(c => c.name) : [selectedSport];

  const calculateTotal = () => {
    if (!court) return 0;
    let sum = 0;
    const isDiscountActive = court.discount?.percentage > 0 && 
      (!court.discount.validUntil || new Date() <= new Date(court.discount.validUntil));

    facilityNames.forEach(facName => {
      const slots = selectedSlotsMap[facName] || [];
      const subCourtObj = court.courtsDetail?.find(c => c.name === facName);
      const basePrice = subCourtObj ? subCourtObj.pricePerHour : (court.pricePerHour || 0);
      const usesPeakPricing = subCourtObj ? subCourtObj.hasPeakPricing : true;
      const customPeakStart = subCourtObj?.hasPeakPricing ? subCourtObj.peakStartTime : court.peakStartTime;
      const customPeakEnd = subCourtObj?.hasPeakPricing ? subCourtObj.peakEndTime : court.peakEndTime;
      const customPricePeak = subCourtObj?.hasPeakPricing ? subCourtObj.pricePeak : court.pricePeak;

      slots.forEach(slotStr => {
        const startH = parseHourHelper(slotStr.split('-')[0]);
        let currentBase = basePrice;
        
        if (usesPeakPricing && customPricePeak && customPeakStart && customPeakEnd) {
          const pHStart = parseHourHelper(customPeakStart);
          const pHEnd = parseHourHelper(customPeakEnd);
          if (pHStart !== null && pHEnd !== null && startH >= pHStart && startH < pHEnd) {
            currentBase = customPricePeak;
          }
        }

        if (isDiscountActive) {
          currentBase = Math.round(currentBase * (1 - court.discount.percentage / 100));
        }
        sum += currentBase;
      });
    });
    return sum;
  };

  const calculatedTotalPrice = calculateTotal();
  const totalSelectedSlotsCount = Object.values(selectedSlotsMap).reduce((acc, arr) => acc + arr.length, 0);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (totalSelectedSlotsCount === 0) {
      toast.error('Please select at least one time slot');
      return;
    }
    if (totalSelectedSlotsCount < (court?.minSlots || 1)) {
      toast.error(`This venue requires a minimum booking of ${court?.minSlots} consecutive hours.`);
      return;
    }

    const groupTimeSlots = (slotsArray) => {
      if (!slotsArray || slotsArray.length === 0) return [];
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
      let allCreatedBookingIds = [];

      const calculateFacilityTotal = (facName, slotsArr) => {
        let sum = 0;
        const isDiscountActive = court.discount?.percentage > 0 && 
          (!court.discount.validUntil || new Date() <= new Date(court.discount.validUntil));
        const subCourtObj = court.courtsDetail?.find(c => c.name === facName);
        const basePrice = subCourtObj ? subCourtObj.pricePerHour : (court.pricePerHour || 0);
        const usesPeakPricing = subCourtObj ? subCourtObj.hasPeakPricing : true;
        const customPeakStart = subCourtObj?.hasPeakPricing ? subCourtObj.peakStartTime : court.peakStartTime;
        const customPeakEnd = subCourtObj?.hasPeakPricing ? subCourtObj.peakEndTime : court.peakEndTime;
        const customPricePeak = subCourtObj?.hasPeakPricing ? subCourtObj.pricePeak : court.pricePeak;

        slotsArr.forEach(slotStr => {
          const startH = parseHourHelper(slotStr.split('-')[0]);
          let currentBase = basePrice;
          if (usesPeakPricing && customPricePeak && customPeakStart && customPeakEnd) {
            const pHStart = parseHourHelper(customPeakStart);
            const pHEnd = parseHourHelper(customPeakEnd);
            if (pHStart !== null && pHEnd !== null && startH >= pHStart && startH < pHEnd) {
              currentBase = customPricePeak;
            }
          }
          if (isDiscountActive) {
            currentBase = Math.round(currentBase * (1 - court.discount.percentage / 100));
          }
          sum += currentBase;
        });
        return sum;
      };

      // Submit individual entries sequentially per facility to preserve clean API contracts
      for (let facName of facilityNames) {
        const slotsForFac = selectedSlotsMap[facName] || [];
        if (slotsForFac.length > 0) {
          const timeBlocks = groupTimeSlots(slotsForFac);
          const facTotal = calculateFacilityTotal(facName, slotsForFac);
          const { data } = await API.post('/bookings', { 
            courtId: id, 
            date, 
            facility: facName, 
            timeBlocks, 
            totalPrice: facTotal 
          });
          allCreatedBookingIds.push(...data.map(b => b._id));
        }
      }

      setNewBookingIds(allCreatedBookingIds);
      setPaymentModalOpen(true);
      toast.info('Booking placed successfully. Please submit payment proof.');
    } catch (error) { 
      toast.error(error.response?.data?.message || 'Failed to complete booking'); 
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const removeScreenshot = () => {
    setPaymentScreenshot(null);
    setScreenshotPreview('');
  };

  const handleSubmitPaymentProof = async () => {
    if (!paymentScreenshot) {
      toast.error('Please upload a screenshot of your payment transfer');
      return;
    }
    try {
      await Promise.all(
        newBookingIds.map((bookingId) => {
          const formData = new FormData();
          formData.append('paymentScreenshot', paymentScreenshot);
          return API.put(`/bookings/${bookingId}/submit-payment-proof`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        })
      );
      toast.success('Payment proof submitted. Booking is now pending manager approval.');
      setPaymentModalOpen(false);
      removeScreenshot();
      navigate('/profile');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit payment proof');
    }
  };

  // --- ADMIN LOGIC ---
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
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>{court.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '1.1rem', marginTop: '12px' }}>
          <MapPin size={20} color="#ef4444" /> {court.location}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          {(court.facilities || []).map(f => (
            <span key={f} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontSize: '0.75rem', fontWeight: '900', padding: '6px 14px', borderRadius: '10px', textTransform: 'uppercase', border: '1px solid rgba(59, 130, 246, 0.2)' }}>{f}</span>
          ))}
        </div>
      </div>

      <div className="details-layout">
        <div className="left-column">
          <div className="gallery-box" style={{ marginBottom: '20px', position: 'relative' }}>
            {activeImage ? (
              <>
                <img src={activeImage} className="main-image" style={{ transition: 'opacity 0.3s ease-in-out' }} />
                {court.images && court.images.length > 1 && (
                  <>
                    <button onClick={(e) => { e.preventDefault(); prevImage(); }} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', zIndex: 10 }}>
                      <ChevronLeft size={24} />
                    </button>
                    <button onClick={(e) => { e.preventDefault(); nextImage(); }} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', zIndex: 10 }}>
                      <ChevronRight size={24} />
                    </button>
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
            <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={24} color="#60a5fa" />
              </div>
              <div style={{ minWidth: 0 }}>
                <h4 style={{ margin: 0, color: '#60a5fa', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>Operating Hours</h4>
                <p style={{ margin: 0, color: '#ffffff', fontWeight: '800', fontSize: 'clamp(1rem, 3.5vw, 1.3rem)' }}>
                  {to12Hour(court.operationalStartTime || '00:00')} - {to12Hour(court.operationalEndTime || '24:00')}
                </p>
              </div>
            </div>

            <p className="desc-text" style={{ fontSize: '1.05rem', lineHeight: '1.7' }}>{court.description}</p>
            
            <div style={{ marginTop: '3rem' }}>
              <h3 style={{ fontSize: '1.4rem', color: 'white', fontWeight: '900', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} color="#facc15" /> Available Amenities
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
                {(court.amenities?.length ? court.amenities : ['Parking', 'Showers', 'Cafe']).map(amenity => (
                  <div key={amenity} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={18} color="#10b981" />
                    </div>
                    <span style={{ color: 'white', fontWeight: '700', fontSize: '0.9rem' }}>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
            {court.googleMapLink && (
              <div style={{ marginTop: '12px' }}>
                <h3>Location Map</h3>
                {getEmbedMapUrl(court.googleMapLink) ? (
                  <iframe
                    title="Court location map"
                    src={getEmbedMapUrl(court.googleMapLink)}
                    style={{ width: '100%', height: '260px', border: '1px solid #333', borderRadius: '10px' }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : null}
              </div>
            )}
            {court.reviews && court.reviews.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h3>Reviews ({court.numReviews}) - {court.rating?.toFixed(1)} ★</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  {court.reviews.map(r => (
                    <div key={r._id} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid #333' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong>{r.name}</strong>
                        <span style={{ color: '#facc15' }}>{'★'.repeat(r.rating)}</span>
                      </div>
                      <p style={{ margin: 0, color: '#ddd', fontSize: '0.9rem' }}>{r.comment}</p>
                      <small style={{ color: '#888', display: 'block', marginTop: '8px' }}>{new Date(r.createdAt).toLocaleDateString()}</small>
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
                  <div className="price-display">
                    PKR {totalSelectedSlotsCount > 0 ? calculatedTotalPrice : court?.pricePerHour} 
                    <span>{totalSelectedSlotsCount > 0 ? ' / total' : ' / base hr'}</span>
                  </div>
                  {court?.minSlots >= 2 && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', padding: '8px 12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ★ Minimum Booking: {court.minSlots} consecutive hours
                    </div>
                  )}
                </div>
                <form onSubmit={handleBooking}>
                  {/* STEP 1: Select Facility/Sport Type */}
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ color: '#9ca3af', fontWeight: '800', fontSize: '0.75rem', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Step 1: Select Sport Facility
                    </label>
                    <select 
                      style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: '#60a5fa', fontWeight: '800', width: '100%', fontSize: '0.85rem' }} 
                      value={selectedSport} 
                      onChange={e => handleSportChange(e.target.value)} 
                      required
                    >
                      {(court.facilities || []).map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  {/* STEP 2: Choose Booking Date */}
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ color: '#9ca3af', fontWeight: '800', fontSize: '0.75rem', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Step 2: Choose Booking Date
                    </label>
                    <input 
                      type="date" 
                      min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]} 
                      max={new Date(Date.now() + 28 * 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                      value={date} 
                      onChange={e => setDate(e.target.value)} 
                      required 
                    />
                  </div>

                  {/* SIMULTANEOUS SUB-COURTS DISPLAY */}
                  {date ? (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h4 style={{ color: '#facc15', fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px' }}>
                        ★ Available Sub-Courts & Time Slots
                      </h4>
                      {facilityNames.map((facName) => {
                        const subCourtObj = court.courtsDetail?.find(c => c.name === facName);
                        const baseRate = subCourtObj ? subCourtObj.pricePerHour : (court.pricePerHour || 0);
                        const hasPeak = subCourtObj ? (subCourtObj.hasPeakPricing && subCourtObj.pricePeak) : false;
                        
                        return (
                          <div key={facName} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginBottom: '12px' }}>
                              <h5 style={{ margin: 0, color: 'white', fontSize: '1.05rem', fontWeight: '800' }}>{facName}</h5>
                              <span style={{ fontSize: '0.75rem', color: '#9ca3af', background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: '8px', fontWeight: '700' }}>
                                Base: PKR {baseRate}/hr {hasPeak ? `| Peak: PKR ${subCourtObj.pricePeak}/hr` : '| Flat Rate'}
                              </span>
                            </div>
                            <TimeSlotPicker
                              selectedSlots={selectedSlotsMap[facName] || []}
                              onChange={(newSlots) => {
                                setSelectedSlotsMap({ [facName]: newSlots });
                              }}
                              unavailableSlots={unavailableSlotsMap[facName] || []}
                              startHour={parseHour(court.operationalStartTime, 0)}
                              endHour={parseHour(court.operationalEndTime, 24)}
                              selectedDate={date}
                              court={court}
                              selectedFacility={facName}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px dashed rgba(59, 130, 246, 0.2)', padding: '24px', borderRadius: '16px', textAlign: 'center', marginTop: '1rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                      Please select a Date above to view all corresponding sub-courts and available timeslots simultaneously.
                    </div>
                  )}

                  <button type="submit" className="book-btn large confirm-btn-styled" disabled={totalSelectedSlotsCount === 0} style={{ marginTop: '1rem' }}>
                    Confirm Booking ({totalSelectedSlotsCount} slot{totalSelectedSlotsCount !== 1 ? 's' : ''})
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ marginBottom: '15px', color: '#aaa' }}>Please login to view availability and book courts.</p>
                <button onClick={() => navigate('/login')} className="book-btn large">Login to Book</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {paymentModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '10px' }}>Awaiting Payment</h3>
            <p style={{ color: '#ccc', marginBottom: '12px' }}>Send payment now, then submit proof to continue for manager approval.</p>
            <div style={{ padding: '12px', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '8px', marginBottom: '16px', background: 'rgba(16,185,129,0.08)' }}>
              <p style={{ margin: '6px 0', color: '#cfcfcf' }}>Advance Amount: PKR {court.advanceRequired || 0}</p>
              <p style={{ margin: '6px 0', color: '#cfcfcf' }}>Bank: {court.paymentBank || '-'}</p>
              <p style={{ margin: '6px 0', color: '#cfcfcf' }}>Account Title: {court.paymentAccountTitle || '-'}</p>
              <p style={{ margin: '6px 0', color: '#cfcfcf' }}>Account Number: {court.paymentAccountNumber || '-'}</p>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.85rem' }}>Payment Transfer Screenshot</label>
              {screenshotPreview ? (
                <div className="screenshot-preview-wrapper">
                  <img src={screenshotPreview} alt="Screenshot preview" className="screenshot-preview-img" />
                  <button type="button" className="remove-screenshot-btn" onClick={removeScreenshot} title="Remove image">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="screenshot-uploader-area">
                  <input type="file" accept="image/jpeg,image/png,image/jpg" onChange={handleFileChange} />
                  <div className="uploader-icon">
                    <UploadCloud size={28} />
                  </div>
                  <p className="uploader-title">Click to upload screenshot</p>
                  <p className="uploader-subtitle">Supports JPEG, PNG, JPG</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="confirm-btn" onClick={handleSubmitPaymentProof}>Submit Payment Proof</button>
              <button className="cancel-btn" onClick={() => { setPaymentModalOpen(false); removeScreenshot(); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourtDetails;
