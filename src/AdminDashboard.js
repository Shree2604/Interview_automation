import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  UserCheck,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  TrendingUp,
  BarChart3,
  ArrowLeft,
  LogOut,
  Plus,
  X,
  Check
} from 'lucide-react';
import './AdminDashboard.css';

function AdminDashboard({ onLogout }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [currentFeedback, setCurrentFeedback] = useState('');
  const [editingRole, setEditingRole] = useState(null);
  const [currentPositionType, setCurrentPositionType] = useState('');
  const [currentSchoolType, setCurrentSchoolType] = useState('');
  const [editingStatus, setEditingStatus] = useState(null);
  const [currentStatus, setCurrentStatus] = useState('');
  const [editingHrReview, setEditingHrReview] = useState(null);
  const [currentHrReview, setCurrentHrReview] = useState('');
  const [editingHrAnswer, setEditingHrAnswer] = useState(null);
  const [currentHrAnswer, setCurrentHrAnswer] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    attempted: 0,
    hrReview: 0,
    accepted: 0,
    rejected: 0,
    notAttempted: 0
  });

  // Fetch registrations from API
  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response =  await api.get('admin/getCandidatesHistory',{
        status: 'all'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }
      const result = await response;
      
      // Handle the new API format that matches MongoDB structure
      if ((result.status_code == 200) || (result.status_code == 201)) {
        setRegistrations(result.data);
        
        // Calculate stats from the data
        const total = result.data.length;
        const accepted = result.data.filter(r => r.status === 'accepted').length;
        const rejected = result.data.filter(r => r.status === 'rejected').length;
        const attempted = accepted + rejected;
        const hrReview = result.data.filter(r => (r.status === 'accepted' || r.status === 'rejected') && (r.hrReview === 'pending' || !r.hrReview)).length;
        const notAttempted = result.data.filter(r => r.status === 'not attempted').length;
        
        const stats = {
          total: total,
          attempted: attempted,
          hrReview: hrReview,
          accepted: accepted,
          rejected: rejected,
          notAttempted: notAttempted
        };
        setStats(stats);
      } else {
        setRegistrations([]);
        setStats({ total: 0, attempted: 0, hrReview: 0, accepted: 0, rejected: 0, notAttempted: 0 });
      }
    } catch (err) {
      setError(err.message);
      setRegistrations([]);
      setStats({ total: 0, attempted: 0, hrReview: 0, accepted: 0, rejected: 0, notAttempted: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (data) => {
    const accepted = data.filter(r => r.status === 'accepted').length;
    const rejected = data.filter(r => r.status === 'rejected').length;
    const attempted = accepted + rejected;
    const hrReview = data.filter(r => (r.status === 'accepted' || r.status === 'rejected') && (r.hrReview === 'pending' || !r.hrReview)).length;
    const notAttempted = data.filter(r => r.status === 'not attempted').length;
    
    const next = {
      total: data.length,
      attempted: attempted,
      hrReview: hrReview,
      accepted: accepted,
      rejected: rejected,
      notAttempted: notAttempted
    };
    setStats(next);
  };

  // Update registration status
  const updateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`http://localhost:8000/api/interview-registrations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update local state
      setRegistrations(prev => 
        prev.map(reg => 
          reg.SessionId === id ? { ...reg, Status: newStatus } : reg
        )
      );
      
      // Update selectedRegistration if it's the same one being edited
      if (selectedRegistration && (selectedRegistration._id === id || selectedRegistration.id === id)) {
        setSelectedRegistration(prev => ({
          ...prev,
          status: newStatus
        }));
      }
      
      // Refresh data to get updated stats
      fetchRegistrations();

    } catch (err) {
      setError(err.message);
    }
  };

  // Filter registrations
  const filteredRegistrations = registrations.filter(registration => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (registration.name || '').toLowerCase().includes(searchLower) ||
      (registration.email || '').toLowerCase().includes(searchLower) ||
      (registration.registrationId || '').toLowerCase().includes(searchLower);
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'in_progress'
        ? (registration.status === 'in_progress' || registration.status === 'processing')
        : registration.status === statusFilter);
    
    return matchesSearch && matchesStatus;
  });

  // Get status badge component
  const getStatusBadge = (status) => {
    const normalized = (status || '').toString().toLowerCase();
    const statusConfig = {
      pending: { color: 'orange', icon: Clock, text: 'HR Review Pending' },
      processing: { color: 'blue', icon: RefreshCw, text: 'In Progress' },
      in_progress: { color: 'blue', icon: RefreshCw, text: 'In Progress' },
      completed: { color: 'green', icon: CheckCircle, text: 'Completed' },
      rejected: { color: 'red', icon: AlertCircle, text: 'Rejected' },
      // Explicit mapping for Not Attempted
      'not attempted': { color: 'orange', icon: Clock, text: 'Not Attempted' },
      not_attempted: { color: 'orange', icon: Clock, text: 'Not Attempted' },
    };

    const config = statusConfig[normalized] || { color: 'blue', icon: RefreshCw, text: (status || 'Unknown').toString().replace(/_/g, ' ') };
    const Icon = config.icon;

    return (
      <span className={`status-badge ${config.color}`}>
        <Icon size={14} />
        {config.text}
      </span>
    );
  };

  // Export data to CSV
  const exportToCSV = () => {
  const headers = ['Name', 'Email', 'Registration ID', 'Status', 'Position Type', 'School Type', 'Submitted At', 'Summary'];
    const csvData = filteredRegistrations.map(reg => [
      reg.name,
      reg.email,
      reg.registrationId,
      reg.status,
      reg.positionType || '',
      reg.schoolType || '',
      new Date(reg.submittedAt).toLocaleDateString(),
      reg.resumeData?.summary || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  if (loading) {
    return (
      <div className="admin-loading">
        <RefreshCw className="loading-icon animate-spin" />
        <p>Loading registrations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <AlertCircle className="error-icon" />
        <p>Error: {error}</p>
        <button onClick={fetchRegistrations} className="retry-button">
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  // Function to save role details (position type and school type)
  const saveRoleDetails = async (registrationId) => {
    if (!registrationId) return;
    
    try {
      const registration = registrations.find(r => 
        r._id === registrationId || 
        r.id === registrationId ||
        r._id?.toString() === registrationId.toString() ||
        r.id?.toString() === registrationId.toString()
      );
      
      if (!registration) {
        throw new Error('Registration not found');
      }
      
      const backendId = registration.registrationId;
      
      if (!backendId) {
        await fetchRegistrations();
        throw new Error('Invalid registration ID - data refreshed, please try again');
      }
      
      const response = await fetch(`http://localhost:8000/api/interview-registrations/${backendId}/role-details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          positionType: currentPositionType,
          schoolType: currentSchoolType
        })
      });

      const result = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(result.detail || result.message || `HTTP error! status: ${response.status}`);
      }
      
      if (result.success) {
        // Update the local state with the new values
        setRegistrations(prev => prev.map(reg => 
          (reg._id === registrationId || reg.id === registrationId)
            ? { 
                ...reg, 
                positionType: currentPositionType,
                schoolType: currentSchoolType
              }
            : reg
        ));
        
        // Update selectedRegistration if it's the same one being edited
        if (selectedRegistration && (selectedRegistration._id === registrationId || selectedRegistration.id === registrationId)) {
          setSelectedRegistration(prev => ({
            ...prev,
            positionType: currentPositionType,
            schoolType: currentSchoolType
          }));
        }
        
        setEditingRole(null);
        setCurrentPositionType('');
        setCurrentSchoolType('');
      } else {
        throw new Error(result.message || 'Failed to save role details');
      }
    } catch (error) {
      console.error('Error saving role details:', error);
      alert(`Error: ${error.message || 'Failed to save role details. Please try again.'}`);
    }
  };

  // Function to update HR Review status
  const updateHrReview = async (registrationId, hrReviewStatus) => {
    if (!registrationId) return;
    
    try {
      const registration = registrations.find(r => 
        r._id === registrationId || 
        r.id === registrationId ||
        r._id?.toString() === registrationId.toString() ||
        r.id?.toString() === registrationId.toString()
      );
      
      if (!registration) {
        throw new Error('Registration not found');
      }
      
      const backendId = registration.registrationId;
      
      if (!backendId) {
        await fetchRegistrations();
        throw new Error('Invalid registration ID - data refreshed, please try again');
      }
      
      const response = await fetch(`http://localhost:8000/api/interview-registrations/${backendId}/hr-review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          hrReview: hrReviewStatus
        })
      });

      const result = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(result.detail || result.message || `HTTP error! status: ${response.status}`);
      }
      
      if (result.success) {
        // Update the local state with the new HR review status
        setRegistrations(prev => {
          const updated = prev.map(reg => 
            (reg._id === registrationId || reg.id === registrationId)
              ? { 
                  ...reg, 
                  hrReview: hrReviewStatus
                }
              : reg
          );
          calculateStats(updated);
          return updated;
        });
        
        // Update selectedRegistration if it's the same one being edited
        if (selectedRegistration && (selectedRegistration._id === registrationId || selectedRegistration.id === registrationId)) {
          setSelectedRegistration(prev => ({
            ...prev,
            hrReview: hrReviewStatus
          }));
        }
      } else {
        throw new Error(result.message || 'Failed to save HR review status');
      }
    } catch (error) {
      console.error('Error saving HR review status:', error);
      alert(`Error: ${error.message || 'Failed to save HR review status. Please try again.'}`);
    }
  };

  // Function to save status
  const saveStatus = async (registrationId) => {
    if (!registrationId) return;
    
    try {
      const registration = registrations.find(r => 
        r._id === registrationId || 
        r.id === registrationId ||
        r._id?.toString() === registrationId.toString() ||
        r.id?.toString() === registrationId.toString()
      );
      
      if (!registration) {
        throw new Error('Registration not found');
      }
      
      const backendId = registration.registrationId;
      
      if (!backendId) {
        await fetchRegistrations();
        throw new Error('Invalid registration ID - data refreshed, please try again');
      }
      
      const response = await fetch(`http://localhost:8000/api/interview-registrations/${backendId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: currentStatus
        })
      });

      const result = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error('Status update failed:', result);
        console.error('Response status:', response.status);
        throw new Error(result.detail || result.message || `HTTP error! status: ${response.status}`);
      }
      
      if (result.success) {
        // Update the local state with the new status
        setRegistrations(prev => prev.map(reg => 
          (reg._id === registrationId || reg.id === registrationId)
            ? { 
                ...reg, 
                status: currentStatus
              }
            : reg
        ));
        
        // Update selectedRegistration if it's the same one being edited
        if (selectedRegistration && (selectedRegistration._id === registrationId || selectedRegistration.id === registrationId)) {
          setSelectedRegistration(prev => ({
            ...prev,
            status: currentStatus
          }));
        }
        
        // Recalculate stats
        const updatedRegistrations = registrations.map(reg => 
          (reg._id === registrationId || reg.id === registrationId)
            ? { ...reg, status: currentStatus }
            : reg
        );
        const newStats = calculateStats(updatedRegistrations);
        setStats(newStats);
        
        setEditingStatus(null);
        setCurrentStatus('');
      } else {
        throw new Error(result.message || 'Failed to save status');
      }
    } catch (error) {
      console.error('Error saving status:', error);
      console.error('Full error object:', error);
      alert(`Error: ${error.message || 'Failed to save status. Please try again.'}`);
    }
  };

  // Function to save feedback
  const saveFeedback = async (registrationId) => {
    if (!registrationId) return;
    
    try {
      // Find the registration to get the correct ID
      const registration = registrations.find(r => 
        r._id === registrationId || 
        r.id === registrationId ||
        r._id?.toString() === registrationId.toString() ||
        r.id?.toString() === registrationId.toString()
      );
      
      if (!registration) {
        console.error('Registration not found. Available registrations:', registrations.map(r => ({ _id: r._id, id: r.id, name: r.name })));
        throw new Error('Registration not found');
      }
      
      // Debug: Log the registration data
      console.log('Found registration:', registration);
      console.log('Registration ID from _id:', registration._id);
      console.log('Registration ID from id:', registration.id);
      console.log('Registration registrationId:', registration.registrationId);
      console.log('Registration name:', registration.name);
      
      // Use the registrationId field which should be unique and consistent
      const backendId = registration.registrationId;
      
      if (!backendId) {
        console.error('No registrationId found, refreshing data...');
        await fetchRegistrations();
        throw new Error('Invalid registration ID - data refreshed, please try again');
      }
      
      console.log('Using registrationId:', backendId);
      
      const response = await fetch(`http://localhost:8000/api/interview-registrations/${backendId}/feedback`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedback: currentFeedback })
      });

      const result = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(result.detail || result.message || `HTTP error! status: ${response.status}`);
      }
      
      if (result.success) {
        // Update the local state with the returned data
        setRegistrations(prev => prev.map(reg => 
          (reg._id === registrationId || reg.id === registrationId)
            ? { 
                ...reg, 
                feedback: currentFeedback,
                ...(result.data || {})
              }
            : reg
        ));
        
        // Update selectedRegistration if it's the same one being edited
        if (selectedRegistration && (selectedRegistration._id === registrationId || selectedRegistration.id === registrationId)) {
          setSelectedRegistration(prev => ({
            ...prev,
            feedback: currentFeedback
          }));
        }
        
        setEditingFeedback(null);
        setCurrentFeedback('');
        
        // Refresh data to ensure consistency
        await fetchRegistrations();
      } else {
        throw new Error(result.message || 'Failed to save feedback');
      }
    } catch (error) {
      console.error('Error saving feedback:', error);
      alert(`Error: ${error.message || 'Failed to save feedback. Please try again.'}`);
    }
  };

  // Function to download individual registration report
  const downloadRegistrationReport = (registration) => {
    const reportContent = `
INTERVIEW REGISTRATION REPORT
============================

Personal Information:
- Name: ${registration.name || 'N/A'}
- Email: ${registration.email || 'N/A'}
- Registration ID: ${registration.registrationId || 'N/A'}
- Status: ${registration.status || 'N/A'}
- Submitted At: ${registration.submittedAt ? new Date(registration.submittedAt).toLocaleString() : 'N/A'}

Resume Analysis:
- Summary: ${registration.resumeData?.summary || 'Not available'}
- Work Experience Summary: ${registration.workExperienceSummary || 'Not available'}

AI Resume Verification:
- Similarity Score: ${registration.resumeComparison?.similarityScore || 0}%
- AI Recommendation: ${registration.resumeComparison?.recommendation || 'pending'}
- Confidence: ${registration.resumeComparison?.confidence ? (registration.resumeComparison.confidence * 100).toFixed(0) + '%' : 'N/A'}
- Overall Assessment: ${registration.resumeComparison?.overallAssessment || 'Not available'}

Supporting Evidence:
${registration.resumeComparison?.matchingPoints?.map(point => `- ${point}`).join('\n') || 'None'}

Areas of Concern:
${registration.resumeComparison?.discrepancies?.map(disc => `- ${disc}`).join('\n') || 'None'}

Interview Q&A:
${registration.interviewData?.questions?.map((q, idx) => 
  `Q${idx + 1}: ${q?.question || '—'}\nA${idx + 1}: ${q?.answer || 'Not answered'}\n`
).join('\n') || 'No interview questions recorded yet.'}

Interview Details:
- Started At: ${registration.interviewData?.startedAt ? new Date(registration.interviewData.startedAt).toLocaleString() : '—'}
- Completed At: ${registration.interviewData?.completedAt ? new Date(registration.interviewData.completedAt).toLocaleString() : '—'}
- Is Completed: ${registration.interviewData?.isCompleted ? 'Yes' : 'No'}

Eligibility Assessment:
- UPK Eligible: ${registration.interviewData?.upkEligible ? 'Yes' : 'No'}
- Teacher Eligible: ${registration.interviewData?.teacherEligible ? 'Yes' : 'No'}
- Substitute Eligible: ${registration.interviewData?.substituteEligible ? 'Yes' : 'No'}
- Shift Available: ${registration.interviewData?.shiftAvailable ? 'Yes' : 'No'}
- Diaper Comfortable: ${registration.interviewData?.diaperComfortable ? 'Yes' : 'No'}

Role Recommendations:
- Recommended Position: ${registration.positionType || 'Not determined'}
- Recommended School Type: ${registration.schoolType || 'Not determined'}

HR Feedback:
${registration.feedback || 'No feedback provided yet.'}

Additional Information:
- Phone: ${registration.phone || '—'}
- Location: ${registration.location || '—'}
- Education Level: ${registration.educationLevel || '—'}
- Has Resume: ${registration.resumeData?.filename ? 'Yes' : 'No'}
${registration.resumeData?.filename ? `- Resume File: ${registration.resumeData.filename}` : ''}

Report Generated: ${new Date().toLocaleString()}
============================
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registration-report-${registration.registrationId || registration.name?.replace(/\s+/g, '-') || 'unknown'}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Function to save HR answer to user question
  const saveHrAnswer = async (registrationId) => {
    if (!registrationId) return;
    
    try {
      const registration = registrations.find(r => 
        r._id === registrationId || 
        r.id === registrationId ||
        r._id?.toString() === registrationId.toString() ||
        r.id?.toString() === registrationId.toString()
      );
      
      if (!registration) {
        throw new Error('Registration not found');
      }
      
      const backendId = registration.registrationId;
      
      if (!backendId) {
        await fetchRegistrations();
        throw new Error('Invalid registration ID - data refreshed, please try again');
      }
      
      const response = await fetch(`http://localhost:8000/api/interview-registrations/${backendId}/hr-answer`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hrAnswerToUser: currentHrAnswer })
      });

      const result = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(result.detail || result.message || `HTTP error! status: ${response.status}`);
      }
      
      if (result.success) {
        // Update the local state with the returned data
        setRegistrations(prev => prev.map(reg => 
          (reg._id === registrationId || reg.id === registrationId)
            ? { 
                ...reg, 
                hrAnswerToUser: currentHrAnswer,
                ...(result.data || {})
              }
            : reg
        ));
        
        // Update selectedRegistration if it's the same one being edited
        if (selectedRegistration && (selectedRegistration._id === registrationId || selectedRegistration.id === registrationId)) {
          setSelectedRegistration(prev => ({
            ...prev,
            hrAnswerToUser: currentHrAnswer
          }));
        }
        
        setEditingHrAnswer(null);
        setCurrentHrAnswer('');
        
        // Refresh data to ensure consistency
        await fetchRegistrations();
      } else {
        throw new Error(result.message || 'Failed to save HR answer');
      }
    } catch (error) {
      console.error('Error saving HR answer:', error);
      alert(`Error: ${error.message || 'Failed to save HR answer. Please try again.'}`);
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div className="header-left">
          <h1 className="admin-title">
            <Users className="admin-icon" />
            Recruiter Dashboard
          </h1>
          <p className="admin-subtitle">Manage Interview Registrations</p>
        </div>
        <div className="header-right">
          <button onClick={fetchRegistrations} className="refresh-button">
            <RefreshCw size={20} />
            Refresh
          </button>
          <button onClick={onLogout} className="logout-button">
            <LogOut size={20} />
            Logout
          </button>
          <button onClick={exportToCSV} className="export-button">
            <Download size={20} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">
            <Users />
          </div>
          <div className="stat-content">
            <h3>{stats?.total || 0}</h3>
            <p>Total Registrations</p>
          </div>
        </div>
        <div className="stat-card attempted">
          <div className="stat-icon">
            <TrendingUp />
          </div>
          <div className="stat-content">
            <h3>{stats?.attempted || 0}</h3>
            <p>Attempted</p>
          </div>
        </div>
        <div className="stat-card hr-review">
          <div className="stat-icon">
            <BarChart3 />
          </div>
          <div className="stat-content">
            <h3>{stats?.hrReview || 0}</h3>
            <p>HR Review Pending</p>
          </div>
        </div>
        <div className="stat-card accepted">
          <div className="stat-icon">
            <CheckCircle />
          </div>
          <div className="stat-content">
            <h3>{stats?.accepted || 0}</h3>
            <p>Accepted</p>
          </div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-icon">
            <XCircle />
          </div>
          <div className="stat-content">
            <h3>{stats?.rejected || 0}</h3>
            <p>Rejected</p>
          </div>
        </div>
        <div className="stat-card not-attempted">
          <div className="stat-icon">
            <Clock />
          </div>
          <div className="stat-content">
            <h3>{stats?.notAttempted || 0}</h3>
            <p>Not Attempted</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, or registration ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-box">
          <Filter className="filter-icon" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all" className="filter-select1">All Status</option>
            <option value="not attempted" className="filter-select1">Not Attempted</option>
            <option value="accepted" className="filter-select1">Accepted</option>
            <option value="rejected" className="filter-select1">Rejected</option>
          </select>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="table-container">
        <table className="registrations-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Position Type</th>
              <th>School Type</th>
              <th>HR Review</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegistrations.map((registration) => (
              <tr key={registration._id} className="registration-row">
                <td className="name-cell">
                  <div className="name-info">
                    <strong>{registration.name || 'N/A'}</strong>
                  </div>
                </td>
                <td className="email-cell">
                  <div className="email-info">
                    <Mail size={14} />
                    {registration.email || 'N/A'}
                  </div>
                </td>
                <td className="status-cell">
                  {getStatusBadge(registration.status)}
                </td>
                <td className="pos-cell">
                  {registration.positionType || '—'}
                </td>
                <td className="school-cell">
                  {registration.schoolType || '—'}
                </td>
                <td className="hr-review-cell">
                  <select
                    value={registration.hrReview || 'pending'}
                    onChange={(e) => updateHrReview(registration.id || registration._id, e.target.value)}
                    className="hr-review-select"
                  >
                    <option value="pending">Pending</option>
                    <option value="done">Done</option>
                  </select>
                </td>
                <td className="date-cell">
                  <div className="date-info">
                    <Calendar size={14} />
                    {new Date(registration.submittedAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="actions-cell">
                  <div className="action-buttons">
                    <button
                      onClick={() => {
                        setSelectedRegistration(registration);
                        setShowDetails(true);
                      }}
                      className="action-btn view"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadRegistrationReport(registration);
                      }}
                      className="action-btn download"
                      title="Download Report"
                    >
                      <Download size={16} />
                    </button>
                    {registration.questionByUserToHr && (
                      <span className="question-indicator" title="User has a question for HR">
                        Q
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRegistrations.length === 0 && (
          <div className="no-data">
            <Users className="no-data-icon" />
            <p>No registrations found</p>
          </div>
        )}
      </div>

      {/* Registration Details Modal */}
      {showDetails && selectedRegistration && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registration Details</h2>
              <div className="modal-actions">
                {(editingRole === (selectedRegistration._id || selectedRegistration.id) || editingFeedback === (selectedRegistration._id || selectedRegistration.id) || editingStatus === (selectedRegistration._id || selectedRegistration.id) || editingHrAnswer === (selectedRegistration._id || selectedRegistration.id)) && (
                  <>
                    <button 
                      onClick={() => {
                        if (editingRole === (selectedRegistration._id || selectedRegistration.id)) {
                          saveRoleDetails(selectedRegistration._id || selectedRegistration.id);
                        }
                        if (editingFeedback === (selectedRegistration._id || selectedRegistration.id)) {
                          saveFeedback(selectedRegistration._id || selectedRegistration.id);
                        }
                        if (editingStatus === (selectedRegistration._id || selectedRegistration.id)) {
                          saveStatus(selectedRegistration._id || selectedRegistration.id);
                        }
                        if (editingHrAnswer === (selectedRegistration._id || selectedRegistration.id)) {
                          saveHrAnswer(selectedRegistration._id || selectedRegistration.id);
                        }
                      }}
                      className="action-btn save"
                      title="Save Changes"
                    >
                      <Check size={16} /> ✓
                    </button>
                    <button 
                      onClick={() => {
                        setEditingRole(null);
                        setCurrentPositionType('');
                        setCurrentSchoolType('');
                        setEditingFeedback(null);
                        setCurrentFeedback('');
                        setEditingStatus(null);
                        setCurrentStatus('');
                        setEditingHrAnswer(null);
                        setCurrentHrAnswer('');
                      }}
                      className="action-btn cancel"
                      title="Cancel"
                    >
                      <X size={16} /> ✗
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h3>Personal Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label className="black-label">Name:</label>
                    <span>{selectedRegistration.name}</span>
                  </div>
                  <div className="detail-item">
                    <label className="black-label">Email:</label>
                    <span>{selectedRegistration.email}</span>
                  </div>
                  <div className="detail-item">
                    <label  className="black-label">Registration ID:</label>
                    <span>{selectedRegistration.registrationId}</span>
                  </div>
                  <div className="detail-item">
                    <label className="black-label">Status:</label>
                    {editingStatus === (selectedRegistration._id || selectedRegistration.id) ? (
                      <select
                        value={currentStatus}
                        onChange={(e) => setCurrentStatus(e.target.value)}
                        className="edit-select"
                        autoFocus
                      >
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    ) : (
                      <span onClick={() => {
                        setEditingStatus(selectedRegistration._id || selectedRegistration.id);
                        setCurrentStatus(selectedRegistration.status);
                      }} className="editable-cell" title="Click to edit">
                        {getStatusBadge(selectedRegistration.status)}
                      </span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label className="black-label">Position Type:</label>
                    {editingRole === (selectedRegistration._id || selectedRegistration.id) ? (
                      <select
                        value={currentPositionType}
                        onChange={(e) => setCurrentPositionType(e.target.value)}
                        className="edit-select"
                        autoFocus
                      >
                        <option value="">Select Position</option>
                        <option value="Teacher">Teacher</option>
                        <option value="Substitute">Substitute</option>
                        <option value="Paraprofessional">Paraprofessional</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <span onClick={() => {
                        setEditingRole(selectedRegistration._id || selectedRegistration.id);
                        setCurrentPositionType(selectedRegistration.positionType || '');
                        setCurrentSchoolType(selectedRegistration.schoolType || '');
                      }} className="editable-cell" title="Click to edit">
                        {selectedRegistration.positionType || '—'}
                      </span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label className="black-label">School Type:</label>
                    {editingRole === (selectedRegistration._id || selectedRegistration.id) ? (
                      <select
                        value={currentSchoolType}
                        onChange={(e) => setCurrentSchoolType(e.target.value)}
                        className="edit-select"
                      >
                        <option value="">Select School Type</option>
                        <option value="Charter School">Charter School</option>
                        <option value="Private School">Private School</option>
                        <option value="UPK Program">UPK Program</option>
                        <option value="Transfer School">Transfer School</option>
                        <option value="Traditional Public">Traditional Public</option>
                        <option value="Special Education">Special Education</option>
                      </select>
                    ) : (
                      <span onClick={() => {
                        setEditingRole(selectedRegistration._id || selectedRegistration.id);
                        setCurrentPositionType(selectedRegistration.positionType || '');
                        setCurrentSchoolType(selectedRegistration.schoolType || '');
                      }} className="editable-cell" title="Click to edit">
                        {selectedRegistration.schoolType || '—'}
                      </span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label className="black-label">Submitted:</label>
                    <span>{new Date(selectedRegistration.submittedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* HR Feedback Section */}
              <div className="detail-section">
                <h3>HR Feedback</h3>
                <div className="detail-grid">
                  <div className="detail-item full-width">
                    <label className="black-label">Feedback:</label>
                    {editingFeedback === (selectedRegistration._id || selectedRegistration.id) ? (
                      <textarea
                        value={currentFeedback}
                        onChange={(e) => setCurrentFeedback(e.target.value)}
                        className="editable-textarea"
                        rows="4"
                        placeholder="Enter HR feedback..."
                      />
                    ) : (
                      <span 
                        className="editable-feedback"
                        onClick={() => {
                          setEditingFeedback(selectedRegistration._id || selectedRegistration.id);
                          setCurrentFeedback(selectedRegistration.feedback || '');
                        }}
                      >
                        {selectedRegistration.feedback || 'Click to add feedback...'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* User Question and HR Answer Section */}
              {selectedRegistration.questionByUserToHr && (
                <div className="detail-section">
                  <h3>Question From User</h3>
                  <div className="detail-grid">
                    <div className="detail-item full-width">
                      <label className="black-label">User's Question:</label>
                      <div className="user-question-box">
                        {selectedRegistration.questionByUserToHr}
                      </div>
                    </div>
                    {/* <div className="detail-item full-width">
                      <label>HR Answer:</label>
                      {editingHrAnswer === (selectedRegistration._id || selectedRegistration.id) ? (
                        <textarea
                          value={currentHrAnswer}
                          onChange={(e) => setCurrentHrAnswer(e.target.value)}
                          className="editable-textarea"
                          rows="4"
                          placeholder="Enter HR answer to user's question..."
                        />
                      ) : (
                        <span 
                          className="editable-feedback"
                          onClick={() => {
                            setEditingHrAnswer(selectedRegistration._id || selectedRegistration.id);
                            setCurrentHrAnswer(selectedRegistration.hrAnswerToUser || '');
                          }}
                        >
                          {selectedRegistration.hrAnswerToUser || 'Click to add answer...'}
                        </span>
                      )}
                    </div> */}
                  </div>
                </div>
              )}

              {/* Resume Analysis Section */}
              <div className="detail-section">
                <h3>Resume Analysis</h3>
                <div className="detail-grid">
                  <div className="detail-item full-width">
                    <label className="black-label">Summary:</label>
                    <span>{selectedRegistration.resumeData?.summary || 'Not available'}</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Resume Comparison Section */}
              {selectedRegistration.resumeComparison && (
                <div className="detail-section">
                  <h3>AI Resume Verification</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label className="black-label">Similarity Score:</label>
                      <span className={`similarity-score ${selectedRegistration.resumeComparison.similarityScore >= 80 ? 'high' : selectedRegistration.resumeComparison.similarityScore >= 60 ? 'moderate' : 'low'}`}>
                        {selectedRegistration.resumeComparison.similarityScore}%
                      </span>
                    </div>
                    <div className="detail-item">
                      <label className="black-label">AI Recommendation:</label>
                      <span className={`recommendation-badge ${selectedRegistration.resumeComparison.recommendation}`}>
                        {selectedRegistration.resumeComparison.recommendation === 'proceed' ? '✅ Proceed' : 
                         selectedRegistration.resumeComparison.recommendation === 'hold' ? '⏸️ Hold' : 
                         '❌ Reject'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label className="black-label">Confidence:</label>
                      <span>{(selectedRegistration.resumeComparison.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="detail-item full-width">
                      <label className="black-label">Overall Assessment:</label>
                      <span>{selectedRegistration.resumeComparison.overallAssessment}</span>
                    </div>
                    {selectedRegistration.resumeComparison.matchingPoints && selectedRegistration.resumeComparison.matchingPoints.length > 0 && (
                      <div className="detail-item full-width">
                        <label className="black-label">Supporting Evidence:</label>
                        <ul className="evidence-list">
                          {selectedRegistration.resumeComparison.matchingPoints.map((point, idx) => (
                            <li key={idx}>✅ {point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedRegistration.resumeComparison.discrepancies && selectedRegistration.resumeComparison.discrepancies.length > 0 && (
                      <div className="detail-item full-width">
                        <label className="black-label">Areas of Concern:</label>
                        <ul className="evidence-list">
                          {selectedRegistration.resumeComparison.discrepancies.map((discrepancy, idx) => (
                            <li key={idx}>⚠️ {discrepancy}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="detail-item">
                      <label className="black-label">Analyzed At:</label>
                      <span>{selectedRegistration.resumeComparison.analyzedAt ? new Date(selectedRegistration.resumeComparison.analyzedAt).toLocaleString() : '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Interview Q&A Section */}
              <div className="detail-section">
                <h3>Interview Q&A</h3>
                <div className="detail-grid">
                  {(selectedRegistration.interviewData?.questions || []).length === 0 ? (
                    <div className="detail-item full-width">
                      <span>No interview questions recorded yet.</span>
                    </div>
                  ) : (
                    selectedRegistration.interviewData?.questions?.map((q, idx) => (
                      <div key={idx} className="detail-item full-width qa-item">
                        <label className="black-label">Q{idx + 1}: {q?.question || '—'}</label>
                        <div className="answer-text">{q?.answer ? q.answer : 'Not answered'}</div>
                      </div>
                    ))
                  )}
                  <div className="detail-item">
                    <label className="black-label">Interview Started:</label>
                    <span>{selectedRegistration.interviewData?.startedAt ? new Date(selectedRegistration.interviewData.startedAt).toLocaleString() : '—'}</span>
                  </div>
                  <div className="detail-item">
                    <label className="black-label">Interview Completed:</label>
                    <span>{selectedRegistration.interviewData?.completedAt ? new Date(selectedRegistration.interviewData.completedAt).toLocaleString() : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Eligibility Tags Section */}
              <div className="detail-section">
                <h3>Eligibility Assessment</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label className="black-label">UPK Eligible:</label>
                    <span className={`tag ${selectedRegistration.interviewData?.upkEligible ? 'tag-yes' : 'tag-no'}`}>
                      {selectedRegistration.interviewData?.upkEligible ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label className="black-label">Teacher Eligible:</label>
                    <span className={`tag ${selectedRegistration.interviewData?.teacherEligible ? 'tag-yes' : 'tag-no'}`}>
                      {selectedRegistration.interviewData?.teacherEligible ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label className="black-label">Substitute Eligible:</label>
                    <span className={`tag ${selectedRegistration.interviewData?.substituteEligible ? 'tag-yes' : 'tag-no'}`}>
                      {selectedRegistration.interviewData?.substituteEligible ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label className="black-label">Shift Available:</label>
                    <span className={`tag ${selectedRegistration.interviewData?.shiftAvailable ? 'tag-yes' : 'tag-no'}`}>
                      {selectedRegistration.interviewData?.shiftAvailable ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label className="black-label">Diaper Comfortable:</label>
                    <span className={`tag ${selectedRegistration.interviewData?.diaperComfortable ? 'tag-yes' : 'tag-no'}`}>
                      {selectedRegistration.interviewData?.diaperComfortable ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Recommendations Section */}
              <div className="detail-section">
                <h3>Role Recommendations</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label className="black-label">Recommended Position:</label>
                    <span className="position-type">{selectedRegistration.positionType || 'Not determined'}</span>
                  </div>
                  <div className="detail-item">
                    <label className="black-label">Recommended School Type:</label>
                    <span className="school-type">{selectedRegistration.schoolType || 'Not determined'}</span>
                  </div>
                  <div className="detail-item full-width">
                    <label className="black-label">Work Experience Summary:</label>
                    <span>{selectedRegistration.workExperienceSummary || 'Not available'}</span>
                  </div>
                </div>
              </div>

              {/* HR Feedback Section */}
              {selectedRegistration.feedback && (
                <div className="detail-section">
                  <h3>HR Feedback</h3>
                  <div className="detail-grid">
                    <div className="detail-item full-width">
                      <label className="black-label">Feedback:</label>
                      <div className="feedback-display">
                        {selectedRegistration.feedback}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Details Section */}
              <div className="detail-section">
                <h3>Additional Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label className="black-label">Phone:</label>
                    <span>{selectedRegistration.phone || '—'}</span>
                  </div>
                  <div className="detail-item">
                    <label className="black-label">Location:</label>
                    <span>{selectedRegistration.location || '—'}</span>
                  </div>
                  <div className="detail-item">
                    <label className="black-label">Education Level:</label>
                    <span>{selectedRegistration.educationLevel || '—'}</span>
                  </div>
                  <div className="detail-item">
                    <label className="black-label">Has Resume:</label>
                    <span className={`tag ${selectedRegistration.resumeData?.filename ? 'tag-yes' : 'tag-no'}`}>
                      {selectedRegistration.resumeData?.filename ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {selectedRegistration.resumeData?.filename && (
                    <div className="detail-item">
                      <label className='black-label' >Resume File:</label>
                      <span>{selectedRegistration.resumeData.filename}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setShowDetails(false)}
                className="close-modal-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard; 