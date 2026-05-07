import { useEffect, useState } from 'react';
import API from '../api/axios';
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