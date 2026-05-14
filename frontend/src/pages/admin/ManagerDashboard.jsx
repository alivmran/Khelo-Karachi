import { useEffect, useState } from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import TimeSlotPicker from '../../components/TimeSlotPicker';
import { CSVLink } from 'react-csv';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  LayoutDashboard,
  Download,
  Calendar,
  Banknote,
  Clock,
  ChevronRight,
  CheckCircle2,
  XCircle,
  MessageCircle,
  ShieldAlert,
  CreditCard,
  Ban,
  Eye,
  X,
  Percent,
  Sliders,
  TrendingUp,
  Save,
  Image as ImageIcon,
  MapPin,
  Edit
} from 'lucide-react';

const parseHour = (timeString, fallback) => {
  if (!timeString || typeof timeString !== 'string') return fallback;
  const [h] = timeString.split(':').map(Number);
  if (Number.isNaN(h)) return fallback;
  return h;
};

const ManagerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [blockDate, setBlockDate] = useState('');
  const [blockFacility, setBlockFacility] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [unavailableSlots, setUnavailableSlots] = useState([]);
  const [refundTidByBooking, setRefundTidByBooking] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const hourOptions = Array.from({ length: 25 }, (_, h) => `${h.toString().padStart(2, '0')}:00`);
  const formatAMPM = (timeStr) => {
    if (!timeStr) return 'None';
    if (timeStr === '24:00') return '12:00 AM';
    const [h] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:00 ${period}`;
  };

  const [pricingConfig, setPricingConfig] = useState({
    discountPercentage: '',
    discountValidUntil: '',
    discountTargetTier: 'both',
    peakStartTime: '',
    peakEndTime: '',
    pricePeak: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    facilities: [],
    amenities: [],
    paymentBank: '',
    paymentAccountTitle: '',
    paymentAccountNumber: '',
    advanceRequired: 0,
    pricePerHour: '',
    peakStartTime: '',
    peakEndTime: '',
    pricePeak: ''
  });
  const [images, setImages] = useState([]);

  const toggleEditFacility = (f) => {
    setEditForm(prev => {
      const exists = prev.facilities.includes(f);
      return { ...prev, facilities: exists ? prev.facilities.filter(item => item !== f) : [...prev.facilities, f] };
    });
  };

  const toggleEditAmenity = (a) => {
    setEditForm(prev => {
      const exists = prev.amenities.includes(a);
      return { ...prev, amenities: exists ? prev.amenities.filter(item => item !== a) : [...prev.amenities, a] };
    });
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
    const fetchStats = async () => {
      try {
        const { data } = await API.get('/manager/dashboard');
        setData(data);
        setBlockFacility(data?.court?.facilities?.[0] || '');
        if (data?.court) {
          setPricingConfig({
            discountPercentage: data.court.discount?.percentage || '',
            discountValidUntil: data.court.discount?.validUntil ? data.court.discount.validUntil.split('T')[0] : '',
            discountTargetTier: data.court.discount?.targetTier || 'both',
            peakStartTime: data.court.peakStartTime || '',
            peakEndTime: data.court.peakEndTime || '',
            pricePeak: data.court.pricePeak || ''
          });
          setEditForm({
            name: data.court.name || '',
            location: data.court.location || '',
            facilities: data.court.facilities || [],
            amenities: data.court.amenities || [],
            paymentBank: data.court.paymentBank || '',
            paymentAccountTitle: data.court.paymentAccountTitle || '',
            paymentAccountNumber: data.court.paymentAccountNumber || '',
            advanceRequired: data.court.advanceRequired || 0,
            pricePerHour: data.court.pricePerHour || '',
            peakStartTime: data.court.peakStartTime || '',
            peakEndTime: data.court.peakEndTime || '',
            pricePeak: data.court.pricePeak || ''
          });
        }
      } catch (error) { toast.error('Failed to load dashboard'); }
    };
    fetchStats();
    window.addEventListener('refreshBookings', fetchStats);
    return () => window.removeEventListener('refreshBookings', fetchStats);
  }, []);

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to deploy these venue updates?")) return;
    try {
      const formData = new FormData();
      Object.keys(editForm).forEach(key => {
        if (key === 'facilities' || key === 'amenities') {
          editForm[key].forEach(val => formData.append(key, val));
        } else if (editForm[key] !== undefined && editForm[key] !== null) {
          formData.append(key, editForm[key]);
        }
      });
      if (images && images.length > 0) {
        Array.from(images).forEach(file => formData.append('images', file));
      }
      const { data: updatedCourt } = await API.put('/manager/court-details', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Court details updated successfully!');
      setData(prev => ({ ...prev, court: updatedCourt, courtName: updatedCourt.name }));
      setImages([]);
      setPricingConfig(prev => ({
        ...prev,
        peakStartTime: updatedCourt.peakStartTime || '',
        peakEndTime: updatedCourt.peakEndTime || '',
        pricePeak: updatedCourt.pricePeak || ''
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update court details');
    }
  };

  const handleUpdatePricing = async (e) => {
    e.preventDefault();
    try {
      const { data: updatedCourt } = await API.put('/manager/update-pricing', pricingConfig);
      toast.success('Pricing & Promotions saved successfully!');
      setData(prev => ({ ...prev, court: updatedCourt }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save pricing configuration');
    }
  };

  const handleRemoveDiscount = async () => {
    if (!window.confirm("Are you sure you want to remove the active discount offer?")) return;
    try {
      const payload = {
        ...pricingConfig,
        discountPercentage: 0,
        discountValidUntil: '',
        discountTargetTier: 'both'
      };
      const { data: updatedCourt } = await API.put('/manager/update-pricing', payload);
      toast.success('Active discount offer removed successfully!');
      setData(prev => ({ ...prev, court: updatedCourt }));
      setPricingConfig(payload);
    } catch (err) {
      toast.error('Failed to remove discount offer');
    }
  };

  useEffect(() => {
    if (blockDate && blockFacility && data && data.courtId) {
      const fetchAvailability = async () => {
        try {
          const res = await API.get(`/bookings/availability?courtId=${data.courtId}&date=${blockDate}&facility=${blockFacility}`);
          setUnavailableSlots(res.data);
          setSelectedSlots([]);
        } catch (e) { console.error(e); }
      };
      fetchAvailability();
    }
  }, [blockDate, data, blockFacility]);

  const handleBlock = async (e) => {
    e.preventDefault();
    if (selectedSlots.length === 0) {
      toast.error('Please select at least one time slot');
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
      await API.post('/manager/block', { date: blockDate, facility: blockFacility, timeBlocks });
      toast.success('Blocked Successfully');
      setSelectedSlots([]);
      setBlockDate('');
      const { data } = await API.get('/manager/dashboard');
      setData(data);
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to block'); }
  };

  const handleStatusUpdate = async (id, status, requireRefund) => {
    try {
      const payload = { status };
      if (requireRefund !== undefined) {
        payload.requireRefund = requireRefund;
      }
      await API.put(`/manager/booking/${id}`, payload);
      toast.success(`Booking ${status === 'Rejected' ? (requireRefund === false ? 'Rejected (Invalid Proof)' : 'Rejected (Refund Requested)') : status}`);
      const { data } = await API.get('/manager/dashboard');
      setData(data);
    } catch (error) { toast.error('Update failed'); }
  };

  const handleRescheduleResponse = async (id, accept) => {
    try {
      await API.put(`/bookings/${id}/reschedule-response`, { accept });
      toast.success(accept ? 'Reschedule Approved' : 'Reschedule Rejected');
      const { data } = await API.get('/manager/dashboard');
      setData(data);
    } catch (error) { toast.error('Update failed'); }
  };

  const submitRefundClaim = async (bookingId) => {
    const refundTransactionId = refundTidByBooking[bookingId];
    if (!refundTransactionId) {
      toast.error('Enter refund transaction ID first');
      return;
    }
    try {
      await API.put(`/bookings/${bookingId}/complete-refund`, { refundTransactionId });
      toast.success('Refund marked as claimed');
      const { data } = await API.get('/manager/dashboard');
      setData(data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit refund');
    }
  };

  if (!data) return <div className="page-container">Loading...</div>;

  return (
    <div className="page-container">
      {/* Header Section */}
      <div className="header-section" style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
        padding: '2rem',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background element */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'rgba(59, 130, 246, 0.05)', filter: 'blur(60px)', borderRadius: '50%' }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>
            <LayoutDashboard color="#3b82f6" size={28} />
            Manager Portal
          </h1>
          <p style={{ color: '#9ca3af', marginTop: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            Managing: <span style={{ color: 'white', fontWeight: '700' }}>{data.courtName}</span>
            <span style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }}></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
              Active
            </span>
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {data.approvedBookings && (
            <CSVLink
              data={data.approvedBookings.map(b => ({
                Date: b.date,
                Time: `${b.startTime} - ${b.endTime}`,
                Customer: b.user ? b.user.name : 'Manual Block',
                Facility: b.facility,
                Revenue: b.totalPrice || 0
              }))}
              filename={"revenue-report.csv"}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                fontSize: '0.9rem',
                borderRadius: '14px',
                color: '#fff',
                fontWeight: '700',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Download size={20} /> Export Revenue Data
            </CSVLink>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
          <Banknote size={20} style={{ color: '#10b981', marginBottom: '8px' }} />
          <h3>Total Revenue</h3>
          <p className="stat-value" style={{ color: '#10b981', fontSize: '1.5rem' }}>PKR {data.stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%)', borderColor: 'rgba(251, 191, 36, 0.2)' }}>
          <Clock size={20} style={{ color: '#fbbf24', marginBottom: '8px' }} />
          <h3>Pending</h3>
          <p className="stat-value" style={{ color: '#fbbf24', fontSize: '1.5rem' }}>{data.stats.pendingRequests}</p>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
          <CheckCircle2 size={20} style={{ color: '#60a5fa', marginBottom: '8px' }} />
          <h3>Confirmed</h3>
          <p className="stat-value" style={{ color: '#60a5fa', fontSize: '1.5rem' }}>{data.stats.activeBookings}</p>
        </div>
      </div>

      {/* Tab Navigators */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            background: activeTab === 'overview' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
            color: activeTab === 'overview' ? '#3b82f6' : '#9ca3af',
            border: '1px solid',
            borderColor: activeTab === 'overview' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)',
            padding: '12px 20px', borderRadius: '14px', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}
        >
          <Calendar size={18} /> Recent Activity & Queue
        </button>
        <button
          onClick={() => setActiveTab('scheduling')}
          style={{
            background: activeTab === 'scheduling' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.02)',
            color: activeTab === 'scheduling' ? '#ef4444' : '#9ca3af',
            border: '1px solid',
            borderColor: activeTab === 'scheduling' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.05)',
            padding: '12px 20px', borderRadius: '14px', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}
        >
          <Ban size={18} /> Offline Blockers
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            background: activeTab === 'analytics' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
            color: activeTab === 'analytics' ? '#10b981' : '#9ca3af',
            border: '1px solid',
            borderColor: activeTab === 'analytics' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.05)',
            padding: '12px 20px', borderRadius: '14px', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}
        >
          <TrendingUp size={18} /> Performance Analytics
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          style={{
            background: activeTab === 'pricing' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.02)',
            color: activeTab === 'pricing' ? '#f59e0b' : '#9ca3af',
            border: '1px solid',
            borderColor: activeTab === 'pricing' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.05)',
            padding: '12px 20px', borderRadius: '14px', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}
        >
          <Percent size={18} /> Discounts
        </button>
        <button
          onClick={() => setActiveTab('editCourt')}
          style={{
            background: activeTab === 'editCourt' ? 'rgba(147, 51, 234, 0.15)' : 'rgba(255,255,255,0.02)',
            color: activeTab === 'editCourt' ? '#c084fc' : '#9ca3af',
            border: '1px solid',
            borderColor: activeTab === 'editCourt' ? 'rgba(147, 51, 234, 0.3)' : 'rgba(255,255,255,0.05)',
            padding: '12px 20px', borderRadius: '14px', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}
        >
          <Edit size={18} /> Edit Court
        </button>
      </div>

      <div className="dashboard-layout">
        {activeTab === 'overview' && (
          <div className="activity-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Calendar size={20} color="#3b82f6" /> Recent Activity</h2>
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              {data.recentActivity.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <p style={{ color: '#6b7280' }}>No recent activity to show.</p>
                </div>
              ) : (
                data.recentActivity.map((b) => (
                  <div key={b._id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem', transition: 'transform 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                          <ChevronRight size={20} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{b.user ? b.user.name : 'Manual Block'}</h4>
                          <p style={{ margin: '4px 0', color: '#93c5fd', fontSize: '0.85rem', fontWeight: '600' }}>{b.facility}</p>
                          <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} /> {b.date} <Clock size={14} style={{ marginLeft: '4px' }} /> {b.startTime} - {b.endTime}
                          </p>
                        </div>
                      </div>
                      <span className={`status ${b.status.toLowerCase().replace(/\s+/g, '-')}`} style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: '800' }}>{b.status}</span>
                    </div>

                    {b.status === 'Pending' && b.type === 'Online' && (
                      <div style={{ marginTop: '1.25rem', padding: '1.25rem', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '14px', background: 'rgba(16,185,129,0.03)' }}>
                        <div style={{ fontSize: '0.9rem', color: '#d1fae5', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CreditCard size={18} /> Payment Proof</span>
                          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>Amount: PKR {b.advancePaid || 0}</span>
                        </div>
                        
                        {b.paymentScreenshot ? (
                          <div style={{ marginBottom: '1.25rem' }}>
                            <small style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Transfer Screenshot</small>
                            <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <img 
                                src={b.paymentScreenshot} 
                                alt="Payment screenshot" 
                                className="screenshot-thumbnail"
                                onClick={() => setPreviewImage(b.paymentScreenshot)}
                              />
                              <div style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                                <button 
                                  type="button" 
                                  onClick={() => setPreviewImage(b.paymentScreenshot)}
                                  style={{ background: 'rgba(0,0,0,0.75)', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700' }}
                                  title="View full size"
                                >
                                  <Eye size={14} /> View
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => handleDownloadScreenshot(b.paymentScreenshot, b._id)}
                                  style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700' }}
                                  title="Download screenshot"
                                >
                                  <Download size={14} /> Download
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p style={{ color: '#f87171', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '1rem' }}>No screenshot provided.</p>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button onClick={() => handleStatusUpdate(b._id, 'Approved')} style={{ width: '100%', background: '#10b981', border: 'none', color: 'white', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <CheckCircle2 size={18} /> Approve Booking
                          </button>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleStatusUpdate(b._id, 'Rejected', false)} 
                              style={{ flex: 1, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                              title="Reject due to fake/incorrect screenshot. No refund details will be asked."
                            >
                              <XCircle size={15} /> Reject (Invalid Proof)
                            </button>
                            <button 
                              onClick={() => handleStatusUpdate(b._id, 'Rejected', true)} 
                              style={{ flex: 1, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                              title="Reject but require user to enter bank details for a refund."
                            >
                              <XCircle size={15} /> Reject (Refund Needed)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {b.status === 'Reschedule Requested' && (
                      <div style={{ marginTop: '1.25rem', padding: '1.25rem', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px', background: 'rgba(245,158,11,0.03)' }}>
                        <div style={{ fontSize: '0.9rem', color: '#fcd34d', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <Calendar size={18} /> Reschedule Request
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', marginBottom: '1.25rem' }}>
                          <p style={{ margin: 0, fontSize: '0.95rem' }}>
                            New Date: <span style={{ fontWeight: '700', color: 'white' }}>{b.rescheduleDetails?.date}</span><br />
                            New Time: <span style={{ fontWeight: '700', color: 'white' }}>{b.rescheduleDetails?.startTime} - {b.rescheduleDetails?.endTime}</span>
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => handleRescheduleResponse(b._id, true)} style={{ flex: 1, background: '#10b981', border: 'none', color: 'white', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' }}>Approve</button>
                          <button onClick={() => handleRescheduleResponse(b._id, false)} style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' }}>Reject</button>
                        </div>
                      </div>
                    )}

                    {b.status === 'Refund Pending' && (
                      <div style={{ marginTop: '1.25rem', padding: '1.25rem', border: '1px solid rgba(250,204,21,0.2)', borderRadius: '14px', background: 'rgba(250,204,21,0.03)' }}>
                        <div style={{ fontSize: '0.95rem', color: '#fef3c7', lineHeight: '1.7', marginBottom: '15px' }}>
                          <div style={{ marginBottom: '8px', color: '#fbbf24', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '0.5px' }}>PAYMENT DETAILS</div>
                          Refund Amount: <strong style={{ color: 'white' }}>PKR {b.advancePaid || 0}</strong><br />
                          Bank: <strong style={{ color: 'white' }}>{b.refundBankName}</strong><br />
                          Title: <strong style={{ color: 'white' }}>{b.refundAccountTitle}</strong><br />
                          Acc #: <strong style={{ color: 'white' }}>{b.refundAccountNumber}</strong>
                        </div>

                        {/* Refund Steps */}
                        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px dashed rgba(245, 158, 11, 0.25)', marginBottom: '15px' }}>
                          <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#fbbf24', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ShieldAlert size={14} /> REFUND PROCESS STEPS:
                          </p>
                          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#e5e7eb', lineHeight: '1.4' }}>
                            <strong style={{ color: 'white' }}>Step 1:</strong> Send refund to the account above.
                          </p>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#e5e7eb', lineHeight: '1.4' }}>
                            <strong style={{ color: 'white' }}>Step 2:</strong> Send payment screenshot to <strong style={{ color: '#fbbf24' }}>{b.refundContactNumber}</strong> via WhatsApp.
                          </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {b.refundContactNumber && (
                            <a href={`https://wa.me/${b.refundContactNumber}`} target="_blank" rel="noreferrer" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '10px', borderRadius: '10px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <MessageCircle size={18} /> Message User on WhatsApp
                            </a>
                          )}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <input
                              placeholder="Refund Transaction ID"
                              value={refundTidByBooking[b._id] || ''}
                              onChange={(e) => setRefundTidByBooking((prev) => ({ ...prev, [b._id]: e.target.value }))}
                              style={{
                                flex: '1',
                                minWidth: '150px',
                                background: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                color: 'white',
                                fontSize: '0.9rem',
                                outline: 'none'
                              }}
                            />
                            <button onClick={() => submitRefundClaim(b._id)} style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' }}>Submit</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {b.status === 'Disputed' && (
                      <div style={{ marginTop: '1.25rem', color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5' }}>User reported missing funds. Khelo Support will contact you via email shortly.</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'scheduling' && (
          <div className="block-section">
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                <Ban className="text-red" size={24} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f87171' }}>Block Slot (Offline)</h3>
              </div>
              <form onSubmit={handleBlock}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Facility</label>
                    <select 
                      value={blockFacility} 
                      onChange={e => setBlockFacility(e.target.value)} 
                      required 
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '10px', 
                        padding: '12px',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.1)',
                        width: '100%'
                      }}
                    >
                      {(data.court?.facilities || []).map((f) => (
                        <option key={f} value={f} style={{ background: '#1a1a1a', color: 'white' }}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Date</label>
                    <input type="date" min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]} value={blockDate} onChange={e => setBlockDate(e.target.value)} required style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px' }} />
                  </div>
                </div>
                {blockDate && (
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '10px', display: 'block' }}>Select Time Slots</label>
                    <TimeSlotPicker
                      selectedSlots={selectedSlots}
                      onChange={setSelectedSlots}
                      unavailableSlots={unavailableSlots}
                      startHour={parseHour(data.court?.operationalStartTime, 0)}
                      endHour={parseHour(data.court?.operationalEndTime, 24)}
                      selectedDate={blockDate}
                    />
                  </div>
                )}
                <button className="confirm-btn" style={{ background: '#ef4444', width: '100%', padding: '14px', borderRadius: '12px', marginTop: '1.5rem', fontWeight: '800' }} disabled={selectedSlots.length === 0}>
                  Mark as Taken
                </button>
              </form>
            </div>
          </div>
        )}

        {/* PRICING & PROMOTIONAL MANAGEMENT */}
        {activeTab === 'pricing' && (
          <div className="block-section">
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Percent size={28} style={{ color: '#ec4899' }} />
                  <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'white', fontWeight: '900' }}>Promotional Discounts</h3>
                </div>
                {(pricingConfig.discountPercentage > 0) && (
                  <button 
                    type="button" 
                    onClick={handleRemoveDiscount}
                    style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 18px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                  >
                    <XCircle size={16} /> Remove Active Discount
                  </button>
                )}
              </div>
              <form onSubmit={handleUpdatePricing}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'block', marginBottom: '8px', fontWeight: '700' }}>DISCOUNT PERCENTAGE (%)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 15" 
                      min="0" 
                      max="100" 
                      value={pricingConfig.discountPercentage} 
                      onChange={e => setPricingConfig({...pricingConfig, discountPercentage: e.target.value})} 
                      style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px', width: '100%', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'block', marginBottom: '8px', fontWeight: '700' }}>DISCOUNT EXPIRY DATE</label>
                    <input 
                      type="date" 
                      value={pricingConfig.discountValidUntil} 
                      onChange={e => setPricingConfig({...pricingConfig, discountValidUntil: e.target.value})} 
                      style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px', width: '100%', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} 
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'block', marginBottom: '8px', fontWeight: '700' }}>PROMOTION TARGET SCOPE</label>
                  <select 
                    value={pricingConfig.discountTargetTier} 
                    onChange={e => setPricingConfig({...pricingConfig, discountTargetTier: e.target.value})} 
                    style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px', width: '100%', color: '#ec4899', fontWeight: '800', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="both" style={{background:'#1a1a1a'}}>Apply to Both Peak & Base Rates</option>
                    <option value="base" style={{background:'#1a1a1a'}}>Apply Only to Base Off-Peak Rate</option>
                    <option value="peak" style={{background:'#1a1a1a'}}>Apply Only to Dynamic Peak Rate</option>
                  </select>
                </div>

                <button type="submit" style={{ background: '#ec4899', width: '100%', padding: '16px', borderRadius: '14px', fontWeight: '900', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 10px 25px rgba(236, 72, 153, 0.3)' }}>
                  APPLY DISCOUNT OFFER
                </button>
              </form>
            </div>
          </div>
        )}
        {activeTab === 'analytics' && (() => {
          // Compute metrics
          const revenueMap = {};
          const facilityMap = {};
          const hourCounts = Array(24).fill(0).map((_, i) => ({
            hourLabel: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
            fullLabel: formatAMPM(`${i.toString().padStart(2, '0')}:00`),
            hour: i,
            bookings: 0,
            tier: 'Base'
          }));

          let pStart = null, pEnd = null;
          if (data.court?.peakStartTime && data.court?.peakEndTime) {
            pStart = parseHour(data.court.peakStartTime, null);
            pEnd = parseHour(data.court.peakEndTime, null);
          }
          hourCounts.forEach(item => {
            if (pStart !== null && pEnd !== null && item.hour >= pStart && item.hour < pEnd) {
              item.tier = 'Peak';
            }
          });

          const validBookings = [...(data.approvedBookings || [])].reverse();
          validBookings.forEach(b => {
            const d = b.date || 'N/A';
            revenueMap[d] = (revenueMap[d] || 0) + (b.totalPrice || 0);

            const f = b.facility || 'Court';
            facilityMap[f] = (facilityMap[f] || 0) + (b.totalPrice || 0);

            const h = parseHour(b.startTime, null);
            if (h !== null && h >= 0 && h < 24) {
              hourCounts[h].bookings += 1;
            }
          });

          const revenueData = Object.keys(revenueMap).map(date => ({ date, revenue: revenueMap[date] }));
          const facilityColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
          const facilityData = Object.keys(facilityMap).map((name, idx) => ({
            name,
            value: facilityMap[name],
            color: facilityColors[idx % facilityColors.length]
          }));

          return (
            <div className="analytics-section" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: 'white', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp color="#10b981" size={22} /> Daily Revenue Progression (PKR)
                </h3>
                {revenueData.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No approved booking data mapped yet.</p>
                ) : (
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 20, bottom: 15 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} label={{ value: 'Date Timeline', position: 'insideBottom', offset: -10, fill: '#6b7280', fontSize: 10 }} />
                        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={val => `â‚¨${val.toLocaleString()}`} label={{ value: 'Total Revenue (PKR)', angle: -90, position: 'insideLeft', offset: -10, fill: '#6b7280', fontSize: 10, style: { textAnchor: 'middle' } }} />
                        <Tooltip 
                          contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px' }}
                          itemStyle={{ color: '#f3f4f6', fontWeight: '600' }}
                          labelStyle={{ color: '#93c5fd', fontWeight: '700', marginBottom: '4px' }}
                          formatter={(value) => [`PKR ${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1.5rem 0', color: 'white', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock color="#f59e0b" size={20} /> Peak vs. Off-Peak Booking Heat
                  </h3>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourCounts} margin={{ top: 15, right: 10, left: 0, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="hourLabel" stroke="#9ca3af" fontSize={9} interval={3} tickLine={false} label={{ value: 'Time of Day (Hours)', position: 'insideBottom', offset: -10, fill: '#6b7280', fontSize: 9 }} />
                        <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} allowDecimals={false} label={{ value: 'Bookings Count', angle: -90, position: 'insideLeft', offset: 5, fill: '#6b7280', fontSize: 10, style: { textAnchor: 'middle' } }} />
                        <Tooltip 
                          contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px' }}
                          itemStyle={{ color: '#f3f4f6', fontWeight: '600' }}
                          labelStyle={{ color: '#fcd34d', fontWeight: '700', marginBottom: '4px' }}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullLabel || label}
                          formatter={(value, name, props) => [`${value} Bookings`, props.payload.tier + ' Hour']}
                        />
                        <Bar dataKey="bookings" radius={[6, 6, 0, 0]}>
                          {hourCounts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.tier === 'Peak' ? '#f59e0b' : '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '10px', fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#3b82f6' }}></span> Base Slots
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }}></span> Peak Slots
                    </span>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1.5rem 0', color: 'white', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Banknote color="#ec4899" size={20} /> Facility Revenue Split
                  </h3>
                  {facilityData.length === 0 ? (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No layout distributions generated.</p>
                  ) : (
                    <div style={{ width: '100%', height: 260, position: 'relative' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={facilityData}
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="rgba(0,0,0,0.2)"
                          >
                            {facilityData.map((entry, index) => (
                              <Cell key={`pie-cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px' }}
                            itemStyle={{ color: '#f3f4f6', fontWeight: '600' }}
                            labelStyle={{ color: '#f472b6', fontWeight: '700', marginBottom: '4px' }}
                            formatter={(value) => [`PKR ${value.toLocaleString()}`, 'Total Revenue']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                        {facilityData.map((entry, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#e5e7eb' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color }}></span>
                            {entry.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        {activeTab === 'editCourt' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '3rem', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <form onSubmit={handleUpdateDetails}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}><CheckCircle2 size={16} /> VENUE NAME</label>
                    <input style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}><MapPin size={16} /> LOCATION ADDRESS</label>
                    <input style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} value={editForm.location || ''} onChange={e => setEditForm({...editForm, location: e.target.value})} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '2.5rem' }}>
                  <div className="form-group">
                    <label style={{ marginBottom: '1rem', display: 'block', color: 'white', fontWeight: '800', fontSize: '0.9rem' }}>AVAILABLE SUB-FACILITIES</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {['Futsal', 'Padel', 'Cricket'].map((f) => (
                        <button key={f} type="button" onClick={() => toggleEditFacility(f)} style={{
                          border: '1px solid',
                          borderColor: (editForm.facilities || []).includes(f) ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                          background: (editForm.facilities || []).includes(f) ? 'rgba(59,130,246,0.1)' : 'transparent',
                          color: (editForm.facilities || []).includes(f) ? 'white' : '#6b7280',
                          borderRadius: '12px', padding: '10px 20px', cursor: 'pointer', fontWeight: '800', fontSize: '0.75rem',
                          transition: 'all 0.2s'
                        }}>{f.toUpperCase()}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ marginBottom: '1rem', display: 'block', color: 'white', fontWeight: '800', fontSize: '0.9rem' }}>SUPPORTED AMENITIES</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {['Parking', 'Showers', 'Cafe', 'Floodlights', 'Changing Room'].map((a) => (
                        <button key={a} type="button" onClick={() => toggleEditAmenity(a)} style={{
                          border: '1px solid',
                          borderColor: (editForm.amenities || []).includes(a) ? '#10b981' : 'rgba(255,255,255,0.1)',
                          background: (editForm.amenities || []).includes(a) ? 'rgba(16,185,129,0.1)' : 'transparent',
                          color: (editForm.amenities || []).includes(a) ? 'white' : '#6b7280',
                          borderRadius: '12px', padding: '10px 16px', cursor: 'pointer', fontWeight: '800', fontSize: '0.75rem',
                          transition: 'all 0.2s'
                        }}>{a.toUpperCase()}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', marginBottom: '2.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ color: '#60a5fa', marginBottom: '1.25rem', marginTop: 0, fontSize: '0.95rem', fontWeight: '800' }}>
                    âš¡ BASE PRICING PARAMETERS
                  </h4>
                  <div className="form-group">
                    <label style={{ marginBottom: '0.75rem', display: 'block', color: '#9ca3af', fontWeight: '700', fontSize: '0.85rem' }}>BASE PRICE PER HOUR (PKR)</label>
                    <input type="number" placeholder="e.g. 4000" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} value={editForm.pricePerHour || ''} onChange={e => setEditForm({...editForm, pricePerHour: e.target.value})} required />
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                    <label style={{ marginBottom: '1rem', display: 'block', color: '#f59e0b', fontWeight: '800', fontSize: '0.85rem' }}>âš¡ DYNAMIC PEAK HOUR TIER CONFIGURATION</label>
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '6px', fontWeight: '800' }}>PEAK RATE (PKR/hr)</label>
                      <input type="number" placeholder="e.g. 6000" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px', color: 'white', width: '100%' }} value={editForm.pricePeak || ''} onChange={e => setEditForm({...editForm, pricePeak: e.target.value})} />
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
                    <div className="form-group"><label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '800', marginBottom: '0.5rem', display: 'block' }}>BANK NAME</label><input style={{ background: 'rgba(0,0,0,0.3)', border: 'none', padding: '12px', borderRadius: '10px', color: 'white', width: '100%' }} value={editForm.paymentBank || ''} onChange={e => setEditForm({...editForm, paymentBank: e.target.value})} /></div>
                    <div className="form-group"><label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '800', marginBottom: '0.5rem', display: 'block' }}>ACCOUNT TITLE</label><input style={{ background: 'rgba(0,0,0,0.3)', border: 'none', padding: '12px', borderRadius: '10px', color: 'white', width: '100%' }} value={editForm.paymentAccountTitle || ''} onChange={e => setEditForm({...editForm, paymentAccountTitle: e.target.value})} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group"><label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '800', marginBottom: '0.5rem', display: 'block' }}>ACCOUNT NUMBER</label><input style={{ background: 'rgba(0,0,0,0.3)', border: 'none', padding: '12px', borderRadius: '10px', color: 'white', width: '100%' }} value={editForm.paymentAccountNumber || ''} onChange={e => setEditForm({...editForm, paymentAccountNumber: e.target.value})} /></div>
                    <div className="form-group"><label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '800', marginBottom: '0.5rem', display: 'block' }}>ADVANCE REQUIRED (PKR)</label><input type="number" style={{ background: 'rgba(0,0,0,0.3)', border: 'none', padding: '12px', borderRadius: '10px', color: 'white', width: '100%' }} value={editForm.advanceRequired || 0} onChange={e => setEditForm({...editForm, advanceRequired: e.target.value})} /></div>
                  </div>
                </div>

                <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '2rem', borderRadius: '24px', border: '1px dashed rgba(59, 130, 246, 0.3)', textAlign: 'center', marginBottom: '3rem' }}>
                  <ImageIcon size={32} color="#3b82f6" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>UPDATE MEDIA ASSETS</h4>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }}>Upload high-resolution images of your facility. Max 5 images.</p>
                  <input type="file" multiple accept="image/*" onChange={(e) => setImages(e.target.files)} style={{ display: 'none' }} id="manager-court-images-upload" />
                  <label htmlFor="manager-court-images-upload" style={{ background: '#3b82f6', color: 'white', padding: '10px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'inline-block' }}>CHOOSE IMAGES</label>
                  {images.length > 0 && <p style={{ color: '#10b981', fontWeight: '800', fontSize: '0.8rem', marginTop: '1rem' }}>{images.length} images selected</p>}
                </div>

                <button style={{ 
                  width: '100%', background: '#3b82f6', color: 'white', 
                  padding: '18px', borderRadius: '16px', border: 'none', 
                  fontSize: '1rem', fontWeight: '900', letterSpacing: '1px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                  boxShadow: '0 10px 30px rgba(59, 130, 246, 0.2)'
                }}>
                  <Save size={20} /> DEPLOY VENUE UPDATES
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div className="lightbox-modal-content" onClick={e => e.stopPropagation()}>
            <button type="button" className="close-modal" onClick={() => setPreviewImage(null)}>
              <X size={24} />
            </button>
            <img src={previewImage} alt="Full size preview" className="lightbox-img" />
            <button 
              type="button" 
              onClick={() => handleDownloadScreenshot(previewImage, 'preview')}
              style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={18} /> Download Screenshot
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ManagerDashboard;

