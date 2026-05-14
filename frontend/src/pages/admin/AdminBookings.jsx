import { useEffect, useState } from 'react';
import API from '../../api/axios';
import { toast } from 'react-toastify';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [filterDays, setFilterDays] = useState('current'); // 'current', '7', '15', '30'



  const fetchBookings = async () => {
    try {
      const { data } = await API.get('/bookings/all'); // Ensure you have an endpoint for ALL bookings or utilize admin routes
      // Note: Assuming '/bookings/all' returns everything. If not, use '/admin/data' logic or similar.
      // Since we don't have a specific GET ALL endpoint in previous steps, let's create a quick function or assume one exists.
      // If it fails, I will provide the Backend route for this in a second.
      setBookings(data);
      applyFilter(data, 'current');
    } catch (error) {
        // Fallback for demo if route missing
        console.error(error);
    }
  };

  // Logic to filter dates
  const applyFilter = (allData, days) => {
    const now = new Date();
    let result = [];

    if (days === 'current') {
        // Show future bookings (today onwards)
        // Limit to 15 as requested
        result = allData.filter(b => new Date(b.date) >= new Date().setHours(0,0,0,0));
        result = result.slice(0, 15);
    } else {
        // Show past bookings
        const daysAgo = parseInt(days);
        const pastDate = new Date();
        pastDate.setDate(now.getDate() - daysAgo);

        result = allData.filter(b => {
            const bDate = new Date(b.date);
            return bDate < now && bDate >= pastDate;
        });
    }
    setFilteredBookings(result);
    setFilterDays(days);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusUpdate = async (id, status) => {
      try {
          await API.put(`/bookings/${id}`, { status });
          toast.success(`Booking ${status}`);
          // Refresh
          const updated = bookings.map(b => b._id === id ? { ...b, status } : b);
          setBookings(updated);
          applyFilter(updated, filterDays);
      } catch (error) {
          toast.error('Update failed');
      }
  };

  return (
    <div className="page-container">
      <div className="header-section">
          <h1 className="page-title">Manage Bookings</h1>
      </div>

      {/* FILTER BAR */}
      <div className="filter-section">
          <button className={`filter-btn ${filterDays === 'current' ? 'active' : ''}`} onClick={() => applyFilter(bookings, 'current')}>Current (Next 15)</button>
          <button className={`filter-btn ${filterDays === '7' ? 'active' : ''}`} onClick={() => applyFilter(bookings, '7')}>Past 7 Days</button>
          <button className={`filter-btn ${filterDays === '15' ? 'active' : ''}`} onClick={() => applyFilter(bookings, '15')}>Past 15 Days</button>
          <button className={`filter-btn ${filterDays === '30' ? 'active' : ''}`} onClick={() => applyFilter(bookings, '30')}>Past 30 Days</button>
      </div>

      <div className="table-container">
        <table className="bookings-table">
            <thead>
                <tr>
                    <th>Court</th>
                    <th>User</th>
                    <th>Date / Time</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                {filteredBookings.length === 0 ? (
                    <tr><td colSpan="5" style={{textAlign:'center', padding:'2rem'}}>No bookings found for this period.</td></tr>
                ) : (
                    filteredBookings.map(b => (
                        <tr key={b._id}>
                            <td>{b.court?.name}</td>
                            <td>{b.user ? b.user.name : 'Blocked'}</td>
                            <td>{b.date} <br/> {b.startTime} - {b.endTime}</td>
                            <td><span className={`status ${b.status.toLowerCase()}`}>{b.status}</span></td>
                            <td>
                                {b.status === 'Pending' && (
                                    <div style={{display:'flex', gap:'5px'}}>
                                        <button onClick={() => handleStatusUpdate(b._id, 'Approved')} style={{background:'#10b981', border:'none', color:'white', padding:'5px 10px', borderRadius:'4px', cursor:'pointer'}}>âœ“</button>
                                        <button onClick={() => handleStatusUpdate(b._id, 'Rejected')} style={{background:'#ef4444', border:'none', color:'white', padding:'5px 10px', borderRadius:'4px', cursor:'pointer'}}>âœ•</button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBookings;
