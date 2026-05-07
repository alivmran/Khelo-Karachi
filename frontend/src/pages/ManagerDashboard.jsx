import { useEffect, useState } from 'react';
import API from '../api/axios';
import { toast } from 'react-toastify';
import TimeSlotPicker from '../components/TimeSlotPicker';
import { CSVLink } from 'react-csv';

const parseHour = (timeString, fallback) => {
  if (!timeString || typeof timeString !== 'string') return fallback;
  const [h] = timeString.split(':').map(Number);
  if (Number.isNaN(h)) return fallback;
  return h;
};

const ManagerDashboard = () => {
  const [data, setData] = useState(null);
  const [blockDate, setBlockDate] = useState('');
  const [blockFacility, setBlockFacility] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [unavailableSlots, setUnavailableSlots] = useState([]);
  const [refundTidByBooking, setRefundTidByBooking] = useState({});

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await API.get('/manager/dashboard');
        setData(data);
        setBlockFacility(data?.court?.facilities?.[0] || '');
      } catch (error) { toast.error('Failed to load dashboard'); }
    };
    fetchStats();
    window.addEventListener('refreshBookings', fetchStats);
    return () => window.removeEventListener('refreshBookings', fetchStats);
  }, []);

  useEffect(() => {
    if (blockDate && blockFacility && data && data.courtId) {
        const fetchAvailability = async () => {
            try {
                const res = await API.get(`/bookings/availability?courtId=${data.courtId}&date=${blockDate}&facility=${blockFacility}`);
                setUnavailableSlots(res.data);
                setSelectedSlots([]);
            } catch(e) { console.error(e); }
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

  const handleStatusUpdate = async (id, status) => {
      try {
          await API.put(`/manager/booking/${id}`, { status });
          toast.success(`Booking ${status}`);
          // Refresh data
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
      <div className="header-section" style={{borderBottom:'2px solid #10b981', paddingBottom:'1rem', marginBottom:'2rem', display:'flex', justifyContent:'space-between', gap:'12px', alignItems:'flex-start', flexWrap:'wrap'}}>
          <div>
            <h1 className="page-title">Manager Portal</h1>
            <p style={{color:'#aaa', marginTop:'5px'}}>Managing: <strong style={{color:'white'}}>{data.courtName}</strong></p>
          </div>
          <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
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
                className="confirm-btn" 
                style={{background:'#2563eb', textDecoration:'none', display:'inline-block', padding:'8px 16px', fontSize:'0.9rem'}}
              >
                Export Revenue (CSV)
              </CSVLink>
            )}
            <span className="badge" style={{background:'rgba(16, 185, 129, 0.2)', color:'#10b981', padding:'10px 20px', whiteSpace:'nowrap'}}>ACTIVE</span>
          </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{borderColor:'#10b981'}}><h3>Total Revenue</h3><p className="stat-value" style={{color:'#10b981'}}>PKR {data.stats.totalRevenue.toLocaleString()}</p></div>
        <div className="stat-card"><h3>Pending</h3><p className="stat-value" style={{color:'#facc15'}}>{data.stats.pendingRequests}</p></div>
        <div className="stat-card"><h3>Confirmed</h3><p className="stat-value">{data.stats.activeBookings}</p></div>
      </div>

      <div className="dashboard-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop:'1.5rem' }}>
        <div className="activity-section">
            <h2 style={{fontSize:'1.2rem', marginBottom:'1rem'}}>Recent Activity</h2>
            <div style={{display:'grid', gap:'12px'}}>
              {data.recentActivity.map((b) => (
                <div key={b._id} style={{background:'#1c1c1c', border:'1px solid #353535', borderRadius:'10px', padding:'14px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', gap:'12px', flexWrap:'wrap', alignItems:'flex-start'}}>
                    <div>
                      <h4 style={{margin:0, fontSize:'1.02rem'}}>{b.user ? b.user.name : 'Manual Block'}</h4>
                      <p style={{margin:'6px 0', color:'#93c5fd'}}>Facility: {b.facility}</p>
                      <p style={{margin:0, color:'#aaa'}}>{b.date} • {b.startTime} - {b.endTime}</p>
                    </div>
                    <span className={`status ${b.status.toLowerCase().replace(/\s+/g, '-')}`}>{b.status}</span>
                  </div>

                  {b.status === 'Pending' && b.type === 'Online' && (
                    <div style={{marginTop:'12px', padding:'12px', border:'1px solid rgba(52,211,153,0.45)', borderRadius:'8px', background:'rgba(16,185,129,0.08)'}}>
                      <div style={{fontSize:'1rem', color:'#d1fae5', fontWeight:'700'}}>Payment details from user</div>
                      <div style={{marginTop:'8px', fontSize:'0.96rem', color:'#e5e7eb', lineHeight:'1.6'}}>
                        Advance Paid: <strong>PKR {b.advancePaid || 0}</strong><br />
                        Sender Name: <strong>{b.senderName || '-'}</strong><br />
                        TID (last 4): <strong>{b.transactionIdShort || '-'}</strong>
                      </div>
                      <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                        <button onClick={() => handleStatusUpdate(b._id, 'Approved')} style={{background:'#10b981', border:'none', color:'white', padding:'8px 14px', borderRadius:'6px', cursor:'pointer', fontWeight:'700'}}>Approve</button>
                        <button onClick={() => handleStatusUpdate(b._id, 'Rejected')} style={{background:'#ef4444', border:'none', color:'white', padding:'8px 14px', borderRadius:'6px', cursor:'pointer', fontWeight:'700'}}>Cancel Booking</button>
                      </div>
                    </div>
                  )}

                  {b.status === 'Reschedule Requested' && (
                    <div style={{marginTop:'12px', padding:'12px', border:'1px solid rgba(245,158,11,0.45)', borderRadius:'8px', background:'rgba(245,158,11,0.08)'}}>
                      <div style={{fontSize:'1rem', color:'#fcd34d', fontWeight:'700'}}>Reschedule Request</div>
                      <div style={{marginTop:'8px', fontSize:'0.96rem', color:'#e5e7eb', lineHeight:'1.6'}}>
                        New Date: <strong>{b.rescheduleDetails?.date}</strong><br />
                        New Time: <strong>{b.rescheduleDetails?.startTime} - {b.rescheduleDetails?.endTime}</strong>
                      </div>
                      <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                        <button onClick={() => handleRescheduleResponse(b._id, true)} style={{background:'#10b981', border:'none', color:'white', padding:'8px 14px', borderRadius:'6px', cursor:'pointer', fontWeight:'700'}}>Approve</button>
                        <button onClick={() => handleRescheduleResponse(b._id, false)} style={{background:'#ef4444', border:'none', color:'white', padding:'8px 14px', borderRadius:'6px', cursor:'pointer', fontWeight:'700'}}>Reject</button>
                      </div>
                    </div>
                  )}

                  {b.status === 'Refund Pending' && (
                    <div style={{marginTop:'12px', padding:'12px', border:'1px solid rgba(250,204,21,0.45)', borderRadius:'8px', background:'rgba(250,204,21,0.08)'}}>
                      <div style={{fontSize:'0.95rem', color:'#fef3c7', lineHeight:'1.7'}}>
                        Refund Amount: <strong>PKR {b.advancePaid || 0}</strong><br />
                        Refund Bank: <strong>{b.refundBankName}</strong><br />
                        Account Title: <strong>{b.refundAccountTitle}</strong><br />
                        Account Number: <strong>{b.refundAccountNumber}</strong>
                      </div>
                      <p style={{marginTop:'8px', marginBottom:'8px', color:'#facc15', fontWeight:'600'}}>
                        Step 1: Send refund. Step 2: Send screenshot on WhatsApp.
                      </p>
                      {b.refundContactNumber && (
                        <a href={`https://wa.me/${b.refundContactNumber}`} target="_blank" rel="noreferrer" style={{color:'#60a5fa', fontSize:'0.92rem'}}>
                          Message User on WhatsApp
                        </a>
                      )}
                      <div style={{display:'flex', gap:'8px', marginTop:'10px', flexWrap:'wrap'}}>
                        <input
                          placeholder="Refund Transaction ID"
                          value={refundTidByBooking[b._id] || ''}
                          onChange={(e) => setRefundTidByBooking((prev) => ({ ...prev, [b._id]: e.target.value }))}
                          style={{flex:'1', minWidth:'180px'}}
                        />
                        <button onClick={() => submitRefundClaim(b._id)} style={{background:'#2563eb', border:'none', color:'white', padding:'8px 14px', borderRadius:'6px', cursor:'pointer', fontWeight:'700'}}>Submit</button>
                      </div>
                    </div>
                  )}

                  {b.status === 'Disputed' && (
                    <div style={{marginTop:'12px', color:'#fca5a5', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.45)', borderRadius:'8px', padding:'10px'}}>
                      User reported missing funds. Khelo Support will contact you via email.
                    </div>
                  )}
                </div>
              ))}
            </div>
        </div>

        <div className="block-section">
            <div className="form-container" style={{margin:0, maxWidth:'100%', border:'1px solid #333', padding:'1.5rem'}}>
                <h3 style={{color:'#ef4444'}}>Block Slot</h3>
                <form onSubmit={handleBlock}>
                    <div className="form-group">
                      <label>Facility</label>
                      <select value={blockFacility} onChange={e=>setBlockFacility(e.target.value)} required>
                        {(data.court?.facilities || []).map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>Date</label><input type="date" min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]} value={blockDate} onChange={e=>setBlockDate(e.target.value)} required /></div>
                    {blockDate && (
                      <div className="form-group">
                          <label>Select Time Slots</label>
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
                    <button className="confirm-btn" style={{background:'#ef4444'}} disabled={selectedSlots.length === 0}>Mark as Taken</button>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};
export default ManagerDashboard;