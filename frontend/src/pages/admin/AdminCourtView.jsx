import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import TimeSlotPicker from '../../components/TimeSlotPicker';
import { 
  BarChart3, 
  Calendar, 
  Settings, 
  Slash, 
  ChevronLeft, 
  TrendingUp, 
  Users, 
  CalendarCheck, 
  XCircle, 
  Save, 
  MapPin, 
  Globe, 
  CreditCard, 
  Clock, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  X,
  Trash2
} from 'lucide-react';

const parseHour = (timeString, fallback) => {
  if (!timeString || typeof timeString !== 'string') return fallback;
  const [h] = timeString.split(':').map(Number);
  if (Number.isNaN(h)) return fallback;
  return h;
};

const AdminCourtView = ({ courtId }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); 
  const [editForm, setEditForm] = useState({});
  const [blockForm, setBlockForm] = useState({ date: '', facility: '', timeBlocks: [] });
  const [unavailableSlots, setUnavailableSlots] = useState([]);
  const [images, setImages] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [subCourtInput, setSubCourtInput] = useState({
    name: '', sport: 'Futsal', pricePerHour: '', hasPeakPricing: false, peakStartTime: '18:00', peakEndTime: '23:00', pricePeak: ''
  });
  const hourOptions = Array.from({ length: 25 }, (_, h) => `${h.toString().padStart(2, '0')}:00`);
  const formatAMPM = (timeStr) => {
    if (!timeStr) return 'None';
    if (timeStr === '24:00') return '12:00 AM';
    const [h] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:00 ${period}`;
  };

  const handleDownloadScreenshot = async (url, bookingId) => {
    try {
      toast.info('Downloading screenshot...');
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `payment_screenshot_${bookingId}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await API.get(`/admin/court/${courtId}/stats`);
        setData(data);
        setEditForm({
            name: data.court.name,
            location: data.court.location,
            facilities: data.court.facilities || [],
            amenities: data.court.amenities || [],
            courtsDetail: data.court.courtsDetail || [],
            googleMapLink: data.court.googleMapLink || '',
            paymentBank: data.court.paymentBank || '',
            paymentAccountTitle: data.court.paymentAccountTitle || '',
            paymentAccountNumber: data.court.paymentAccountNumber || '',
            advanceRequired: data.court.advanceRequired || 0,
            pricePerHour: data.court.pricePerHour,
            minSlots: data.court.minSlots || 1,
            discountPercentage: data.court.discount?.percentage || 0,
            discountValidUntil: data.court.discount?.validUntil ? data.court.discount.validUntil.split('T')[0] : '',
            discountTargetTier: data.court.discount?.targetTier || 'both',
            peakStartTime: data.court.peakStartTime || '',
            peakEndTime: data.court.peakEndTime || '',
            pricePeak: data.court.pricePeak || '',
            description: data.court.description,
            operationalStartTime: data.court.operationalStartTime || '00:00',
            operationalEndTime: data.court.operationalEndTime || '24:00'
        });
        setBlockForm((prev) => ({ ...prev, facility: data.court.facilities?.[0] || '' }));
      } catch (err) {
        toast.error('Failed to load court data.');
      }
    };
    if(courtId) fetchData(); 
  }, [courtId]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!blockForm.date || !blockForm.facility) return;
      try {
        const { data: slots } = await API.get(`/bookings/availability?courtId=${courtId}&date=${blockForm.date}&facility=${blockForm.facility}`);
        setUnavailableSlots(slots);
        setBlockForm((prev) => ({ ...prev, timeBlocks: [] }));
      } catch {
        toast.error('Failed to load availability');
      }
    };
    fetchAvailability();
  }, [blockForm.date, blockForm.facility, courtId]);

  const handleUpdate = async (e) => {
      e.preventDefault();
      try {
        const formData = new FormData();
        Object.keys(editForm).forEach(key => {
          if (key === 'facilities' || key === 'amenities') {
            (editForm[key] || []).forEach(item => formData.append(key, item));
          } else if (key === 'courtsDetail') {
            formData.append('courtsDetail', JSON.stringify(editForm.courtsDetail || []));
          } else if (editForm[key] !== undefined && editForm[key] !== null) {
            formData.append(key, editForm[key]);
          }
        });
        for (let i = 0; i < images.length; i++) {
          formData.append('images', images[i]);
        }
        await API.put(`/admin/court/${courtId}`, formData);
        toast.success('Facility settings updated successfully');
        setImages([]);
      } 
      catch (error) { toast.error('Update failed'); }
  };

  const handleAddSubCourt = () => {
    if (!subCourtInput.name || !subCourtInput.pricePerHour) {
      toast.error('Please enter sub-court name and base price');
      return;
    }
    setEditForm(prev => ({
      ...prev,
      courtsDetail: [...(prev.courtsDetail || []), {
        ...subCourtInput,
        pricePerHour: Number(subCourtInput.pricePerHour),
        pricePeak: subCourtInput.pricePeak ? Number(subCourtInput.pricePeak) : undefined
      }]
    }));
    setSubCourtInput({ name: '', sport: 'Futsal', pricePerHour: '', hasPeakPricing: false, peakStartTime: '18:00', peakEndTime: '23:00', pricePeak: '' });
  };

  const handleRemoveSubCourt = (index) => {
    setEditForm(prev => ({
      ...prev,
      courtsDetail: (prev.courtsDetail || []).filter((_, i) => i !== index)
    }));
  };

  const toggleEditFacility = (facility) => {
    setEditForm((prev) => {
      const current = prev.facilities || [];
      const next = current.includes(facility) ? current.filter((f) => f !== facility) : [...current, facility];
      return { ...prev, facilities: next.length ? next : current };
    });
  };

  const toggleEditAmenity = (amenity) => {
    setEditForm((prev) => {
      const current = prev.amenities || [];
      if (current.includes(amenity)) return { ...prev, amenities: current.filter((a) => a !== amenity) };
      if (current.length >= 5) return prev;
      return { ...prev, amenities: [...current, amenity] };
    });
  };

  const handleBlock = async (e) => {
      e.preventDefault();
      const grouped = (() => {
        const sorted = [...blockForm.timeBlocks].sort();
        if (!sorted.length) return [];
        const blocks = [];
        let currentStart = sorted[0].split('-')[0];
        let currentEnd = sorted[0].split('-')[1];
        for (let i = 1; i < sorted.length; i++) {
          const [nextStart, nextEnd] = sorted[i].split('-');
          if (currentEnd === nextStart) currentEnd = nextEnd;
          else {
            blocks.push({ startTime: currentStart, endTime: currentEnd });
            currentStart = nextStart;
            currentEnd = nextEnd;
          }
        }
        blocks.push({ startTime: currentStart, endTime: currentEnd });
        return blocks;
      })();

      if (!grouped.length) {
        toast.error('Select at least one time slot');
        return;
      }
      try {
        await API.post('/admin/block-slot', { courtId, facility: blockForm.facility, date: blockForm.date, timeBlocks: grouped });
        toast.success('Time slots blocked successfully');
      } 
      catch (error) { toast.error('Block failed'); }
  };

  if (!data) return <div style={{padding:'4rem', color:'white', textAlign:'center'}}><AlertCircle size={48} style={{opacity: 0.5, marginBottom: '1rem'}} /><p>Loading Management Console...</p></div>;

  return (
    <div className="admin-view-container" style={{ paddingBottom: '4rem' }}>
        {/* HEADER SECTION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
                <button 
                    onClick={() => navigate('/admin/dashboard')} 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px', 
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                      color: '#9ca3af', padding: '8px 16px', borderRadius: '10px', 
                      cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                      transition: 'all 0.2s', marginBottom: '1rem'
                    }}
                    onMouseEnter={e => {e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='white'}}
                    onMouseLeave={e => {e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#9ca3af'}}
                >
                    <ChevronLeft size={16} /> BACK TO DASHBOARD
                </button>
                <h1 style={{ color: 'white', fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-1px' }}>
                  ADMIN COMMAND: <span style={{ color: '#3b82f6' }}>{data.court.name}</span>
                </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#3b82f6', letterSpacing: '1px' }}>MANAGEMENT CONSOLE</div>
              </div>
              <span className="badge" style={{ background: 'linear-gradient(135deg, #3b82f6, #1e40af)', color: 'white', padding: '8px 16px', borderRadius: '12px', fontWeight: '800', fontSize: '0.75rem', border: 'none', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>ADMIN</span>
            </div>
        </div>

        {/* NAVIGATION TABS */}
        <div style={{ 
          display: 'flex', gap: '8px', 
          background: 'rgba(255,255,255,0.03)', 
          padding: '6px', borderRadius: '16px', 
          border: '1px solid rgba(255,255,255,0.05)',
          marginBottom: '2.5rem', overflowX: 'auto', whiteSpace: 'nowrap'
        }}>
            {[
              { id: 'overview', label: 'ANALYTICS', icon: <BarChart3 size={18} /> },
              { id: 'bookings', label: 'BOOKINGS', icon: <Calendar size={18} /> },
              { id: 'settings', label: 'SETTINGS', icon: <Settings size={18} /> },
              { id: 'block', label: 'BLOCK TIME', icon: <Slash size={18} /> }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ 
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  padding: '12px 24px', borderRadius: '12px',
                  background: activeTab === tab.id ? '#3b82f6' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#9ca3af',
                  border: 'none', cursor: 'pointer',
                  fontWeight: '800', fontSize: '0.85rem',
                  transition: 'all 0.3s ease',
                  boxShadow: activeTab === tab.id ? '0 8px 20px rgba(59, 130, 246, 0.2)' : 'none'
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
        </div>

        {/* TAB CONTENT: ANALYTICS */}
        {activeTab === 'overview' && (
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '50%', filter: 'blur(20px)' }}></div>
                  <TrendingUp size={24} color="#3b82f6" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>REVENUE</h3>
                  <p style={{ color: 'white', fontSize: '2rem', fontWeight: '900' }}>PKR {data.stats.totalRevenue.toLocaleString()}</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                  <Users size={24} color="#10b981" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>TOTAL USERS</h3>
                  <p style={{ color: 'white', fontSize: '2rem', fontWeight: '900' }}>{data.stats.uniqueUserCount}</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                  <CalendarCheck size={24} color="#8b5cf6" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>ACTIVE BOOKINGS</h3>
                  <p style={{ color: 'white', fontSize: '2rem', fontWeight: '900' }}>{data.stats.totalBookings}</p>
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.03)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.1)', position: 'relative', overflow: 'hidden' }}>
                  <XCircle size={24} color="#ef4444" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', opacity: 0.8 }}>CANCELLED</h3>
                  <p style={{ color: 'white', fontSize: '2rem', fontWeight: '900' }}>{data.stats.canceledBookings}</p>
                </div>
            </div>
        )}

        {/* TAB CONTENT: BOOKINGS */}
        {activeTab === 'bookings' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="bookings-table" style={{ borderCollapse: 'separate', borderSpacing: '0 8px', margin: '0', padding: '1rem' }}>
                        <thead style={{ background: 'transparent' }}>
                          <tr>
                            <th style={{ padding: '1rem', border: 'none', color: '#6b7280', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase' }}>User / Athlete</th>
                            <th style={{ padding: '1rem', border: 'none', color: '#6b7280', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase' }}>Schedule</th>
                            <th style={{ padding: '1rem', border: 'none', color: '#6b7280', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase' }}>Facility Type</th>
                            <th style={{ padding: '1rem', border: 'none', color: '#6b7280', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase' }}>Payment Proof</th>
                            <th style={{ padding: '1rem', border: 'none', color: '#6b7280', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase' }}>Current Status</th>
                          </tr>
                        </thead>
                        <tbody>
                            {data.bookings.map(b => (
                                <tr key={b._id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                    <td style={{ padding: '1.25rem', border: 'none', borderRadius: '12px 0 0 12px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                                          <Users size={20} />
                                        </div>
                                        <div>
                                          <div style={{ color: 'white', fontWeight: '700' }}>{b.user ? b.user.name : 'System Block'}</div>
                                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{b.user ? b.user.email : 'ADMINISTRATOR'}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ padding: '1.25rem', border: 'none' }}>
                                      <div style={{ color: 'white', fontWeight: '600' }}>{b.date}</div>
                                      <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '700' }}>{b.startTime} - {b.endTime}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem', border: 'none' }}>
                                      <span style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', color: '#60a5fa', fontSize: '0.8rem', fontWeight: '800' }}>{(b.facility || b.type).toUpperCase()}</span>
                                    </td>
                                    <td style={{ padding: '1.25rem', border: 'none' }}>
                                      {b.paymentScreenshot ? (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                          <button 
                                            type="button" 
                                            onClick={() => setPreviewImage(b.paymentScreenshot)}
                                            style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: '800' }}
                                          >
                                            <Eye size={12} /> View
                                          </button>
                                          <button 
                                            type="button" 
                                            onClick={() => handleDownloadScreenshot(b.paymentScreenshot, b._id)}
                                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: '800' }}
                                          >
                                            <Download size={12} /> Save
                                          </button>
                                        </div>
                                      ) : (
                                        <span style={{ color: '#6b7280', fontSize: '0.75rem', fontStyle: 'italic' }}>N/A</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '1.25rem', border: 'none', borderRadius: '0 12px 12px 0' }}>
                                      <span className={`status ${b.status.toLowerCase()}`} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900' }}>{b.status.toUpperCase()}</span>
                                    </td>
                                </tr>
                            ))}
                            {data.bookings.length === 0 && (
                              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>No active bookings found for this court.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* TAB CONTENT: SETTINGS */}
        {activeTab === 'settings' && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '3rem', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <form onSubmit={handleUpdate}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}><CheckCircle2 size={16} /> FACILITY NAME</label>
                          <input style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} value={editForm.name} onChange={e=>setEditForm({...editForm, name:e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}><MapPin size={16} /> LOCATION</label>
                          <input style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} value={editForm.location || ''} onChange={e=>setEditForm({...editForm, location:e.target.value})} />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}><Globe size={16} /> MAP EMBED LINK</label>
                        <input style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} value={editForm.googleMapLink || ''} onChange={e=>setEditForm({...editForm, googleMapLink:e.target.value})} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '2.5rem' }}>
                        <div className="form-group">
                          <label style={{ marginBottom: '1rem', display: 'block', color: 'white', fontWeight: '800', fontSize: '0.9rem' }}>AVAILABLE FACILITIES</label>
                          <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                            {['Futsal', 'Padel', 'Cricket'].map((f) => (
                              <button key={f} type="button" onClick={() => toggleEditFacility(f)} style={{
                                border:'1px solid',
                                borderColor:(editForm.facilities || []).includes(f) ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                                background:(editForm.facilities || []).includes(f) ? 'rgba(59,130,246,0.1)' : 'transparent',
                                color:(editForm.facilities || []).includes(f) ? 'white' : '#6b7280',
                                borderRadius:'12px', padding:'10px 20px', cursor:'pointer', fontWeight:'800', fontSize: '0.75rem',
                                transition: 'all 0.2s'
                              }}>{f.toUpperCase()}</button>
                            ))}
                          </div>
                        </div>
                        <div className="form-group">
                          <label style={{ marginBottom: '1rem', display: 'block', color: 'white', fontWeight: '800', fontSize: '0.9rem' }}>AMENITIES</label>
                          <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                            {['Parking', 'Showers', 'Cafe', 'Floodlights', 'Changing Room'].map((a) => (
                              <button key={a} type="button" onClick={() => toggleEditAmenity(a)} style={{
                                border:'1px solid',
                                borderColor:(editForm.amenities || []).includes(a) ? '#10b981' : 'rgba(255,255,255,0.1)',
                                background:(editForm.amenities || []).includes(a) ? 'rgba(16,185,129,0.1)' : 'transparent',
                                color:(editForm.amenities || []).includes(a) ? 'white' : '#6b7280',
                                borderRadius:'12px', padding:'10px 16px', cursor:'pointer', fontWeight:'800', fontSize: '0.75rem',
                                transition: 'all 0.2s'
                              }}>{a.toUpperCase()}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Individual Specific Sub-Courts Builder */}
                      <div style={{ background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '24px', padding: '1.75rem', marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                          <div>
                            <h3 style={{ fontSize: '0.95rem', color: '#60a5fa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>★ Specific Physical Courts Hub</h3>
                            <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '4px 0 0 0' }}>Configure multiple independent physical fields inside this venue (e.g. Futsal Court 1, VIP Court) with distinct pricing rules.</p>
                          </div>
                          <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: '0.7rem', fontWeight: '900', padding: '4px 10px', borderRadius: '8px' }}>Sub-Courts Array</span>
                        </div>

                        {/* Added Sub-Courts Table */}
                        {(editForm.courtsDetail || []).length > 0 && (
                          <div style={{ display: 'grid', gap: '8px', marginBottom: '1.5rem' }}>
                            {(editForm.courtsDetail || []).map((c, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ color: 'white', fontWeight: '800', fontSize: '0.9rem' }}>{c.name}</span>
                                    <span style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontSize: '0.65rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>{c.sport}</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700', marginTop: '4px' }}>
                                    Base: PKR {c.pricePerHour}/hr {c.hasPeakPricing && c.pricePeak ? `| Peak: PKR ${c.pricePeak}/hr (${c.peakStartTime}-${c.peakEndTime})` : '| Flat Pricing 24/7'}
                                  </div>
                                </div>
                                <button type="button" onClick={() => handleRemoveSubCourt(i)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Sub-Court Input Row */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'grid', gap: '1rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: '800', display: 'block', marginBottom: '4px' }}>SUB-COURT UNIQUE NAME</label>
                              <input style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', color: 'white', width: '100%', fontSize: '0.8rem' }} placeholder="e.g. Futsal Arena 1" value={subCourtInput.name} onChange={e => setSubCourtInput({ ...subCourtInput, name: e.target.value })} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: '800', display: 'block', marginBottom: '4px' }}>SPORT TYPE</label>
                              <select style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', color: '#60a5fa', fontWeight: '800', width: '100%', fontSize: '0.8rem' }} value={subCourtInput.sport} onChange={e => setSubCourtInput({ ...subCourtInput, sport: e.target.value })}>
                                <option value="Futsal" style={{background:'#1a1a1a'}}>Futsal</option>
                                <option value="Padel" style={{background:'#1a1a1a'}}>Padel</option>
                                <option value="Cricket" style={{background:'#1a1a1a'}}>Cricket</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: '800', display: 'block', marginBottom: '4px' }}>FLAT BASE RATE</label>
                              <input type="number" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', color: 'white', width: '100%', fontSize: '0.8rem' }} placeholder="PKR/hr" value={subCourtInput.pricePerHour} onChange={e => setSubCourtInput({ ...subCourtInput, pricePerHour: e.target.value })} />
                            </div>
                          </div>

                          {/* Pricing Toggles */}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: subCourtInput.hasPeakPricing ? '#f59e0b' : '#9ca3af', fontSize: '0.75rem', fontWeight: '800' }}>
                              <input type="checkbox" checked={subCourtInput.hasPeakPricing} onChange={e => setSubCourtInput({ ...subCourtInput, hasPeakPricing: e.target.checked })} style={{ accentColor: '#f59e0b' }} />
                              Enable Custom Peak Hour Surcharge
                            </label>

                            {subCourtInput.hasPeakPricing && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', color: 'white', width: '70px', fontSize: '0.75rem', textAlign: 'center' }} placeholder="Start" value={subCourtInput.peakStartTime} onChange={e => setSubCourtInput({ ...subCourtInput, peakStartTime: e.target.value })} />
                                <span style={{ color: '#64748b' }}>to</span>
                                <input style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', color: 'white', width: '70px', fontSize: '0.75rem', textAlign: 'center' }} placeholder="End" value={subCourtInput.peakEndTime} onChange={e => setSubCourtInput({ ...subCourtInput, peakEndTime: e.target.value })} />
                                <input type="number" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #f59e0b', borderRadius: '8px', padding: '6px 10px', color: '#f59e0b', width: '100px', fontSize: '0.75rem', fontWeight: '800' }} placeholder="Peak Rate" value={subCourtInput.pricePeak} onChange={e => setSubCourtInput({ ...subCourtInput, pricePeak: e.target.value })} />
                              </div>
                            )}

                            <button type="button" onClick={handleAddSubCourt} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}>
                              + Add Sub-Court
                            </button>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', marginBottom: '2.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ color: '#60a5fa', marginBottom: '1.25rem', marginTop: 0, fontSize: '0.95rem', fontWeight: '800' }}>
                          ★ PRICING & OPERATIONAL CONSTRAINTS
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                          <div className="form-group">
                            <label style={{ marginBottom: '0.75rem', display: 'block', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}>BASE PRICE PER HOUR (PKR)</label>
                            <input type="number" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} value={editForm.pricePerHour || ''} onChange={e=>setEditForm({...editForm, pricePerHour:e.target.value})} required />
                          </div>
                          <div className="form-group">
                            <label style={{ marginBottom: '0.75rem', display: 'block', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}>MINIMUM CONSECUTIVE SLOTS</label>
                            <input type="number" min="1" max="12" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} value={editForm.minSlots || 1} onChange={e=>setEditForm({...editForm, minSlots:e.target.value})} required />
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                          <label style={{ marginBottom: '1rem', display: 'block', color: '#ec4899', fontWeight: '800', fontSize: '0.85rem' }}>★ PROMOTIONAL CAMPAIGN CONTROL</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
                            <div className="form-group">
                              <label style={{ marginBottom: '0.75rem', display: 'block', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}>DISCOUNT PERCENTAGE (%)</label>
                              <input type="number" min="0" max="100" placeholder="e.g. 15" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} value={editForm.discountPercentage || ''} onChange={e=>setEditForm({...editForm, discountPercentage:e.target.value})} />
                            </div>
                            <div className="form-group">
                              <label style={{ marginBottom: '0.75rem', display: 'block', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}>DISCOUNT EXPIRY DATE</label>
                              <input type="date" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} value={editForm.discountValidUntil || ''} onChange={e=>setEditForm({...editForm, discountValidUntil:e.target.value})} />
                            </div>
                          </div>
                          <div className="form-group">
                            <label style={{ marginBottom: '0.75rem', display: 'block', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}>PROMOTION TARGET SCOPE</label>
                            <select style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: '#ec4899', fontWeight: '800', width: '100%' }} value={editForm.discountTargetTier || 'both'} onChange={e=>setEditForm({...editForm, discountTargetTier:e.target.value})}>
                              <option value="both" style={{background:'#1a1a1a'}}>Apply to Both Peak & Base Rates</option>
                              <option value="base" style={{background:'#1a1a1a'}}>Apply Only to Base Off-Peak Rate</option>
                              <option value="peak" style={{background:'#1a1a1a'}}>Apply Only to Dynamic Peak Rate</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                          <label style={{ marginBottom: '1rem', display: 'block', color: '#f59e0b', fontWeight: '800', fontSize: '0.85rem' }}>★ DYNAMIC PEAK HOUR TIER CONFIGURATION</label>
                          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '6px', fontWeight: '800' }}>PEAK RATE (PKR/hr)</label>
                            <input type="number" placeholder="e.g. 6000" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} value={editForm.pricePeak || ''} onChange={e=>setEditForm({...editForm, pricePeak:e.target.value})} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '8px', fontWeight: '800' }}>
                                START TIME: <span style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>{formatAMPM(editForm.peakStartTime)}</span>
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '180px', overflowY: 'auto' }}>
                                {hourOptions.slice(0, 24).map((h) => (
                                  <button
                                    key={h}
                                    type="button"
                                    onClick={() => setEditForm({...editForm, peakStartTime: h})}
                                    style={{
                                      padding: '8px 4px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid',
                                      borderColor: editForm.peakStartTime === h ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                                      background: editForm.peakStartTime === h ? '#f59e0b' : 'rgba(255,255,255,0.03)',
                                      color: editForm.peakStartTime === h ? 'black' : '#e5e7eb', cursor: 'pointer', transition: 'all 0.15s'
                                    }}
                                  >
                                    {formatAMPM(h)}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '8px', fontWeight: '800' }}>
                                END TIME: <span style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>{formatAMPM(editForm.peakEndTime)}</span>
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '180px', overflowY: 'auto' }}>
                                {hourOptions.slice(0, 24).map((h) => (
                                  <button
                                    key={h}
                                    type="button"
                                    onClick={() => setEditForm({...editForm, peakEndTime: h})}
                                    style={{
                                      padding: '8px 4px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid',
                                      borderColor: editForm.peakEndTime === h ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                                      background: editForm.peakEndTime === h ? '#f59e0b' : 'rgba(255,255,255,0.03)',
                                      color: editForm.peakEndTime === h ? 'black' : '#e5e7eb', cursor: 'pointer', transition: 'all 0.15s'
                                    }}
                                  >
                                    {formatAMPM(h)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '24px', marginBottom: '2.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><CreditCard size={18} color="#3b82f6" /> PAYMENT SETTINGS</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                          <div className="form-group"><label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '800', marginBottom: '0.5rem', display: 'block' }}>BANK NAME</label><input style={{ background: 'rgba(0,0,0,0.3)', border: 'none', padding: '12px', borderRadius: '10px', color: 'white', width: '100%' }} value={editForm.paymentBank || ''} onChange={e=>setEditForm({...editForm, paymentBank:e.target.value})} /></div>
                          <div className="form-group"><label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '800', marginBottom: '0.5rem', display: 'block' }}>ACCOUNT TITLE</label><input style={{ background: 'rgba(0,0,0,0.3)', border: 'none', padding: '12px', borderRadius: '10px', color: 'white', width: '100%' }} value={editForm.paymentAccountTitle || ''} onChange={e=>setEditForm({...editForm, paymentAccountTitle:e.target.value})} /></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                          <div className="form-group"><label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '800', marginBottom: '0.5rem', display: 'block' }}>ACCOUNT NUMBER</label><input style={{ background: 'rgba(0,0,0,0.3)', border: 'none', padding: '12px', borderRadius: '10px', color: 'white', width: '100%' }} value={editForm.paymentAccountNumber || ''} onChange={e=>setEditForm({...editForm, paymentAccountNumber:e.target.value})} /></div>
                          <div className="form-group"><label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '800', marginBottom: '0.5rem', display: 'block' }}>ADVANCE REQUIRED (PKR)</label><input type="number" style={{ background: 'rgba(0,0,0,0.3)', border: 'none', padding: '12px', borderRadius: '10px', color: 'white', width: '100%' }} value={editForm.advanceRequired || 0} onChange={e=>setEditForm({...editForm, advanceRequired:e.target.value})} /></div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}>
                            <Clock size={16} /> OPERATIONAL START: <span style={{ color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>{formatAMPM(editForm.operationalStartTime || '00:00')}</span>
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '180px', overflowY: 'auto' }}>
                            {hourOptions.slice(0, 24).map((h) => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => setEditForm({...editForm, operationalStartTime: h})}
                                style={{
                                  padding: '8px 4px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid',
                                  borderColor: editForm.operationalStartTime === h ? '#60a5fa' : 'rgba(255,255,255,0.08)',
                                  background: editForm.operationalStartTime === h ? '#60a5fa' : 'rgba(255,255,255,0.03)',
                                  color: editForm.operationalStartTime === h ? 'black' : '#e5e7eb', cursor: 'pointer', transition: 'all 0.15s'
                                }}
                              >
                                {formatAMPM(h)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}>
                            <Clock size={16} /> OPERATIONAL END: <span style={{ color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>{formatAMPM(editForm.operationalEndTime || '24:00')}</span>
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '180px', overflowY: 'auto' }}>
                            {hourOptions.slice(1).map((h) => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => setEditForm({...editForm, operationalEndTime: h})}
                                style={{
                                  padding: '8px 4px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid',
                                  borderColor: editForm.operationalEndTime === h ? '#60a5fa' : 'rgba(255,255,255,0.08)',
                                  background: editForm.operationalEndTime === h ? '#60a5fa' : 'rgba(255,255,255,0.03)',
                                  color: editForm.operationalEndTime === h ? 'black' : '#e5e7eb', cursor: 'pointer', transition: 'all 0.15s'
                                }}
                              >
                                {formatAMPM(h)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '2rem', borderRadius: '24px', border: '1px dashed rgba(59, 130, 246, 0.3)', textAlign: 'center', marginBottom: '3rem' }}>
                        <ImageIcon size={32} color="#3b82f6" style={{ marginBottom: '1rem' }} />
                        <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>UPDATE MEDIA ASSETS</h4>
                        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }}>Upload high-resolution images of your facility. Max 5 images.</p>
                        <input type="file" multiple accept="image/*" onChange={(e) => setImages(e.target.files)} style={{ display: 'none' }} id="court-images-upload" />
                        <label htmlFor="court-images-upload" style={{ background: '#3b82f6', color: 'white', padding: '10px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'inline-block' }}>CHOOSE IMAGES</label>
                        {images.length > 0 && <p style={{ color: '#10b981', fontWeight: '800', fontSize: '0.8rem', marginTop: '1rem' }}>{images.length} images selected</p>}
                      </div>

                      <button style={{ 
                        width: '100%', background: '#3b82f6', color: 'white', 
                        padding: '18px', borderRadius: '16px', border: 'none', 
                        fontSize: '1rem', fontWeight: '900', letterSpacing: '1px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.2)'
                      }}>
                        <Save size={20} /> DEPLOY UPDATED SETTINGS
                      </button>
                  </form>
                </div>
            </div>
        )}

        {/* TAB CONTENT: BLOCK TIME */}
        {activeTab === 'block' && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.02)', padding: '3rem', borderRadius: '32px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                      <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
                      <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.5px' }}>MAINTENANCE BLOCK</h2>
                      <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>Select specific time slots to make them unavailable for public booking.</p>
                    </div>

                    <form onSubmit={handleBlock}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                          <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.75rem', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}>SELECT FACILITY</label>
                            <select style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} value={blockForm.facility} onChange={e=>setBlockForm({...blockForm, facility:e.target.value})}>
                              {(data.court.facilities || []).map((f) => <option key={f} value={f} style={{background:'#1a1a1a'}}>{f}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.75rem', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}>TARGET DATE</label>
                            <input type="date" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} onChange={e=>setBlockForm({...blockForm, date:e.target.value})} required/>
                          </div>
                        </div>

                        {blockForm.date && (
                          <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '1rem', color: 'white', fontWeight: '800', fontSize: '0.9rem', textAlign: 'center' }}>AVAILABLE SLOTS FOR {blockForm.date}</label>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '24px' }}>
                              <TimeSlotPicker
                                selectedSlots={blockForm.timeBlocks}
                                onChange={(slots) => setBlockForm((prev) => ({ ...prev, timeBlocks: slots }))}
                                unavailableSlots={unavailableSlots}
                                startHour={parseHour(data.court.operationalStartTime, 0)}
                                endHour={parseHour(data.court.operationalEndTime, 24)}
                                selectedDate={blockForm.date}
                              />
                            </div>
                          </div>
                        )}
                        
                        <button style={{ 
                          width: '100%', background: '#ef4444', color: 'white', 
                          padding: '16px', borderRadius: '16px', border: 'none', 
                          fontSize: '1rem', fontWeight: '900', letterSpacing: '1px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                          boxShadow: '0 10px 30px rgba(239, 68, 68, 0.2)'
                        }}>
                          <Slash size={18} /> CONFIRM MAINTENANCE BLOCK
                        </button>
                    </form>
                </div>
            </div>
        )}

        {previewImage && (
          <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
            <div className="lightbox-modal-content" onClick={e => e.stopPropagation()}>
              <button type="button" className="close-modal" onClick={() => setPreviewImage(null)}>
                <X size={24} />
              </button>
              <img src={previewImage} alt="Full size preview" className="lightbox-img" />
              <button 
                type="button" 
                onClick={() => handleDownloadScreenshot(previewImage, 'admin_preview')}
                style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
              >
                <Download size={18} /> Download Screenshot
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

export default AdminCourtView;
