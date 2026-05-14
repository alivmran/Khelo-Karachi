import { useEffect, useState } from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import { 
  Swords, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  MapPin, 
  Calendar,
  AlertTriangle,
  ArrowRight,
  Shield,
  ArrowUpRight
} from 'lucide-react';

const Requests = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const fetchInbox = async () => {
    try {
      const { data } = await API.get('/matches/requests/inbox');
      const filtered = data.filter((req) => req.matchPost?.date >= todayStr);
      setRequests(filtered);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSent = async () => {
    try {
      const { data } = await API.get('/matches/requests/sent');
      const filtered = data.filter((req) => req.matchPost?.date >= todayStr);
      setSentRequests(filtered);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (activeTab === 'inbox') fetchInbox();
    else fetchSent();
  }, [activeTab]);

  const handleResponse = async (id, status) => {
    try {
      await API.put(`/matches/requests/${id}`, { status });
      toast.success(`Request ${status}`);
      fetchInbox();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleCancel = async (id) => {
    try {
      await API.put(`/matches/requests/${id}/cancel`);
      toast.success('Challenge cancelled');
      if (activeTab === 'inbox') fetchInbox();
      else fetchSent();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cancel failed');
    }
  };

  return (
    <div className="page-container" style={{ padding: '0 20px' }}>
      <div className="header-section" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem 1.5rem', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: 'white' }}>
            My Requests
          </h1>
          <p style={{ color: '#9ca3af', marginTop: '4px', fontSize: '0.8rem', margin: 0 }}>Manage your received and sent match challenges.</p>
        </div>
        
        <div className="match-tabs" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button 
            className={`tab-btn ${activeTab === 'inbox' ? 'active' : ''}`} 
            onClick={() => setActiveTab('inbox')}
            style={{ 
              padding: '8px 16px', 
              borderRadius: '10px', 
              border: 'none', 
              background: activeTab === 'inbox' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'inbox' ? 'white' : '#9ca3af',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ArrowUpRight size={16} /> Inbox
          </button>
          <button 
            className={`tab-btn ${activeTab === 'sent' ? 'active' : ''}`} 
            onClick={() => setActiveTab('sent')}
            style={{ 
              padding: '8px 16px', 
              borderRadius: '10px', 
              border: 'none', 
              background: activeTab === 'sent' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'sent' ? 'white' : '#9ca3af',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ArrowRight size={16} /> Sent
          </button>
        </div>
      </div>
      
      {activeTab === 'inbox' ? (
          requests.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
               <MessageSquare size={48} style={{ color: '#374151', marginBottom: '1rem' }} />
               <p style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '600' }}>No pending requests found.</p>
            </div>
          ) : (
              <div className="courts-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
                  {requests.map(req => (
                      <div key={req._id} className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', overflow: 'hidden', transition: 'all 0.3s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                          <div className="card-header" style={{ padding: '1.25rem 1.5rem', borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'white', marginBottom: '4px' }}>
                                  {req.matchPost?.court?.name}
                                </h3>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Challenge Received</span>
                                  <span style={{ height: '3px', width: '3px', borderRadius: '50%', background: '#374151' }}></span>
                                  <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase' }}>{req.matchPost?.facility || req.matchPost?.booking?.facility || req.matchPost?.court?.facilities?.[0] || 'CRICKET'}</span>
                                </div>
                              </div>
                              <span style={{
                                  background: req.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.1)' : req.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                                  color: req.status === 'ACCEPTED' ? '#10b981' : req.status === 'REJECTED' ? '#f87171' : '#facc15',
                                  padding: '4px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.65rem',
                                  fontWeight: '900',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  border: `1px solid ${req.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.2)' : req.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(250, 204, 21, 0.2)'}`
                              }}>
                                  {req.status || 'PENDING'}
                              </span>
                          </div>
                          
                          <div className="card-body" style={{ padding: '0 1.5rem 1.25rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                                  <Users size={20} />
                                </div>
                                <div>
                                  <p style={{ margin: 0, color: 'white', fontWeight: '800', fontSize: '1rem' }}>{req.sender.name}</p>
                                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>wants to play you</p>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '10px', marginBottom: '0' }}>
                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                  <p style={{ fontSize: '0.6rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '800', marginBottom: '2px' }}>Matches</p>
                                  <p style={{ color: 'white', fontWeight: '800', margin: 0, fontSize: '1.1rem' }}>{req.sender.matchesPlayed || 0}</p>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                  <p style={{ fontSize: '0.6rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '800', marginBottom: '2px' }}>No-Shows</p>
                                  <p style={{ color: (req.sender.noShows || 0) > 0 ? '#f87171' : '#10b981', fontWeight: '800', margin: 0, fontSize: '1.1rem' }}>{req.sender.noShows || 0}</p>
                                </div>
                              </div>
                          </div>

                          <div className="card-footer" style={{ padding: '1.25rem 1.5rem 1.5rem 1.5rem', display: 'flex', gap: '10px' }}>
                              {(!req.status || req.status === 'PENDING') && (
                                <>
                                  <button onClick={() => handleResponse(req._id, 'ACCEPTED')} style={{ flex: 1, background: 'linear-gradient(to right, #10b981, #059669)', color: 'white', border: 'none', padding: '12px', borderRadius: '14px', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)' }}>
                                    <CheckCircle2 size={18} /> Accept
                                  </button>
                                  <button onClick={() => handleResponse(req._id, 'REJECTED')} style={{ flex: 1, background: 'rgba(239, 68, 68, 0.08)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '14px', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <XCircle size={18} /> Reject
                                  </button>
                                </>
                              )}
                              {req.status === 'ACCEPTED' && (
                                <button onClick={() => handleCancel(req._id)} style={{ width: '100%', background: 'rgba(251, 191, 36, 0.08)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '12px', borderRadius: '14px', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                  <AlertTriangle size={18} /> Cancel Match
                                </button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          )
      ) : (
          sentRequests.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
               <Swords size={48} style={{ color: '#374151', marginBottom: '1rem' }} />
               <p style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '600' }}>You haven't sent any challenges yet.</p>
            </div>
          ) : (
              <div className="courts-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
                  {sentRequests.map(req => (
                      <div key={req._id} className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', overflow: 'hidden', transition: 'all 0.3s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                          <div className="card-header" style={{ padding: '1.25rem 1.5rem', borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'white', marginBottom: '4px' }}>
                                  {req.matchPost?.court?.name}
                                </h3>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sent Challenge</span>
                                  <span style={{ height: '3px', width: '3px', borderRadius: '50%', background: '#374151' }}></span>
                                  <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase' }}>{req.matchPost?.facility || req.matchPost?.booking?.facility || req.matchPost?.court?.facilities?.[0] || 'CRICKET'}</span>
                                </div>
                              </div>
                              <span style={{
                                  background: req.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.1)' : req.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                                  color: req.status === 'ACCEPTED' ? '#10b981' : req.status === 'REJECTED' ? '#f87171' : '#facc15',
                                  padding: '4px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.65rem',
                                  fontWeight: '900',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  border: `1px solid ${req.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.2)' : req.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(250, 204, 21, 0.2)'}`
                              }}>
                                  {req.status}
                              </span>
                          </div>
                          
                          <div className="card-body" style={{ padding: '0 1.5rem 1.25rem 1.5rem' }}>
                              <p style={{ margin: '0 0 0.75rem 0', color: '#9ca3af', fontSize: '0.85rem' }}>
                                Host: <strong style={{ color: 'white' }}>{req.matchPost?.adHocTeamName}</strong>
                              </p>
                              
                              <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '14px', borderRadius: '18px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#9ca3af' }}>
                                    <Calendar size={14} /> {req.matchPost?.date}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#9ca3af' }}>
                                    <Clock size={14} /> {req.matchPost?.startTime}
                                  </div>
                                </div>
                              </div>

                              {req.status === 'ACCEPTED' && (
                                  <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.2)', marginTop: '1rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: '800', fontSize: '0.85rem', marginBottom: '4px' }}>
                                        <CheckCircle2 size={16} /> Match Confirmed!
                                      </div>
                                      <div style={{ fontSize: '0.8rem', color: '#e5e7eb' }}>
                                        Host Mobile: <strong style={{ color: 'white' }}>{req.matchPost?.mobile}</strong>
                                      </div>
                                  </div>
                              )}
                          </div>
                          
                          <div className="card-footer" style={{ padding: '1.25rem 1.5rem 1.5rem 1.5rem' }}>
                              {['PENDING', 'ACCEPTED'].includes(req.status) && (
                                <button onClick={() => handleCancel(req._id)} style={{ width: '100%', background: 'rgba(239, 68, 68, 0.05)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '14px', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseOver={e => {e.currentTarget.style.background='rgba(239, 68, 68, 0.12)'; e.currentTarget.style.borderColor='rgba(239, 68, 68, 0.4)'}} onMouseOut={e => {e.currentTarget.style.background='rgba(239, 68, 68, 0.05)'; e.currentTarget.style.borderColor='rgba(239, 68, 68, 0.2)'}}>
                                  <XCircle size={18} /> Cancel Challenge
                                </button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          )
      )}
    </div>
  );
};

export default Requests;
