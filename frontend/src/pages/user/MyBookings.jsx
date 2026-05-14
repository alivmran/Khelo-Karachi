import { useEffect, useState } from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [editBooking, setEditBooking] = useState(null);
  const [form, setForm] = useState({ date: '', startTime: '', endTime: '' });
  const [refundForms, setRefundForms] = useState({});
  const [disputeByBooking, setDisputeByBooking] = useState({});
  const [isReschedule, setIsReschedule] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  const canReschedule = (dateStr, timeStr) => {
    try {
      const bookingTime = new Date(`${dateStr}T${timeStr}`);
      const now = new Date();
      return (bookingTime - now) / (1000 * 60 * 60) >= 6;
    } catch { return false; }
  };

  const fetchBookings = async () => {
    try {
      const { data } = await API.get('/bookings/mybookings');
      setBookings(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleDelete = async (id) => {
      if(window.confirm('Cancel this booking request?')){
        try {
            await API.delete(`/bookings/${id}`);
            toast.success('Booking Cancelled');
            fetchBookings();
        } catch (error) {
            toast.error('Failed to cancel');
        }
      }
  };

  const handleUpdate = async (e) => {
      e.preventDefault();
      try {
          if (isReschedule) {
              await API.put(`/bookings/${editBooking}/reschedule`, form);
              toast.success('Reschedule Request Submitted');
          } else {
              await API.put(`/bookings/${editBooking}`, form);
              toast.success('Booking Request Updated');
          }
          setEditBooking(null);
          setIsReschedule(false);
          fetchBookings();
      } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to process request');
      }
  };

  const handleReviewSubmit = async (e) => {
      e.preventDefault();
      try {
          await API.post(`/courts/${reviewModal}/reviews`, reviewForm);
          toast.success('Review submitted successfully!');
          setReviewModal(null);
          setReviewForm({ rating: 5, comment: '' });
      } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to submit review');
      }
  };

  const openEdit = (b, isResched = false) => {
      setEditBooking(b._id);
      setIsReschedule(isResched);
      setForm({ date: b.date, startTime: b.startTime, endTime: b.endTime });
  };

  const submitRefundInfo = async (bookingId) => {
    const payload = refundForms[bookingId] || {};
    try {
      await API.put(`/bookings/${bookingId}/supply-refund-info`, payload);
      toast.success('Refund details submitted');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit refund details');
    }
  };

  const verifyRefund = async (bookingId, received) => {
    try {
      await API.put(`/bookings/${bookingId}/verify-refund`, {
        received,
        disputeReason: disputeByBooking[bookingId] || ''
      });
      toast.success('Refund response submitted');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify refund');
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">My Bookings</h1>
      {/* Desktop table view */}
      <div className="table-container">
        <table className="bookings-table">
            <thead>
                <tr>
                <th>Court</th>
                <th>Date/Time</th>
                <th>Status</th>
                <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {bookings.map((b) => (
                <tr key={b._id}>
                    <td>{b.court?.name}</td>
                    <td>
                      {b.date} <br/> <span style={{fontSize:'0.9rem', color:'#aaa'}}>{b.startTime} - {b.endTime}</span>
                      <div style={{fontSize:'0.8rem', color:'#93c5fd'}}>Facility: {b.facility}</div>
                    </td>
                    <td>
                        <span className={`status ${b.status.toLowerCase()}`}>{b.status}</span>
                    </td>
                    <td>
                        <div className="action-buttons" style={{display:'grid', gap:'8px'}}>
                            {['Pending', 'Awaiting Payment'].includes(b.status) && (
                                <button onClick={() => openEdit(b, false)} className="edit-btn">Update</button>
                            )}
                            {['Pending', 'Awaiting Payment'].includes(b.status) && (
                                <button onClick={() => handleDelete(b._id)} className="delete-btn">Delete</button>
                            )}
                            {['Approved', 'Pending'].includes(b.status) && canReschedule(b.date, b.startTime) && (
                                <button onClick={() => openEdit(b, true)} style={{background:'#f59e0b', color:'white', border:'none', padding:'8px', borderRadius:'6px', cursor:'pointer'}}>Reschedule</button>
                            )}
                            {['Approved', 'Pending'].includes(b.status) && !canReschedule(b.date, b.startTime) && (
                                <button disabled style={{background:'#555', color:'#888', border:'none', padding:'8px', borderRadius:'6px', cursor:'not-allowed'}} title="Cannot reschedule within 6 hours of booking">Reschedule Unavailable</button>
                            )}
                            {b.status === 'Approved' && (
                                <button onClick={() => setReviewModal(b.court._id)} style={{background:'#3b82f6', color:'white', border:'none', padding:'8px', borderRadius:'6px', cursor:'pointer'}}>Leave Review</button>
                            )}
                            {b.status === 'Awaiting Refund Details' && (
                              <div style={{display:'grid', gap:'6px'}}>
                                <input placeholder="Bank Name" onChange={e => setRefundForms({...refundForms, [b._id]: {...(refundForms[b._id] || {}), refundBankName: e.target.value}})} />
                                <input placeholder="Account Title" onChange={e => setRefundForms({...refundForms, [b._id]: {...(refundForms[b._id] || {}), refundAccountTitle: e.target.value}})} />
                                <input placeholder="Account Number" onChange={e => setRefundForms({...refundForms, [b._id]: {...(refundForms[b._id] || {}), refundAccountNumber: e.target.value}})} />
                                <input placeholder="WhatsApp Number" onChange={e => setRefundForms({...refundForms, [b._id]: {...(refundForms[b._id] || {}), refundContactNumber: e.target.value}})} />
                                <button onClick={() => submitRefundInfo(b._id)} className="confirm-btn">Submit Refund Details</button>
                              </div>
                            )}
                            {b.status === 'Refund Claimed' && (
                              <div style={{display:'grid', gap:'6px'}}>
                                <div style={{fontSize:'0.84rem', color:'#ddd'}}>Manager states they refunded you (TID: {b.refundTransactionId}). Please check your account.</div>
                                <button onClick={() => verifyRefund(b._id, true)} className="confirm-btn">I received it</button>
                                <input placeholder="Reason if not received" value={disputeByBooking[b._id] || ''} onChange={e => setDisputeByBooking({...disputeByBooking, [b._id]: e.target.value})} />
                                <button onClick={() => verifyRefund(b._id, false)} className="delete-btn">I did not receive it</button>
                              </div>
                            )}
                            {b.status === 'Disputed' && (
                              <div style={{display:'grid', gap:'6px'}}>
                                <span style={{color:'#ef4444', fontWeight:'bold'}}>Refund Disputed.</span>
                                <a
                                  href={`mailto:support@khelokarachi.com?subject=${encodeURIComponent(`Dispute for Booking ${b._id}`)}&body=${encodeURIComponent(`Reason: ${b.disputeReason || ''}`)}`}
                                  style={{color:'#60a5fa'}}
                                >
                                  Email Support
                                </a>
                              </div>
                            )}
                        </div>
                    </td>
                </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="mobile-booking-cards">
        {bookings.length === 0 ? <p style={{color:'#aaa', padding:'1rem'}}>No bookings found.</p> : (
          <div style={{display:'grid', gap:'10px'}}>
            {bookings.map((b) => (
              <div key={b._id} style={{background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'10px', padding:'14px', position:'relative'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', marginBottom:'10px'}}>
                  <div>
                    <h4 style={{margin:0, fontSize:'0.95rem', color:'white'}}>{b.court?.name}</h4>
                    <p style={{margin:'4px 0 0 0', fontSize:'0.82rem', color:'#93c5fd'}}>Facility: {b.facility}</p>
                  </div>
                  <span className={`status ${b.status.toLowerCase()}`} style={{flexShrink:0, fontSize:'0.75rem'}}>{b.status}</span>
                </div>
                <div style={{display:'flex', gap:'12px', fontSize:'0.85rem', color:'#aaa', marginBottom:'10px'}}>
                  <span>ðŸ“… {b.date}</span>
                  <span>â° {b.startTime} - {b.endTime}</span>
                </div>
                <div style={{display:'grid', gap:'6px'}}>
                  {['Pending', 'Awaiting Payment'].includes(b.status) && (
                    <div style={{display:'flex', gap:'6px'}}>
                      <button onClick={() => openEdit(b, false)} style={{flex:1, background:'rgba(59,130,246,0.15)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.3)', padding:'9px', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.82rem'}}>Update</button>
                      <button onClick={() => handleDelete(b._id)} style={{flex:1, background:'rgba(239,68,68,0.12)', color:'#f87171', border:'1px solid rgba(239,68,68,0.3)', padding:'9px', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.82rem'}}>Delete</button>
                    </div>
                  )}
                  {['Approved', 'Pending'].includes(b.status) && canReschedule(b.date, b.startTime) && (
                    <button onClick={() => openEdit(b, true)} style={{background:'rgba(245,158,11,0.15)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.3)', padding:'9px', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.82rem'}}>Reschedule</button>
                  )}
                  {b.status === 'Approved' && (
                    <button onClick={() => setReviewModal(b.court._id)} style={{background:'rgba(59,130,246,0.15)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.3)', padding:'9px', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.82rem'}}>Leave Review</button>
                  )}
                  {b.status === 'Awaiting Refund Details' && (
                    <div style={{display:'grid', gap:'6px', marginTop:'4px'}}>
                      <input placeholder="Bank Name" style={{padding:'10px', borderRadius:'6px', background:'var(--bg-input)', border:'1px solid var(--border-color)', color:'white', fontSize:'0.85rem'}} onChange={e => setRefundForms({...refundForms, [b._id]: {...(refundForms[b._id] || {}), refundBankName: e.target.value}})} />
                      <input placeholder="Account Title" style={{padding:'10px', borderRadius:'6px', background:'var(--bg-input)', border:'1px solid var(--border-color)', color:'white', fontSize:'0.85rem'}} onChange={e => setRefundForms({...refundForms, [b._id]: {...(refundForms[b._id] || {}), refundAccountTitle: e.target.value}})} />
                      <input placeholder="Account Number" style={{padding:'10px', borderRadius:'6px', background:'var(--bg-input)', border:'1px solid var(--border-color)', color:'white', fontSize:'0.85rem'}} onChange={e => setRefundForms({...refundForms, [b._id]: {...(refundForms[b._id] || {}), refundAccountNumber: e.target.value}})} />
                      <input placeholder="WhatsApp Number" style={{padding:'10px', borderRadius:'6px', background:'var(--bg-input)', border:'1px solid var(--border-color)', color:'white', fontSize:'0.85rem'}} onChange={e => setRefundForms({...refundForms, [b._id]: {...(refundForms[b._id] || {}), refundContactNumber: e.target.value}})} />
                      <button onClick={() => submitRefundInfo(b._id)} style={{background:'var(--primary-color)', color:'white', border:'none', padding:'10px', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'0.85rem'}}>Submit Refund Details</button>
                    </div>
                  )}
                  {b.status === 'Refund Claimed' && (
                    <div style={{display:'grid', gap:'6px', marginTop:'4px'}}>
                      <div style={{fontSize:'0.82rem', color:'#ddd'}}>Manager says refund sent (TID: {b.refundTransactionId})</div>
                      <button onClick={() => verifyRefund(b._id, true)} style={{background:'rgba(16,185,129,0.15)', color:'#34d399', border:'1px solid rgba(16,185,129,0.4)', padding:'10px', borderRadius:'6px', cursor:'pointer', fontWeight:'600'}}>I received it</button>
                      <input placeholder="Reason if not received" value={disputeByBooking[b._id] || ''} onChange={e => setDisputeByBooking({...disputeByBooking, [b._id]: e.target.value})} style={{padding:'10px', borderRadius:'6px', background:'var(--bg-input)', border:'1px solid var(--border-color)', color:'white', fontSize:'0.85rem'}} />
                      <button onClick={() => verifyRefund(b._id, false)} style={{background:'rgba(239,68,68,0.12)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.4)', padding:'10px', borderRadius:'6px', cursor:'pointer', fontWeight:'600'}}>I did not receive it</button>
                    </div>
                  )}
                  {b.status === 'Disputed' && (
                    <div style={{padding:'10px', border:'1px solid rgba(239,68,68,0.45)', background:'rgba(239,68,68,0.1)', borderRadius:'8px'}}>
                      <span style={{color:'#fca5a5', fontWeight:'bold', fontSize:'0.85rem'}}>Refund Disputed. Support will contact you.</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

        {editBooking && (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h3>{isReschedule ? 'Reschedule Booking' : 'Update Booking'}</h3>
                    <form onSubmit={handleUpdate}>
                        <div className="form-group">
                            <label>Date</label>
                            <input type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} required/>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Start Time</label>
                                <input type="time" value={form.startTime} onChange={e=>setForm({...form, startTime: e.target.value})} required/>
                            </div>
                            <div className="form-group">
                                <label>End Time</label>
                                <input type="time" value={form.endTime} onChange={e=>setForm({...form, endTime: e.target.value})} required/>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="submit" className="confirm-btn">{isReschedule ? 'Request Reschedule' : 'Save Changes'}</button>
                            <button type="button" onClick={()=>{setEditBooking(null); setIsReschedule(false);}} className="cancel-btn">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {reviewModal && (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h3>Submit Court Review</h3>
                    <form onSubmit={handleReviewSubmit}>
                        <div className="form-group">
                            <label>Rating (1-5)</label>
                            <input type="number" min="1" max="5" value={reviewForm.rating} onChange={e=>setReviewForm({...reviewForm, rating: e.target.value})} required/>
                        </div>
                        <div className="form-group">
                            <label>Comment</label>
                            <textarea value={reviewForm.comment} onChange={e=>setReviewForm({...reviewForm, comment: e.target.value})} required rows={3}></textarea>
                        </div>
                        <div className="modal-actions">
                            <button type="submit" className="confirm-btn">Submit Review</button>
                            <button type="button" onClick={()=>setReviewModal(null)} className="cancel-btn">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default MyBookings;
