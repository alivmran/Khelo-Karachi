import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import AuthContext from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  Users, 
  MapPin, 
  Calendar, 
  Clock, 
  Swords, 
  Send, 
  PlusCircle, 
  MessageSquare,
  ChevronRight,
  Info,
  CheckCircle2
} from 'lucide-react';

const FindTeam = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [matchPosts, setMatchPosts] = useState([]);
  
  // Create Post Modal
  const [showModal, setShowModal] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  
  const [sentRequests, setSentRequests] = useState([]);
  
  const [postForm, setPostForm] = useState({
    bookingId: '', 
    adHocTeamName: '', 
    mobile: '', 
    mySquadSize: 5,
    opponentSquadSize: 5
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSentRequests = async () => {
    if (!user) return;
    try {
      const { data } = await API.get('/matches/requests/sent');
      setSentRequests(data.map(r => r.matchPost?._id));
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async () => {
    try {
      const { data } = await API.get(`/matches/posts?page=${page}&limit=6`);
      if (data.posts) {
        setMatchPosts(data.posts);
        setTotalPages(data.pages);
      } else {
        setMatchPosts(data);
      }
      fetchSentRequests();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { fetchData(); }, [page, user]);

  const openCreateModal = async () => {
    try {
      const { data } = await API.get('/bookings/mybookings');
      const now = new Date();
      const approved = data.filter(b => {
        if (b.status !== 'Approved') return false;
        const bDate = new Date(`${b.date}T${b.startTime}`);
        return bDate > now;
      });
      
      if(approved.length === 0) {
          toast.info("You need an upcoming Approved booking to create a post.");
          return;
      }
      
      setMyBookings(approved);
      setShowModal(true);
    } catch (error) {
      toast.error('Could not load bookings');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      await API.post('/matches/posts', postForm);
      toast.success('Post Created!');
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed');
    }
  };

  const sendRequest = async (type, targetId) => {
    try {
      await API.post('/matches/requests', { type, targetId });
      toast.success('Challenge Sent!');
      fetchSentRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed');
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this match post?')) return;
    try {
      await API.delete(`/matches/posts/${id}`);
      toast.success('Match Post Cancelled');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel');
    }
  };

  return (
    <div className="page-container" style={{ padding: '0 20px' }}>
      <div className="header-section" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem 1.5rem', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: 'white' }}>
            Find A Match
          </h1>
          <p style={{ color: '#9ca3af', marginTop: '4px', fontSize: '0.8rem', margin: 0 }}>Challenge teams and find your next competitive match.</p>
        </div>
        <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
          <button onClick={() => navigate('/requests')} style={{background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '6px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontSize:'0.8rem'}}>
             <MessageSquare size={14} /> My Requests
          </button>
          <button onClick={openCreateModal} style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)', fontSize:'0.8rem' }}>
            <PlusCircle size={14} /> Create Match Post
          </button>
        </div>
      </div>

      <div className="courts-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {matchPosts.map(post => (
              <div key={post._id} className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', overflow: 'hidden', transition: 'all 0.3s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                  <div className="card-header" style={{ padding: '1.25rem 1.5rem 0 1.5rem', borderBottom: 'none', display: 'block' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'white' }}>
                          {post.court?.name}
                        </h3>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '0' }}>
                        <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '5px', fontWeight: '800', textTransform: 'uppercase', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                          {post.facility || post.booking?.facility || post.court?.facilities?.[0] || 'CRICKET'}
                        </span>
                      </div>
                  </div>
                  
                  <div className="card-body" style={{ padding: '0.75rem 1.25rem 1.25rem 1.25rem' }}>
                      <div style={{ marginBottom: '1rem', display: 'flex', gap: '8px' }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', padding: '6px 12px', borderRadius: '10px', fontWeight: '800', display:'inline-flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                              <Calendar size={14} /> {post.date}
                          </div>
                          <div style={{ background: 'rgba(59, 130, 246, 0.08)', color: '#60a5fa', padding: '6px 12px', borderRadius: '10px', fontWeight: '800', display:'inline-flex', gap:'6px', alignItems:'center', fontSize:'0.75rem', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                              <Clock size={14} /> {post.startTime}
                          </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0', position: 'relative' }}>
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '16px 10px', borderRadius: '20px 0 0 20px', border: '1px solid rgba(255,255,255,0.05)', borderRight: 'none', textAlign: 'center' }}>
                              <p style={{ fontSize: '0.6rem', color: '#9ca3af', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Host Team</p>
                              <p style={{ fontWeight: '800', color: 'white', margin: '0 0 8px 0', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.adHocTeamName}</p>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '0.7rem', fontWeight: '700' }}>
                                <Users size={12} /> {post.mySquadSize}
                              </div>
                          </div>

                          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 -18px' }}>
                             <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0a0a0a', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(0,0,0,0.5)' }}>
                                <span style={{ color: '#ef4444', fontWeight: '900', fontSize: '0.7rem' }}>VS</span>
                             </div>
                          </div>

                          <div style={{ flex: 1, background: 'rgba(59, 130, 246, 0.04)', padding: '16px 10px', borderRadius: '0 20px 20px 0', border: '1px solid rgba(59, 130, 246, 0.1)', borderLeft: 'none', textAlign: 'center' }}>
                              <p style={{ fontSize: '0.6rem', color: '#60a5fa', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Seeking</p>
                              <p style={{ fontWeight: '800', color: 'white', margin: '0 0 8px 0', fontSize: '0.9rem' }}>Any Team</p>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#60a5fa', fontSize: '0.75rem', fontWeight: '700' }}>
                                <Users size={12} /> {post.opponentSquadSize}
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="card-footer" style={{ padding: '0.5rem 1.5rem 1.5rem 1.5rem', background: 'transparent' }}>
                      {post.user._id === user?._id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ width: '100%', padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.05)', color: '#10b981', fontSize: '0.75rem', fontWeight: '800', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <CheckCircle2 size={16} /> YOU POSTED THIS
                          </div>
                          <button 
                            onClick={() => handleDeletePost(post._id)}
                            style={{ width: '100%', padding: '10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={e => {e.currentTarget.style.background='rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor='rgba(239, 68, 68, 0.3)'}}
                            onMouseOut={e => {e.currentTarget.style.background='rgba(239, 68, 68, 0.05)'; e.currentTarget.style.borderColor='rgba(239, 68, 68, 0.2)'}}
                          >
                            Cancel Post
                          </button>
                        </div>
                      ) : sentRequests.includes(post._id) ? (
                        <div style={{ width: '100%', padding: '12px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontSize: '0.85rem', fontWeight: '800', textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <CheckCircle2 size={18} /> CHALLENGE SENT
                        </div>
                      ) : (
                        <button 
                          className="book-btn" 
                          onClick={() => sendRequest('CHALLENGE', post._id)}
                          style={{ width: '100%', padding: '12px', borderRadius: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'linear-gradient(to right, #3b82f6, #2563eb)', border: 'none', color: 'white', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)', cursor: 'pointer' }}
                        >
                          Challenge Team <Send size={18} />
                        </button>
                      )}
                  </div>
              </div>
          ))}
          {matchPosts.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Users size={48} style={{ color: '#374151', marginBottom: '1rem' }} />
              <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>No match posts available at the moment.</p>
              <button onClick={openCreateModal} style={{ marginTop: '1rem', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', padding: '8px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>Create the first one</button>
            </div>
          )}
      </div>

      {totalPages > 1 && (
        <div style={{display:'flex', justifyContent:'center', gap:'12px', marginTop:'3rem'}}>
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            style={{padding:'10px 20px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)', color:'white', borderRadius:'12px', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: '700', opacity: page === 1 ? 0.5 : 1}}
          >
            Previous
          </button>
          <span style={{padding:'10px', color:'#9ca3af', fontWeight: '600', display: 'flex', alignItems: 'center'}}>Page {page} of {totalPages}</span>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
            style={{padding:'10px 20px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)', color:'white', borderRadius:'12px', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontWeight: '700', opacity: page === totalPages ? 0.5 : 1}}
          >
            Next
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="modal-content" style={{ borderRadius: '28px', padding: '2.5rem', border: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(145deg, #121212 0%, #0a0a0a 100%)', maxWidth: '600px', width: '100%', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <button className="close-modal" onClick={() => setShowModal(false)} style={{ top: '1.5rem', right: '1.5rem', fontSize: '1.5rem', color: '#6b7280', background: 'transparent', border: 'none', cursor: 'pointer' }}>Ã—</button>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
                <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px' }}>
                  <PlusCircle color="#3b82f6" size={24} />
                </div>
                Create Match Post
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>Fill in the details below to host a match and invite opponents.</p>
            </div>

            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: '#e5e7eb', marginBottom: '10px', display: 'block', fontWeight: '700' }}>Select Your Booking</label>
                    <select 
                      required 
                      onChange={e => setPostForm({...postForm, bookingId: e.target.value})} 
                      style={{ 
                        background: '#1a1a1a', 
                        borderRadius: '14px', 
                        padding: '14px', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        width: '100%',
                        color: 'white',
                        fontSize: '0.95rem',
                        outline: 'none',
                        cursor: 'pointer',
                        appearance: 'none'
                      }}
                    >
                        <option value="" style={{ background: '#1a1a1a', color: '#9ca3af' }}>-- Choose an upcoming booking --</option>
                        {myBookings.map(b => (
                            <option key={b._id} value={b._id} style={{ background: '#1a1a1a', color: 'white', padding: '10px' }}>
                                {b.court.name} | {b.facility} | {b.date} ({b.startTime})
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                        <label style={{ fontSize: '0.85rem', color: '#e5e7eb', marginBottom: '10px', display: 'block', fontWeight: '700' }}>Team Name</label>
                        <input 
                          required 
                          onChange={e => setPostForm({...postForm, adHocTeamName: e.target.value})} 
                          placeholder="e.g. United Strikers" 
                          style={{ background: '#1a1a1a', borderRadius: '14px', padding: '14px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', color: 'white', fontSize: '0.95rem', outline: 'none' }} 
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ fontSize: '0.85rem', color: '#e5e7eb', marginBottom: '10px', display: 'block', fontWeight: '700' }}>WhatsApp Number</label>
                        <input 
                          required 
                          onChange={e => setPostForm({...postForm, mobile: e.target.value})} 
                          placeholder="03XX-XXXXXXX" 
                          style={{ background: '#1a1a1a', borderRadius: '14px', padding: '14px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', color: 'white', fontSize: '0.95rem', outline: 'none' }} 
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                        <label style={{ fontSize: '0.85rem', color: '#e5e7eb', marginBottom: '10px', display: 'block', fontWeight: '700' }}>Your Squad Size</label>
                        <div style={{ position: 'relative' }}>
                          <Users size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                          <input 
                            type="number" 
                            min="1" 
                            required 
                            value={postForm.mySquadSize}
                            onChange={e => setPostForm({...postForm, mySquadSize: e.target.value})} 
                            style={{ background: '#1a1a1a', borderRadius: '14px', padding: '14px 14px 14px 44px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', color: 'white', fontSize: '0.95rem', outline: 'none' }}
                          />
                        </div>
                    </div>
                    <div className="form-group">
                        <label style={{ fontSize: '0.85rem', color: '#e5e7eb', marginBottom: '10px', display: 'block', fontWeight: '700' }}>Seeking Opponent Size</label>
                        <div style={{ position: 'relative' }}>
                          <Users size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                          <input 
                            type="number" 
                            min="1" 
                            required 
                            value={postForm.opponentSquadSize}
                            onChange={e => setPostForm({...postForm, opponentSquadSize: e.target.value})} 
                            style={{ background: '#1a1a1a', borderRadius: '14px', padding: '14px 14px 14px 44px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', color: 'white', fontSize: '0.95rem', outline: 'none' }}
                          />
                        </div>
                    </div>
                </div>
                
                <button 
                  type="submit" 
                  className="confirm-btn" 
                  style={{ 
                    marginTop: '1rem', 
                    width: '100%', 
                    borderRadius: '16px', 
                    padding: '16px', 
                    fontWeight: '800', 
                    fontSize: '1rem', 
                    background: 'linear-gradient(to right, #3b82f6, #2563eb)', 
                    border: 'none', 
                    color: 'white',
                    boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Confirm & Post Match
                </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindTeam;
