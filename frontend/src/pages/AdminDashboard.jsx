import { useEffect, useState } from 'react';
import API from '../api/axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  MapPin,
  PlusCircle,
  Settings,
  TrendingUp,
  Users,
  Home,
  AlertTriangle,
  Trash2,
  Key,
  ExternalLink,
  Clock,
  CreditCard,
  Building2,
  Trophy,
  Activity,
  Layers,
  Sparkles,
  Camera,
  ChevronRight
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('courts');
  const [data, setData] = useState({ courts: [], managers: [], stats: {} });
  const [form, setForm] = useState({
    courtName: '', location: '', facilities: ['Futsal'], googleMapLink: '',
    amenities: [],
    paymentBank: '', paymentAccountTitle: '', paymentAccountNumber: '', advanceRequired: '',
    operationalStartTime: '00:00', operationalEndTime: '24:00',
    pricePerHour: '', minSlots: 1,
    pricePeak: '', peakStartTime: '', peakEndTime: '',
    discountPercentage: '', discountValidUntil: '', discountTargetTier: 'both',
    managerName: '', managerEmail: '', managerMobile: '', notificationEmail: ''
  });
  const [images, setImages] = useState([]);
  const hourOptions = Array.from({ length: 25 }, (_, h) => `${h.toString().padStart(2, '0')}:00`);
  const formatAMPM = (timeStr) => {
    if (!timeStr) return 'None';
    if (timeStr === '24:00') return '12:00 AM';
    const [h] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:00 ${period}`;
  };

  const fetchData = async () => {
    try {
      const { data } = await API.get('/admin/data');
      setData(data);
    } catch (error) { toast.error('Failed to load admin data'); }
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('refreshBookings', fetchData);
    return () => window.removeEventListener('refreshBookings', fetchData);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (key === 'facilities' || key === 'amenities') {
          form[key].forEach(item => formData.append(key, item));
        } else {
          formData.append(key, form[key]);
        }
      });
      for (let i = 0; i < images.length; i++) {
        formData.append('images', images[i]);
      }

      const res = await API.post('/admin/create-court', formData);
      toast.success(`Created! Manager Password: ${res.data.manager.password}`);
      setForm({
        courtName: '', location: '', facilities: ['Futsal'], googleMapLink: '',
        amenities: [],
        paymentBank: '', paymentAccountTitle: '', paymentAccountNumber: '', advanceRequired: '',
        operationalStartTime: '00:00', operationalEndTime: '24:00',
        pricePerHour: '', minSlots: 1,
        pricePeak: '', peakStartTime: '', peakEndTime: '',
        discountPercentage: '', discountValidUntil: '', discountTargetTier: 'both',
        managerName: '', managerEmail: '', managerMobile: '', notificationEmail: ''
      });
      setImages([]);
      fetchData();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed'); }
  };

  const toggleFacility = (facility) => {
    setForm((prev) => {
      const exists = prev.facilities.includes(facility);
      const nextFacilities = exists
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility];
      return { ...prev, facilities: nextFacilities.length ? nextFacilities : prev.facilities };
    });
  };

  const toggleAmenity = (amenity) => {
    setForm((prev) => {
      const exists = prev.amenities.includes(amenity);
      if (exists) return { ...prev, amenities: prev.amenities.filter((a) => a !== amenity) };
      if (prev.amenities.length >= 5) return prev;
      return { ...prev, amenities: [...prev.amenities, amenity] };
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete Court & Manager?')) {
      try { await API.delete(`/admin/court/${id}`); toast.success('Deleted'); fetchData(); }
      catch (error) { toast.error('Failed'); }
    }
  };

  const handleAssignManager = async (courtId) => {
    const name = window.prompt("Enter Manager Name:");
    if (!name) return;
    const email = window.prompt("Enter Manager Login Email (e.g. demo account):");
    if (!email) return;
    const mobile = window.prompt("Enter Manager WhatsApp / Mobile Number:");
    if (!mobile) return;
    const notifEmail = window.prompt("Enter Manager's Actual Email for Notifications (optional):");
    const password = window.prompt("Enter Initial Password for Manager:");
    if (!password) return;
    try {
      const res = await API.post('/admin/assign-manager', { courtId, managerName: name, managerEmail: email, managerMobile: mobile, notificationEmail: notifEmail, password });
      toast.success(`Assigned! Password: ${res.data.manager.password}`);
      fetchData();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed'); }
  };

  const handleResetPassword = async (managerId) => {
    const newPassword = window.prompt("Enter New Password for Manager:");
    if (!newPassword) return;
    try {
      await API.post('/admin/reset-manager-password', { managerId, newPassword });
      toast.success('Password updated!');
    } catch (error) { toast.error('Failed to update password'); }
  };

  return (
    <div className="page-container" style={{ padding: '0 20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Super Admin Header */}
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6', marginBottom: '8px' }}>
            <ShieldAlert size={18} />
            <span style={{ fontSize: '0.8rem', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase' }}>System Governance</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '2.4rem', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>Admin Panel</h1>
          <p style={{ color: '#9ca3af', marginTop: '4px', fontSize: '1rem' }}>Global facility management and system-wide analytics.</p>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}><Building2 size={80} color="white" /></div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Facilities</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '2rem', color: 'white', fontWeight: '900' }}>{data.courts.length}</p>
        </div>
        <div style={{ background: 'rgba(16, 185, 129, 0.03)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(16, 185, 129, 0.1)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}><TrendingUp size={80} color="#10b981" /></div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#10b981', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Gross Revenue</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '2rem', color: 'white', fontWeight: '900' }}>PKR {data.stats?.totalRevenue?.toLocaleString() || 0}</p>
        </div>
        <div style={{ background: 'rgba(59, 130, 246, 0.03)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(59, 130, 246, 0.1)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}><Trophy size={80} color="#3b82f6" /></div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#3b82f6', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Bookings</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '2rem', color: 'white', fontWeight: '900' }}>{data.stats?.totalBookings || 0}</p>
        </div>
        <div style={{ background: data.stats?.pendingDisputes > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '24px', border: data.stats?.pendingDisputes > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}><AlertTriangle size={80} color="#ef4444" /></div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#ef4444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Disputes</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '2rem', color: data.stats?.pendingDisputes > 0 ? '#f87171' : 'white', fontWeight: '900' }}>{data.stats?.pendingDisputes || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('courts')}
          style={{
            background: activeTab === 'courts' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: activeTab === 'courts' ? '#3b82f6' : '#6b7280',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '800',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Building2 size={18} /> Facility Management
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          style={{
            background: activeTab === 'disputes' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
            color: activeTab === 'disputes' ? '#ef4444' : '#6b7280',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '800',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <AlertTriangle size={18} /> Resolution Center
          <span style={{
            background: '#ef4444',
            color: 'white',
            fontSize: '0.6rem',
            padding: '2px 6px',
            borderRadius: '6px',
            marginLeft: '4px'
          }}>
            {data.disputes?.length || 0}
          </span>
        </button>
      </div>

      {activeTab === 'courts' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
          {/* Create Facility Form */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2.5rem', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
              <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}><PlusCircle color="#3b82f6" /></div>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: 'white' }}>Onboard New Facility</h2>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'grid', gap: '2rem' }}>
              {/* Basic Info */}
              <div>
                <h3 style={{ fontSize: '0.9rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.25rem' }}>Core Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px' }}><Home size={14} /> COURT NAME</label>
                    <input style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={form.courtName} onChange={e => setForm({ ...form, courtName: e.target.value })} placeholder="The Arena" required />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px' }}><Layers size={14} /> SPORTS FACILITIES</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['Futsal', 'Padel', 'Cricket'].map((sport) => (
                        <button key={sport} type="button" onClick={() => toggleFacility(sport)} style={{ flex: 1, padding: '10px 5px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', border: '1px solid', borderColor: form.facilities.includes(sport) ? '#3b82f6' : '#1e293b', background: form.facilities.includes(sport) ? 'rgba(59, 130, 246, 0.15)' : 'transparent', color: form.facilities.includes(sport) ? '#60a5fa' : '#475569', transition: 'all 0.2s' }}>{sport}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px' }}><MapPin size={14} /> LOCATION & MAP</label>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <input style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Street, Area, City..." required />
                    <input style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: 'white', width: '100%', fontSize: '0.8rem' }} value={form.googleMapLink} onChange={e => setForm({ ...form, googleMapLink: e.target.value })} placeholder="Google Maps Embed Link (Optional)" />
                  </div>
                </div>
              </div>

              {/* Pricing & Amenities */}
              <div>
                <h3 style={{ fontSize: '0.9rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.25rem' }}>Pricing & Operations</h3>
                
                {/* Core Pricing & Limits */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', display: 'block' }}>BASE OFF-PEAK PRICE (PKR/hr)</label>
                    <input type="number" placeholder="e.g. 4000" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={form.pricePerHour} onChange={e => setForm({ ...form, pricePerHour: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', display: 'block' }}>MINIMUM CONSECUTIVE SLOTS</label>
                    <input type="number" min="1" max="10" placeholder="Default: 1" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={form.minSlots} onChange={e => setForm({ ...form, minSlots: e.target.value })} required />
                  </div>
                </div>

                {/* Operational Windows */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontSize: '0.75rem', fontWeight: '800', marginBottom: '8px' }}>
                      <Clock size={14} /> OPENING TIME: <span style={{ color: 'white', background: 'rgba(59, 130, 246, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>{formatAMPM(form.operationalStartTime)}</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', background: '#0f172a', padding: '8px', borderRadius: '10px', border: '1px solid #1e293b', maxHeight: '140px', overflowY: 'auto' }}>
                      {hourOptions.slice(0, 24).map((h) => (
                        <button
                          key={h} type="button" onClick={() => setForm({ ...form, operationalStartTime: h })}
                          style={{
                            padding: '6px 2px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', border: '1px solid',
                            borderColor: form.operationalStartTime === h ? '#3b82f6' : 'transparent',
                            background: form.operationalStartTime === h ? '#3b82f6' : 'transparent',
                            color: form.operationalStartTime === h ? 'white' : '#9ca3af', cursor: 'pointer'
                          }}
                        >
                          {formatAMPM(h)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontSize: '0.75rem', fontWeight: '800', marginBottom: '8px' }}>
                      <Clock size={14} /> CLOSING TIME: <span style={{ color: 'white', background: 'rgba(59, 130, 246, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>{formatAMPM(form.operationalEndTime)}</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', background: '#0f172a', padding: '8px', borderRadius: '10px', border: '1px solid #1e293b', maxHeight: '140px', overflowY: 'auto' }}>
                      {hourOptions.slice(1).map((h) => (
                        <button
                          key={h} type="button" onClick={() => setForm({ ...form, operationalEndTime: h })}
                          style={{
                            padding: '6px 2px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', border: '1px solid',
                            borderColor: form.operationalEndTime === h ? '#3b82f6' : 'transparent',
                            background: form.operationalEndTime === h ? '#3b82f6' : 'transparent',
                            color: form.operationalEndTime === h ? 'white' : '#9ca3af', cursor: 'pointer'
                          }}
                        >
                          {formatAMPM(h)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Peak Pricing Configuration */}
                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                  <label style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '900', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>⚡ Dynamic Peak Hour Configurations</label>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: '700', marginBottom: '6px', display: 'block' }}>PEAK RATE (PKR/hr)</label>
                    <input type="number" placeholder="e.g. 5000 (Optional)" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={form.pricePeak} onChange={e => setForm({ ...form, pricePeak: e.target.value })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', background: 'rgba(245, 158, 11, 0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.75rem', fontWeight: '800', marginBottom: '8px' }}>
                        START TIME: <span style={{ color: 'white', background: 'rgba(245, 158, 11, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>{formatAMPM(form.peakStartTime)}</span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', background: '#0f172a', padding: '8px', borderRadius: '10px', border: '1px solid #1e293b', maxHeight: '140px', overflowY: 'auto' }}>
                        {hourOptions.slice(0, 24).map((h) => (
                          <button
                            key={h} type="button" onClick={() => setForm({ ...form, peakStartTime: h })}
                            style={{
                              padding: '6px 2px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', border: '1px solid',
                              borderColor: form.peakStartTime === h ? '#f59e0b' : 'transparent',
                              background: form.peakStartTime === h ? '#f59e0b' : 'transparent',
                              color: form.peakStartTime === h ? 'white' : '#9ca3af', cursor: 'pointer'
                            }}
                          >
                            {formatAMPM(h)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.75rem', fontWeight: '800', marginBottom: '8px' }}>
                        END TIME: <span style={{ color: 'white', background: 'rgba(245, 158, 11, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>{formatAMPM(form.peakEndTime)}</span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', background: '#0f172a', padding: '8px', borderRadius: '10px', border: '1px solid #1e293b', maxHeight: '140px', overflowY: 'auto' }}>
                        {hourOptions.slice(0, 24).map((h) => (
                          <button
                            key={h} type="button" onClick={() => setForm({ ...form, peakEndTime: h })}
                            style={{
                              padding: '6px 2px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', border: '1px solid',
                              borderColor: form.peakEndTime === h ? '#f59e0b' : 'transparent',
                              background: form.peakEndTime === h ? '#f59e0b' : 'transparent',
                              color: form.peakEndTime === h ? 'white' : '#9ca3af', cursor: 'pointer'
                            }}
                          >
                            {formatAMPM(h)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Promotional Campaign Options */}
                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
                  <label style={{ color: '#ec4899', fontSize: '0.75rem', fontWeight: '900', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>🏷️ Launch Promotion Discounts</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: '700', marginBottom: '6px', display: 'block' }}>DISCOUNT PERCENTAGE (%)</label>
                      <input type="number" placeholder="e.g. 15" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={form.discountPercentage} onChange={e => setForm({ ...form, discountPercentage: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: '700', marginBottom: '6px', display: 'block' }}>CAMPAIGN EXPIRATION DATE</label>
                      <input type="date" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={form.discountValidUntil} onChange={e => setForm({ ...form, discountValidUntil: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: '700', marginBottom: '6px', display: 'block' }}>PROMOTION TARGET SCOPE</label>
                    <select style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: '#ec4899', fontWeight: '800', width: '100%' }} value={form.discountTargetTier} onChange={e => setForm({ ...form, discountTargetTier: e.target.value })}>
                      <option value="both">Apply to Both Peak & Base Rates</option>
                      <option value="base">Apply Only to Base Off-Peak Rate</option>
                      <option value="peak">Apply Only to Dynamic Peak Rate</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '1.25rem' }}>
                  <label style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: '700', marginBottom: '10px', display: 'block' }}>PREMIUM AMENITIES</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['Parking', 'Showers', 'Cafe', 'Floodlights', 'Changing Room'].map((amenity) => (
                      <button key={amenity} type="button" onClick={() => toggleAmenity(amenity)} style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', border: '1px solid', borderColor: form.amenities.includes(amenity) ? '#10b981' : '#1e293b', background: form.amenities.includes(amenity) ? 'rgba(16, 185, 129, 0.15)' : 'transparent', color: form.amenities.includes(amenity) ? '#34d399' : '#6b7280', transition: 'all 0.2s' }}>{amenity}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment & Manager */}
              <div>
                <h3 style={{ fontSize: '0.9rem', color: '#facc15', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.25rem' }}>Management & Finance</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px' }}><CreditCard size={14} /> BANK NAME</label>
                    <input style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={form.paymentBank} onChange={e => setForm({ ...form, paymentBank: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', display: 'block' }}>ADVANCE (PKR)</label>
                    <input type="number" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={form.advanceRequired} onChange={e => setForm({ ...form, advanceRequired: e.target.value })} placeholder="0" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div className="form-group"><label style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', display: 'block' }}>ACCOUNT TITLE</label><input style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={form.paymentAccountTitle} onChange={e => setForm({ ...form, paymentAccountTitle: e.target.value })} required /></div>
                  <div className="form-group"><label style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', display: 'block' }}>ACCOUNT NUMBER</label><input style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={form.paymentAccountNumber} onChange={e => setForm({ ...form, paymentAccountNumber: e.target.value })} required /></div>
                </div>
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}><Users size={18} color="#3b82f6" /><span style={{ fontWeight: '900', fontSize: '0.9rem', color: 'white' }}>Assigned Manager Account</span></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group"><input style={{ background: '#0a0f1d', border: '1px solid #1e293b', borderRadius: '12px', padding: '10px', color: 'white', width: '100%', fontSize: '0.85rem' }} value={form.managerName} onChange={e => setForm({ ...form, managerName: e.target.value })} placeholder="Manager Name" required /></div>
                    <div className="form-group"><input type="email" style={{ background: '#0a0f1d', border: '1px solid #1e293b', borderRadius: '12px', padding: '10px', color: 'white', width: '100%', fontSize: '0.85rem' }} value={form.managerEmail} onChange={e => setForm({ ...form, managerEmail: e.target.value })} placeholder="Login Email (Demo)" required /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '10px' }}>
                    <input type="tel" style={{ background: '#0a0f1d', border: '1px solid #1e293b', borderRadius: '12px', padding: '10px', color: 'white', width: '100%', fontSize: '0.85rem' }} value={form.managerMobile} onChange={e => setForm({ ...form, managerMobile: e.target.value })} placeholder="Manager WhatsApp / Mobile" required />
                    <input type="email" style={{ background: '#0a0f1d', border: '1px solid #1e293b', borderRadius: '12px', padding: '10px', color: 'white', width: '100%', fontSize: '0.85rem' }} value={form.notificationEmail} onChange={e => setForm({ ...form, notificationEmail: e.target.value })} placeholder="Notification Email (Actual)" />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '0.8rem', fontWeight: '700', marginBottom: '10px' }}><Camera size={16} /> FACILITY IMAGES (MAX 5)</label>
                <div style={{ border: '2px dashed #1e293b', padding: '20px', borderRadius: '15px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input type="file" multiple accept="image/*" onChange={(e) => setImages(e.target.files)} style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer' }} />
                  <Sparkles size={24} color="#64748b" style={{ marginBottom: '10px' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>Click to upload or drag & drop</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: '#475569' }}>High resolution landscape photos recommended</p>
                  {images.length > 0 && <p style={{ marginTop: '10px', color: '#10b981', fontWeight: '800', fontSize: '0.85rem' }}>{images.length} file(s) selected</p>}
                </div>
              </div>

              <button type="submit" style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: '900', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 25px rgba(37, 99, 235, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <Activity size={20} /> Initialize Facility Network
              </button>
            </form>
          </div>

          {/* Active Facilities List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
              <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px' }}><Activity color="#10b981" /></div>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: 'white' }}>Active Network</h2>
            </div>

            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {data.courts.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <p style={{ color: '#6b7280' }}>No facilities have been onboarded yet.</p>
                </div>
              )}
              {data.courts.map(court => (
                <div key={court._id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', transition: 'transform 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: '900' }}>{court.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '0.85rem', marginTop: '6px' }}>
                        <MapPin size={14} /> {court.location}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                        {(court.facilities || []).map(f => (
                          <span key={f} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontSize: '0.65rem', fontWeight: '900', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>{f}</span>
                        ))}
                      </div>
                      <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                        <div style={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Assigned Manager</div>
                        <div style={{ color: 'white', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Users size={12} color="#3b82f6" /> {court.manager?.email || 'Unassigned'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button onClick={() => navigate(`/courts/${court._id}`)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <ExternalLink size={14} /> Manage
                      </button>
                      {(!court.manager || !court.manager.email) && (
                        <button onClick={() => handleAssignManager(court._id)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}>
                          Assign
                        </button>
                      )}
                      {(court.manager && court.manager.email) && (
                        <button onClick={() => handleResetPassword(court.manager._id)} style={{ background: 'transparent', color: '#facc15', border: '1px solid rgba(250, 204, 21, 0.3)', padding: '8px 16px', borderRadius: '10px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <Key size={14} /> Reset Pass
                        </button>
                      )}
                      <button onClick={() => handleDelete(court._id)} style={{ background: 'transparent', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 16px', borderRadius: '10px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'disputes' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}><AlertTriangle color="#ef4444" /></div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: 'white' }}>Dispute Queue</h2>
          </div>

          {(!data.disputes || data.disputes.length === 0) ? (
            <div style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <ShieldAlert size={48} color="#1e293b" style={{ marginBottom: '1.5rem' }} />
              <h3 style={{ color: 'white', margin: 0 }}>All Clear</h3>
              <p style={{ color: '#6b7280', marginTop: '8px' }}>No pending disputes require your attention at this moment.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
              {data.disputes.map((d) => (
                <div key={d._id} style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '28px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: '900', fontSize: '1.1rem' }}>
                        <Users size={18} color="#ef4444" /> {d.user?.name || 'Anonymous User'}
                      </div>
                      <div style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: '800', marginTop: '4px' }}>
                        AT: {d.court?.name || 'Unknown Facility'}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '6px 12px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase' }}>URGENT</div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>User Reported Reason</p>
                    <p style={{ margin: 0, color: '#ddd', fontSize: '0.9rem', lineHeight: '1.5', fontStyle: 'italic' }}>"{d.disputeReason || 'No reason provided'}"</p>
                  </div>

                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                      <CreditCard size={16} color="#60a5fa" />
                      <span style={{ color: '#9ca3af' }}>Refund TID:</span>
                      <span style={{ color: 'white', fontWeight: '700' }}>{d.refundTransactionId || 'N/A'}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', fontSize: '0.8rem' }}>
                      <div style={{ color: '#6b7280', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>User Payout Info</div>
                      <div style={{ color: 'white', fontWeight: '700' }}>{d.refundBankName} | {d.refundAccountTitle}</div>
                      <div style={{ color: '#3b82f6', marginTop: '2px', fontWeight: '800' }}>{d.refundAccountNumber}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={async () => {
                        try {
                          await API.put(`/admin/disputes/${d._id}/resolve`);
                          toast.success('Dispute resolved successfully');
                          fetchData();
                        } catch (error) {
                          toast.error('Failed to resolve');
                        }
                      }}
                      style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '12px', borderRadius: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <ShieldAlert size={18} /> Mark as Resolved
                    </button>
                    <button style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: 'none', width: '45px', height: '45px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Smartphone size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default AdminDashboard;