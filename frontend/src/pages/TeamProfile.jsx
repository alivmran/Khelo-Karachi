import { useEffect, useState, useContext } from 'react';
import API from '../api/axios';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';

const TeamProfile = () => {
  const { user } = useContext(AuthContext);
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
  const [senderName, setSenderName] = useState('');
  const [transactionIdShort, setTransactionIdShort] = useState('');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const bookingRes = await API.get('/bookings/mybookings');
        setBookings(bookingRes.data);
        
        const matchRes = await API.get('/matches/history');
        setMatchHistory(matchRes.data);
      } catch (error) {
        console.error(error);
      }
    };
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
      await API.put(`/bookings/${paymentModalBooking._id}/submit-payment-proof`, {
        senderName,
        transactionIdShort
      });
      toast.success('Payment proof submitted.');
      setPaymentModalBooking(null);
      setSenderName('');
      setTransactionIdShort('');
      const bookingRes = await API.get('/bookings/mybookings');
      setBookings(bookingRes.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit payment proof');
    }
  };

  return (
    <div className="page-container">
      <div className="header-section">
        <h1 className="page-title">My Profile</h1>
        {refundPendingCount > 0 && (
          <div style={{display:'inline-flex', alignItems:'center', gap:'8px', marginTop:'8px', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.5)', padding:'6px 10px', borderRadius:'999px', fontWeight:'700', color:'#f87171'}}>
            <span style={{width:'20px', height:'20px', borderRadius:'50%', background:'#ef4444', color:'#fff', display:'inline-flex', justifyContent:'center', alignItems:'center', fontSize:'0.8rem'}}>1</span>
            Refund action needed
          </div>
        )}
      </div>

      <div className="profile-section">
        <h2>Booking History</h2>
        {visibleBookings.length === 0 ? <p style={{color:'#aaa'}}>No bookings found.</p> : (
            <div className="courts-grid">
            {visibleBookings.map((b) => (
                <div key={b._id} className="card" onClick={() => b.status === 'Awaiting Refund Details' ? openRefundModal(b) : undefined}>
                    <div className="card-header">
                        <h3>{b.court?.name}</h3>
                        <span className={`badge`} style={{
                            background: b.status === 'Approved' ? 'rgba(16, 185, 129, 0.2)' : b.status === 'Rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(250, 204, 21, 0.2)',
                            color: b.status === 'Approved' ? '#34d399' : b.status === 'Rejected' ? '#f87171' : '#facc15'
                        }}>
                            {b.status}
                        </span>
                    </div>
                    <div className="card-body">
                        <p style={{color: '#aaa', margin:0, display:'flex', alignItems:'center', gap:'5px'}}>📅 {b.date}</p>
                        <p style={{color: '#aaa', margin:'5px 0 0 0', display:'flex', alignItems:'center', gap:'5px'}}>⏰ {b.startTime}</p>
                        <p style={{color:'#93c5fd', margin:'6px 0 0 0', fontSize:'0.85rem'}}>Facility: {b.facility}</p>
                        <p style={{color: 'white', fontWeight:'bold', marginTop:'15px', fontSize:'1.2rem'}}>PKR {b.totalPrice}</p>
                        {['Pending', 'Awaiting Payment'].includes(b.status) && (
                            <button onClick={() => handleDeleteBooking(b._id)} style={{marginTop:'15px', width:'100%', background:'rgba(239, 68, 68, 0.1)', color:'#ef4444', border:'1px solid rgba(239, 68, 68, 0.3)', padding:'8px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>
                                Cancel Request
                            </button>
                        )}
                        {b.status === 'Awaiting Payment' && (
                            <button onClick={() => setPaymentModalBooking(b)} style={{marginTop:'10px', width:'100%', background:'rgba(59, 130, 246, 0.15)', color:'#60a5fa', border:'1px solid rgba(59, 130, 246, 0.4)', padding:'8px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>
                                Submit Payment Proof
                            </button>
                        )}
                        {b.status === 'Refund Claimed' && (
                          <div style={{marginTop:'12px', display:'grid', gap:'8px'}}>
                            <div style={{fontSize:'0.84rem', color:'#ddd'}}>Manager marked refund sent (TID: {b.refundTransactionId || '-'}).</div>
                            <button onClick={() => handleAcceptRefund(b._id)} style={{width:'100%', background:'rgba(16, 185, 129, 0.15)', color:'#34d399', border:'1px solid rgba(16, 185, 129, 0.4)', padding:'8px', borderRadius:'6px', cursor:'pointer', fontWeight:'700'}}>
                              Confirm Refund Received
                            </button>
                            <textarea
                              placeholder="Enter dispute reason if refund not received"
                              value={disputeReasonByBooking[b._id] || ''}
                              onChange={(e) => setDisputeReasonByBooking({ ...disputeReasonByBooking, [b._id]: e.target.value })}
                              rows={2}
                              style={{width:'100%', padding:'10px', borderRadius:'8px', background:'#111827', border:'1px solid #475569', color:'#fff', marginTop: '10px'}}
                            />
                            <button onClick={() => handleDisputeRefund(b._id)} style={{width:'100%', background:'rgba(239, 68, 68, 0.14)', color:'#fca5a5', border:'1px solid rgba(239, 68, 68, 0.4)', padding:'8px', borderRadius:'6px', cursor:'pointer', fontWeight:'700'}}>
                              Dispute Refund
                            </button>
                          </div>
                        )}
                        {b.status === 'Awaiting Refund Details' && (
                          <div style={{marginTop:'12px', padding:'10px', border:'1px solid rgba(239,68,68,0.45)', background:'rgba(239,68,68,0.1)', borderRadius:'8px', color:'#fca5a5', fontWeight:'600'}}>
                            Awaiting refund details - click this card to submit.
                          </div>
                        )}
                        {b.status === 'Disputed' && (
                          <div style={{marginTop:'12px', padding:'10px', border:'1px solid rgba(239,68,68,0.45)', background:'rgba(239,68,68,0.1)', borderRadius:'8px', color:'#fca5a5', fontWeight:'600'}}>
                            Dispute submitted. Khelo support will contact you within 24 hours.
                          </div>
                        )}
                    </div>
                </div>
            ))}
            </div>
        )}
      </div>

      <div className="profile-section" style={{marginTop: '3rem'}}>
        <h2>Match History</h2>
        {allMatches.length === 0 ? <p style={{color:'#aaa'}}>No played matches found.</p> : (
            <div className="courts-grid">
            {allMatches.map((match, i) => (
                <div key={match._id || i} className="card">
                    <div className="card-header">
                        <h3>{match.court?.name}</h3>
                        <span className={`badge`} style={{ 
                            background: match.date < todayStr ? (match.challengerUser ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)') : 'rgba(250, 204, 21, 0.2)', 
                            color: match.date < todayStr ? (match.challengerUser ? '#60a5fa' : '#f87171') : '#facc15' 
                        }}>
                            {match.date < todayStr ? (match.challengerUser ? 'PLAYED' : 'EXPIRED') : 'UPCOMING'}
                        </span>
                    </div>
                    <div className="card-body">
                        <p style={{color: '#aaa', margin:0, display:'flex', alignItems:'center', gap:'5px'}}>📅 {match.date}</p>
                        <p style={{color: '#aaa', margin:'5px 0 0 0', display:'flex', alignItems:'center', gap:'5px'}}>⏰ {match.startTime}</p>
                        <div style={{marginTop:'15px', padding:'10px', background:'rgba(255,255,255,0.05)', borderRadius:'8px'}}>
                            <p style={{margin:0, fontSize:'0.85rem', color:'#888'}}>Host Team</p>
                            <p style={{margin:0, color:'white', fontWeight:'bold'}}>{match.adHocTeamName}</p>
                        </div>
                        {(() => {
                          const matchDateTime = new Date(`${match.date}T${match.endTime || match.startTime}:00`);
                          const isPast = matchDateTime < new Date();
                          return (
                            <>
                              {match.status === 'Closed' && !match.attendanceReported && match.challengerUser && match.isHost && isPast && (
                                <div style={{marginTop:'12px', padding:'10px', border:'1px solid #3b82f6', borderRadius:'8px'}}>
                                  <p style={{margin:'0 0 8px 0', color:'#bfdbfe', fontSize:'0.85rem'}}>
                                    Did the challenger ({match.challengerUser?.name || 'Player'}) show up to the match?
                                  </p>
                                  <div style={{display:'flex', gap:'8px'}}>
                                    <button onClick={(e) => { e.stopPropagation(); reportAttendance(match._id, true); }} className="confirm-btn">Yes, they played</button>
                                    <button onClick={(e) => { e.stopPropagation(); reportAttendance(match._id, false); }} className="delete-btn">No, they flaked / No-Show</button>
                                  </div>
                                </div>
                              )}
                              {match.status === 'Closed' && !match.attendanceReported && match.challengerUser && !match.isHost && isPast && (
                                <div style={{marginTop:'12px', color:'#aaa', fontSize:'0.85rem', fontStyle:'italic'}}>Waiting for host to report attendance.</div>
                              )}
                              {match.status === 'Closed' && !match.challengerUser && (
                                <div style={{marginTop:'12px', color:'#aaa', fontSize:'0.85rem', fontStyle:'italic'}}>Match expired without an accepted challenge.</div>
                              )}
                              {match.attendanceReported === true && (
                                <div style={{marginTop:'12px', color:'#34d399', fontSize:'0.85rem', fontWeight:'bold'}}>Attendance Reported</div>
                              )}
                            </>
                          );
                        })()}
                    </div>
                </div>
            ))}
            </div>
        )}
      </div>
      {refundModalBooking && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{marginBottom:'10px'}}>Submit Refund Details</h3>
            <p style={{color:'#aaa', marginBottom:'12px'}}>Court: <strong style={{color:'#fff'}}>{refundModalBooking.court?.name}</strong></p>
            <div className="form-group">
              <label>Bank Name</label>
              <input value={refundForm.refundBankName} onChange={(e)=>setRefundForm({...refundForm, refundBankName:e.target.value})} />
            </div>
            <div className="form-group">
              <label>Account Title</label>
              <input value={refundForm.refundAccountTitle} onChange={(e)=>setRefundForm({...refundForm, refundAccountTitle:e.target.value})} />
            </div>
            <div className="form-group">
              <label>Account Number</label>
              <input value={refundForm.refundAccountNumber} onChange={(e)=>setRefundForm({...refundForm, refundAccountNumber:e.target.value})} />
            </div>
            <div className="form-group">
              <label>WhatsApp Number</label>
              <input value={refundForm.refundContactNumber} onChange={(e)=>setRefundForm({...refundForm, refundContactNumber:e.target.value})} />
            </div>
            <div className="modal-actions">
              <button className="confirm-btn" onClick={submitRefundDetails}>Confirm Refund Details</button>
              <button className="cancel-btn" onClick={() => setRefundModalBooking(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {paymentModalBooking && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{marginBottom:'10px'}}>Submit Payment Proof</h3>
            <p style={{color:'#ccc', marginBottom:'12px'}}>Submit proof to continue for manager approval.</p>
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
              <button className="cancel-btn" onClick={() => setPaymentModalBooking(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamProfile;