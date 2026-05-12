import { useEffect, useState, useContext } from 'react';
import API from '../api/axios';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  User, 
  Mail, 
  Award, 
  AlertCircle, 
  Calendar, 
  Clock, 
  CreditCard, 
  ChevronRight, 
  History, 
  ShieldCheck, 
  XCircle,
  FileText,
  BadgeCheck,
  Smartphone,
  UploadCloud,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const TeamProfile = () => {
  const { user: authUser } = useContext(AuthContext);
  const [showBookingHistory, setShowBookingHistory] = useState(true);
  const [showMatchHistory, setShowMatchHistory] = useState(true);
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [matchHistory, setMatchHistory] = useState({ hosted: [], challenged: [] });
  const [disputeReasonByBooking, setDisputeReasonByBooking] = useState({});
  const [refundModalBooking, setRefundModalBooking] = useState(null);
  const [refundForm, setRefundForm] = useState({
    refundBankName: '',
    refundAccountTitle: '',
    refundAccountNumber: '',
    refundContactNumber: ''
  });
  
  const [paymentModalBooking, setPaymentModalBooking] = useState(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  
  const fetchData = async () => {
    try {
      const [bookingRes, matchRes, profileRes] = await Promise.all([
        API.get('/bookings/mybookings'),
        API.get('/matches/history'),
        API.get('/users/profile')
      ]);
      
      setBookings(bookingRes.data);
      setMatchHistory(matchRes.data);
      setProfile(profileRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('refreshBookings', fetchData);
    return () => window.removeEventListener('refreshBookings', fetchData);
  }, []);

  const allMatches = [
    ...matchHistory.hosted.map(m => ({...m, isHost: true})), 
    ...matchHistory.challenged.map(m => ({...m, isHost: false}))
  ];
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const threeMonthsAgoDate = new Date();
  threeMonthsAgoDate.setMonth(threeMonthsAgoDate.getMonth() - 3);
  const threeMonthsAgo = threeMonthsAgoDate.toISOString().split('T')[0];
  const visibleBookings = bookings.filter((b) => !(b.status === 'Rejected' && b.date < threeMonthsAgo));

  const handleDeleteBooking = async (id) => {
    if(window.confirm('Are you sure you want to cancel this booking request?')) {
        try {
            await API.delete(`/bookings/${id}`);
            setBookings(bookings.filter(b => b._id !== id));
            toast.success('Booking request cancelled.');
        } catch(error) {
            toast.error('Failed to cancel booking.');
        }
    }
  };

  const reportAttendance = async (matchId, challengerAttended) => {
    try {
      await API.put(`/matches/${matchId}/report-attendance`, { challengerAttended });
      toast.success('Attendance reported');
      const matchRes = await API.get('/matches/history');
      setMatchHistory(matchRes.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to report attendance');
    }
  };

  const handleDisputeRefund = async (bookingId) => {
    const disputeReason = disputeReasonByBooking[bookingId] || '';
    if (!disputeReason.trim()) {
      toast.error('Please add dispute reason first.');
      return;
    }
    try {
      await API.put(`/bookings/${bookingId}/verify-refund`, { received: false, disputeReason });
      toast.success('Refund marked as disputed.');
      const bookingRes = await API.get('/bookings/mybookings');
      setBookings(bookingRes.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to dispute refund.');
    }
  };

  const handleAcceptRefund = async (bookingId) => {
    try {
      await API.put(`/bookings/${bookingId}/verify-refund`, { received: true });
      toast.success('Refund accepted successfully.');
      const bookingRes = await API.get('/bookings/mybookings');
      setBookings(bookingRes.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept refund.');
    }
  };

  const refundPendingCount = visibleBookings.filter((b) => b.status === 'Awaiting Refund Details').length;

  const openRefundModal = (booking) => {
    setRefundModalBooking(booking);
    setRefundForm({
      refundBankName: booking.refundBankName || '',
      refundAccountTitle: booking.refundAccountTitle || '',
      refundAccountNumber: booking.refundAccountNumber || '',
      refundContactNumber: booking.refundContactNumber || ''
    });
  };

  const submitRefundDetails = async () => {
    if (!refundModalBooking) return;
    try {
      await API.put(`/bookings/${refundModalBooking._id}/supply-refund-info`, refundForm);
      toast.success('Refund details submitted to manager.');
      setRefundModalBooking(null);
      const bookingRes = await API.get('/bookings/mybookings');
      setBookings(bookingRes.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit refund details');
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
      const formData = new FormData();
      formData.append('paymentScreenshot', paymentScreenshot);
      await API.put(`/bookings/${paymentModalBooking._id}/submit-payment-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Payment proof submitted.');
      setPaymentModalBooking(null);
      removeScreenshot();
      const bookingRes = await API.get('/bookings/mybookings');
      setBookings(bookingRes.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit payment proof');
    }
  };

  return (
    <div className="page-container" style={{ padding: '0 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Premium User Header */}
      <div style={{ 
        background: 'rgba(255,255,255,0.03)', 
        padding: '2rem', 
        borderRadius: '30px', 
        border: '1px solid rgba(255,255,255,0.08)', 
        marginBottom: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '24px', 
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(37, 99, 235, 0.3)'
          }}>
            <User size={40} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: 'white', letterSpacing: '-0.5px' }}>
                {profile?.name || authUser?.name || 'Loading...'}
              </h1>
              {profile?.isVerified && (
                <div title="Verified Athlete" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px', borderRadius: '50%', display: 'flex' }}>
                  <BadgeCheck size={16} />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '6px', color: '#9ca3af', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> {profile?.email || authUser?.email}
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '12px 20px', borderRadius: '18px', border: '1px solid rgba(59, 130, 246, 0.1)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#60a5fa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Matches</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '1.25rem', color: 'white', fontWeight: '900' }}>{profile?.matchesPlayed || 0}</p>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '12px 20px', borderRadius: '18px', border: '1px solid rgba(239, 68, 68, 0.1)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#f87171', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>No-Shows</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '1.25rem', color: 'white', fontWeight: '900' }}>{profile?.noShows || 0}</p>
            </div>
          </div>
        </div>

        {refundPendingCount > 0 && (
          <div style={{ 
            background: 'linear-gradient(to right, rgba(239, 68, 68, 0.1), transparent)', 
            borderLeft: '4px solid #ef4444', 
            padding: '12px 20px', 
            borderRadius: '0 14px 14px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            <div style={{ background: '#ef4444', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '900' }}>
              {refundPendingCount}
            </div>
            <div>
              <p style={{ margin: 0, color: 'white', fontWeight: '700', fontSize: '0.95rem' }}>Action Required: Refund Details Needed</p>
              <p style={{ margin: '2px 0 0 0', color: '#fca5a5', fontSize: '0.8rem' }}>Please provide your bank details for {refundPendingCount} canceled booking(s).</p>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <div 
          onClick={() => setShowBookingHistory(!showBookingHistory)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '14px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', display: 'flex' }}>
              <Calendar size={20} color="#3b82f6" />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: 'white' }}>Booking History</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '0.85rem', fontWeight: '600' }}>
            {showBookingHistory ? 'Hide' : 'Show'}
            {showBookingHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
        
        {showBookingHistory && (
          <>
            {visibleBookings.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p style={{ color: '#6b7280', margin: 0 }}>No bookings found in your history.</p>
              </div>
            ) : (
              <div className="courts-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {visibleBookings.map((b) => (
                  <div 
                    key={b._id} 
                    className="card" 
                    onClick={() => b.status === 'Awaiting Refund Details' ? openRefundModal(b) : undefined}
                    style={{ 
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid rgba(255,255,255,0.08)', 
                      borderRadius: '24px',
                      padding: '1.5rem',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: b.status === 'Awaiting Refund Details' ? 'pointer' : 'default',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'white', maxWidth: '70%' }}>{b.court?.name}</h3>
                      <span style={{ 
                        background: b.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : b.status === 'Rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                        color: b.status === 'Approved' ? '#10b981' : b.status === 'Rejected' ? '#f87171' : '#facc15',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.65rem',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {b.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#9ca3af', fontSize: '0.85rem' }}>
                        <Calendar size={16} /> {b.date}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#9ca3af', fontSize: '0.85rem' }}>
                        <Clock size={16} /> {b.startTime}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa', fontSize: '0.85rem', fontWeight: '700' }}>
                        <Award size={16} /> {b.facility}
                      </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase' }}>Amount Paid</p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '1.2rem', color: 'white', fontWeight: '900' }}>PKR {b.totalPrice}</p>
                      </div>
                    </div>

                    {b.status === 'Rejected' && b.disputeReason && (
                      <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#fca5a5', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <AlertCircle size={12} /> Rejection Reason
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#e5e7eb', lineHeight: '1.4' }}>{b.disputeReason}</p>
                      </div>
                    )}

                    {/* Contextual Actions */}
                    <div style={{ marginTop: '1.25rem' }}>
                      {['Pending', 'Awaiting Payment'].includes(b.status) && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteBooking(b._id); }} style={{ width: '100%', background: 'rgba(239, 68, 68, 0.05)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem' }}>
                          Cancel Request
                        </button>
                      )}
                      {b.status === 'Awaiting Payment' && (
                        <button onClick={(e) => { e.stopPropagation(); setPaymentModalBooking(b); }} style={{ marginTop: '10px', width: '100%', background: 'var(--primary-color)', color: 'white', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem' }}>
                          Submit Proof
                        </button>
                      )}
                      {b.status === 'Refund Claimed' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleAcceptRefund(b._id); }} style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem' }}>
                            Confirm Refund Received
                          </button>
                          <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={e => e.stopPropagation()}>
                            <input 
                              type="text" 
                              placeholder="Reason if refund not received or incorrect amount..." 
                              value={disputeReasonByBooking[b._id] || ''} 
                              onChange={(e) => setDisputeReasonByBooking({ ...disputeReasonByBooking, [b._id]: e.target.value })}
                              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 12px', color: 'white', fontSize: '0.75rem', width: '100%' }}
                            />
                            <button onClick={(e) => { e.stopPropagation(); handleDisputeRefund(b._id); }} style={{ width: '100%', background: 'rgba(239, 68, 68, 0.05)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem' }}>
                              Dispute Refund
                            </button>
                          </div>
                        </div>
                      )}
                      {b.status === 'Awaiting Refund Details' && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '0.75rem', fontWeight: '800' }}>
                          <AlertCircle size={16} /> SUBMIT REFUND DETAILS
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <div 
          onClick={() => setShowMatchHistory(!showMatchHistory)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '14px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', display: 'flex' }}>
              <History size={20} style={{ color: '#10b981' }} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: 'white' }}>Match History</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '0.85rem', fontWeight: '600' }}>
            {showMatchHistory ? 'Hide' : 'Show'}
            {showMatchHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>

        {showMatchHistory && (
          <>
            {allMatches.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p style={{ color: '#6b7280', margin: 0 }}>No played matches found.</p>
              </div>
            ) : (
              <div className="courts-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {allMatches.map((match, i) => (
                  <div 
                    key={match._id || i} 
                    className="card"
                    style={{ 
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid rgba(255,255,255,0.08)', 
                      borderRadius: '24px',
                      padding: '1.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'white' }}>{match.court?.name}</h3>
                      <span style={{ 
                        background: match.date < todayStr ? (match.challengerUser ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 'rgba(250, 204, 21, 0.1)', 
                        color: match.date < todayStr ? (match.challengerUser ? '#60a5fa' : '#f87171') : '#facc15',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.6rem',
                        fontWeight: '900',
                        textTransform: 'uppercase'
                      }}>
                        {match.date < todayStr ? (match.challengerUser ? 'PLAYED' : 'EXPIRED') : 'UPCOMING'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#9ca3af', fontSize: '0.85rem' }}>
                        <Calendar size={16} /> {match.date}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#9ca3af', fontSize: '0.85rem' }}>
                        <Clock size={16} /> {match.startTime}
                      </div>
                    </div>

                    <div style={{ marginTop: '1.25rem', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ margin: 0, fontSize: '0.65rem', color: '#6b7280', fontWeight: '800', textTransform: 'uppercase' }}>Host Team</p>
                      <p style={{ margin: '4px 0 0 0', color: 'white', fontWeight: '800', fontSize: '0.9rem' }}>{match.adHocTeamName}</p>
                    </div>

                    {(() => {
                      const matchDateTime = new Date(`${match.date}T${match.endTime || match.startTime}:00`);
                      const isPast = matchDateTime < new Date();
                      return (
                        <div style={{ marginTop: '1.25rem' }}>
                          {match.status === 'Closed' && !match.attendanceReported && match.challengerUser && match.isHost && isPast && (
                            <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '14px' }}>
                              <p style={{ margin: '0 0 10px 0', color: '#bfdbfe', fontSize: '0.8rem', fontWeight: '700' }}>
                                Report Attendance
                              </p>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <button onClick={(e) => { e.stopPropagation(); reportAttendance(match._id, true); }} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: '800', fontSize: '0.7rem', cursor: 'pointer' }}>Yes, played</button>
                                <button onClick={(e) => { e.stopPropagation(); reportAttendance(match._id, false); }} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px', borderRadius: '8px', fontWeight: '800', fontSize: '0.7rem', cursor: 'pointer' }}>No-Show</button>
                              </div>
                            </div>
                          )}
                          {match.status === 'Closed' && !match.attendanceReported && match.challengerUser && !match.isHost && isPast && (
                            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center' }}>Waiting for host attendance report...</p>
                          )}
                          {match.attendanceReported && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#10b981', fontSize: '0.8rem', fontWeight: '900' }}>
                              <BadgeCheck size={16} /> ATTENDANCE REPORTED
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals - Refined Styling */}
      {refundModalBooking && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-content" style={{ borderRadius: '28px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', padding: '2.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1.5rem', color: 'white' }}>Submit Refund Details</h3>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
               <p style={{ margin: 0, fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '800' }}>Booking Location</p>
               <p style={{ margin: '4px 0 0 0', color: 'white', fontWeight: '800' }}>{refundModalBooking.court?.name}</p>
            </div>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              <div className="form-group">
                <label style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Bank Name</label>
                <input style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={refundForm.refundBankName} onChange={(e)=>setRefundForm({...refundForm, refundBankName:e.target.value})} />
              </div>
              <div className="form-group">
                <label style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Account Title</label>
                <input style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={refundForm.refundAccountTitle} onChange={(e)=>setRefundForm({...refundForm, refundAccountTitle:e.target.value})} />
              </div>
              <div className="form-group">
                <label style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Account Number / IBAN</label>
                <input style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={refundForm.refundAccountNumber} onChange={(e)=>setRefundForm({...refundForm, refundAccountNumber:e.target.value})} />
              </div>
              <div className="form-group">
                <label style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px', display: 'block' }}>Contact Number (WhatsApp)</label>
                <input style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '12px', color: 'white', width: '100%' }} value={refundForm.refundContactNumber} onChange={(e)=>setRefundForm({...refundForm, refundContactNumber:e.target.value})} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '2rem' }}>
              <button style={{ flex: 1, background: 'var(--primary-color)', color: 'white', border: 'none', padding: '12px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' }} onClick={submitRefundDetails}>Submit Details</button>
              <button style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: 'none', padding: '12px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' }} onClick={() => setRefundModalBooking(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {paymentModalBooking && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-content" style={{ borderRadius: '28px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', padding: '2.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1rem', color: 'white' }}>Submit Payment Proof</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Please upload a clear screenshot of your bank or wallet transfer.</p>
            
            <div style={{ marginBottom: '1.5rem' }}>
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
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '2rem' }}>
              <button style={{ flex: 1, background: 'var(--primary-color)', color: 'white', border: 'none', padding: '12px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' }} onClick={handleSubmitPaymentProof}>Submit Proof</button>
              <button style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: 'none', padding: '12px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' }} onClick={() => { setPaymentModalBooking(null); removeScreenshot(); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamProfile;