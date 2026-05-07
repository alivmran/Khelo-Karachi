import { useEffect, useState } from 'react';
import API from '../api/axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('courts');
  const [data, setData] = useState({ courts: [], managers: [], stats: {} });
  const [form, setForm] = useState({
    courtName: '', location: '', facilities: ['Futsal'], googleMapLink: '',
    amenities: [],
    paymentBank: '', paymentAccountTitle: '', paymentAccountNumber: '', advanceRequired: '',
    operationalStartTime: '00:00', operationalEndTime: '24:00',
    pricePerHour: '', priceWeekend: '', managerName: '', managerEmail: ''
  });
  const [images, setImages] = useState([]);
  const hourOptions = Array.from({ length: 25 }, (_, h) => `${h.toString().padStart(2, '0')}:00`);

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
        pricePerHour: '', priceWeekend: '', managerName: '', managerEmail: ''
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
    if(window.confirm('Delete Court & Manager?')) {
        try { await API.delete(`/admin/court/${id}`); toast.success('Deleted'); fetchData(); } 
        catch (error) { toast.error('Failed'); }
    }
  };

  const handleAssignManager = async (courtId) => {
    const name = window.prompt("Enter Manager Name:");
    if (!name) return;
    const email = window.prompt("Enter Manager Email:");
    if (!email) return;
    const password = window.prompt("Enter Initial Password for Manager:");
    if (!password) return;
    try {
        const res = await API.post('/admin/assign-manager', { courtId, managerName: name, managerEmail: email, password });
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
    <div className="page-container">
      <h1 className="page-title">Super Admin Panel</h1>
      
      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card" style={{borderColor: '#3b82f6'}}><h3>Total Courts</h3><p className="stat-value">{data.courts.length}</p></div>
        <div className="stat-card" style={{borderColor: '#10b981'}}><h3>Total Revenue</h3><p className="stat-value">PKR {data.stats?.totalRevenue?.toLocaleString() || 0}</p></div>
        <div className="stat-card"><h3>Total Bookings</h3><p className="stat-value">{data.stats?.totalBookings || 0}</p></div>
        <div className="stat-card" style={{borderColor:'#ef4444'}}><h3>Disputes</h3><p className="stat-value" style={{color:'#f87171'}}>{data.stats?.pendingDisputes || 0}</p></div>
      </div>

      <div className="match-tabs">
        <button className={`tab-btn ${activeTab === 'courts' ? 'active' : ''}`} onClick={() => setActiveTab('courts')}>Courts</button>
        <button className={`tab-btn ${activeTab === 'disputes' ? 'active' : ''}`} onClick={() => setActiveTab('disputes')}>
          Disputes <span className="badge" style={{marginLeft:'6px', background:'rgba(239,68,68,0.2)', color:'#f87171'}}>{data.disputes?.length || 0}</span>
        </button>
      </div>

      {activeTab === 'courts' && <div className="dashboard-layout">
        {/* CREATE FORM */}
        <div className="form-container" style={{margin:0, maxWidth:'100%', textAlign:'left'}}>
            <h2>Add New Facility</h2>
            <form onSubmit={handleCreate}>
                <div className="form-row">
                    <div className="form-group"><label>Court Name</label><input value={form.courtName} onChange={e=>setForm({...form, courtName:e.target.value})} required /></div>
                    <div className="form-group">
                      <label>Facilities</label>
                      <div style={{display:'flex', flexWrap:'wrap', gap:'8px', marginTop:'8px'}}>
                        {['Futsal', 'Padel', 'Cricket'].map((sport) => (
                          <button
                            key={sport}
                            type="button"
                            onClick={() => toggleFacility(sport)}
                            style={{
                              border:'1px solid',
                              borderColor: form.facilities.includes(sport) ? '#3b82f6' : '#334155',
                              background: form.facilities.includes(sport) ? 'rgba(59,130,246,0.2)' : '#111827',
                              color: form.facilities.includes(sport) ? '#bfdbfe' : '#cbd5e1',
                              borderRadius:'8px',
                              padding:'10px',
                              cursor:'pointer',
                              fontWeight:'700'
                            }}
                          >
                            {sport}
                          </button>
                        ))}
                      </div>
                    </div>
                </div>
                <div className="form-group"><label>Location</label><input value={form.location} onChange={e=>setForm({...form, location:e.target.value})} required /></div>
                <div className="form-group"><label>Google Maps Link</label><input value={form.googleMapLink} onChange={e=>setForm({...form, googleMapLink:e.target.value})} placeholder="https://maps.google.com/..." /></div>
                <div className="form-group">
                  <label>Amenities (select up to 5)</label>
                  <div style={{display:'flex', flexWrap:'wrap', gap:'8px', marginTop:'8px'}}>
                    {['Parking', 'Showers', 'Cafe', 'Floodlights', 'Changing Room'].map((amenity) => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        style={{
                          border:'1px solid',
                          borderColor: form.amenities.includes(amenity) ? '#10b981' : '#334155',
                          background: form.amenities.includes(amenity) ? 'rgba(16,185,129,0.2)' : '#111827',
                          color: form.amenities.includes(amenity) ? '#a7f3d0' : '#cbd5e1',
                          borderRadius:'8px',
                          padding:'10px',
                          cursor:'pointer',
                          fontWeight:'700'
                        }}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label>Price (Weekday)</label><input type="number" value={form.pricePerHour} onChange={e=>setForm({...form, pricePerHour:e.target.value})} required /></div>
                    <div className="form-group"><label>Price (Weekend)</label><input type="number" value={form.priceWeekend} onChange={e=>setForm({...form, priceWeekend:e.target.value})} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                      <label>Operational Start</label>
                      <select value={form.operationalStartTime} onChange={e=>setForm({...form, operationalStartTime:e.target.value})}>
                        {hourOptions.slice(0, 24).map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Operational End</label>
                      <select value={form.operationalEndTime} onChange={e=>setForm({...form, operationalEndTime:e.target.value})}>
                        {hourOptions.slice(1).map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label>Bank / Wallet Name</label><input value={form.paymentBank} onChange={e=>setForm({...form, paymentBank:e.target.value})} required /></div>
                    <div className="form-group"><label>Account Title</label><input value={form.paymentAccountTitle} onChange={e=>setForm({...form, paymentAccountTitle:e.target.value})} required /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label>Account Number</label><input value={form.paymentAccountNumber} onChange={e=>setForm({...form, paymentAccountNumber:e.target.value})} required /></div>
                    <div className="form-group"><label>Advance Required (PKR)</label><input type="number" min="0" value={form.advanceRequired} onChange={e=>setForm({...form, advanceRequired:e.target.value})} placeholder="Optional" /></div>
                </div>
                <hr style={{borderColor:'var(--border-color)', margin:'1rem 0'}}/>
                <h3>Assign Manager</h3>
                <div className="form-row">
                    <div className="form-group"><label>Name</label><input value={form.managerName} onChange={e=>setForm({...form, managerName:e.target.value})} required /></div>
                    <div className="form-group"><label>Email</label><input type="email" value={form.managerEmail} onChange={e=>setForm({...form, managerEmail:e.target.value})} required /></div>
                </div>
                <div className="form-group">
                    <label>Court Images (Max 5)</label>
                    <input type="file" multiple accept="image/*" onChange={(e) => setImages(e.target.files)} style={{background: 'var(--bg-input)', padding: '10px'}} />
                </div>
                <button type="submit" className="confirm-btn">Create System</button>
            </form>
        </div>

        {/* COURT LIST WITH MANAGE BUTTON */}
        <div className="activity-section">
            <h2>Active Facilities</h2>
            <div className="courts-list" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'1.5rem'}}>
                {data.courts.length === 0 && <p style={{color:'#888'}}>No facilities active.</p>}
                {data.courts.map(court => (
                    <div key={court._id} style={{background:'var(--bg-input)', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border-color)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                            <div>
                                <h3 style={{margin:0, color:'var(--primary-color)'}}>{court.name}</h3>
                                <p style={{fontSize:'0.85rem', color:'#aaa', margin:'5px 0'}}>{court.location} • {(court.facilities || []).join(', ')}</p>
                                <div style={{fontSize:'0.8rem', background:'rgba(255,255,255,0.05)', padding:'5px', borderRadius:'4px', marginTop:'5px'}}>
                                    Manager: <span style={{color:'white'}}>{court.manager?.email || 'Unassigned'}</span>
                                </div>
                            </div>
                            <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                                {/* MANAGE BUTTON */}
                                <button 
                                    onClick={() => navigate(`/courts/${court._id}`)} 
                                    style={{background:'#3b82f6', border:'none', color:'white', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', fontWeight:'600'}}
                                >
                                    Manage
                                </button>
                                {(!court.manager || !court.manager.email) && (
                                    <button 
                                        onClick={() => handleAssignManager(court._id)} 
                                        style={{background:'#10b981', border:'none', color:'white', padding:'6px 12px', borderRadius:'4px', cursor:'pointer'}}
                                    >
                                        Assign
                                    </button>
                                )}
                                {(court.manager && court.manager.email) && (
                                    <button 
                                        onClick={() => handleResetPassword(court.manager._id)} 
                                        style={{background:'transparent', border:'1px solid #facc15', color:'#facc15', padding:'6px 12px', borderRadius:'4px', cursor:'pointer'}}
                                    >
                                        Reset Pass
                                    </button>
                                )}
                                {/* DELETE BUTTON */}
                                <button 
                                    onClick={() => handleDelete(court._id)} 
                                    style={{background:'transparent', border:'1px solid #ef4444', color:'#ef4444', padding:'6px 12px', borderRadius:'4px', cursor:'pointer'}}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>}
      {activeTab === 'disputes' && <div className="activity-section" style={{marginTop:'1rem'}}>
        <h2 style={{display:'flex', alignItems:'center', gap:'10px'}}>
          Disputes
          <span className="badge" style={{background:'rgba(239,68,68,0.2)', color:'#f87171'}}>{data.disputes?.length || 0}</span>
        </h2>
        {!data.disputes || data.disputes.length === 0 ? (
          <p style={{color:'#9ca3af'}}>No disputes pending.</p>
        ) : (
          <div style={{display:'grid', gap:'10px', marginTop:'10px'}}>
            {data.disputes.map((d) => (
              <div key={d._id} style={{border:'1px solid rgba(239,68,68,0.4)', borderRadius:'10px', padding:'12px', background:'rgba(239,68,68,0.08)'}}>
                <div style={{display:'flex', justifyContent:'space-between', gap:'10px', flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontWeight:'700', color:'#fff'}}>{d.court?.name || 'Court'} - {d.user?.name || 'User'}</div>
                    <div style={{fontSize:'0.9rem', color:'#ddd'}}>Reason: {d.disputeReason || 'No reason provided'}</div>
                    <div style={{fontSize:'0.82rem', color:'#fca5a5'}}>Refund TID: {d.refundTransactionId || '-'}</div>
                      <div style={{fontSize:'0.86rem', color:'#fde68a', marginTop:'6px'}}>User Refund Details: {d.refundBankName || '-'} | {d.refundAccountTitle || '-'} | {d.refundAccountNumber || '-'} | WhatsApp: {d.refundContactNumber || '-'}</div>
                      <div style={{fontSize:'0.86rem', color:'#bfdbfe', marginTop:'4px'}}>Manager: {d.court?.manager?.name || '-'} ({d.court?.manager?.email || '-'})</div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await API.put(`/admin/disputes/${d._id}/resolve`);
                        toast.success('Dispute marked resolved');
                        fetchData();
                      } catch (error) {
                        toast.error(error.response?.data?.message || 'Failed to resolve dispute');
                      }
                    }}
                    style={{background:'#ef4444', border:'none', color:'white', padding:'8px 12px', borderRadius:'6px', cursor:'pointer', fontWeight:'700'}}
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}
    </div>
  );
};
export default AdminDashboard;