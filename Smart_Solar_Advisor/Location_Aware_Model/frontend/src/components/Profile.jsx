import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { profileAPI } from "../services/api";
import Navbar from "./Navbar";
import "../styles/Profile.css";

function Profile({ user, onLogout }) {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Profile update
  const [email, setEmail] = useState("");
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  // Change Password
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await profileAPI.getProfile();
      setProfileData(response.data);
      setEmail(response.data.user.email || "");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      await profileAPI.updateProfile({ email });
      setSuccess("Profile updated successfully!");
      setShowUpdateForm(false);
      loadProfile(); // Reload to get updated data
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!passwordData.current_password || !passwordData.new_password) {
      setError("Please fill in all password fields");
      return;
    }

    if (passwordData.new_password.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError("New passwords do not match");
      return;
    }

    try {
      await profileAPI.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setSuccess("Password changed successfully!");
      setShowPasswordForm(false);
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password");
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-container">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-wrapper">
      <Navbar user={user} onLogout={onLogout} />
      <div className="profile-container">
        <div className="profile-header">
          <h1>User Profile</h1>
          <button onClick={() => navigate("/")} className="btn-back">
            ← Back to Dashboard
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {success && <div className="alert alert-success">{success}</div>}

        {profileData && (
          <div className="profile-content">
            {/* User Information Card */}
            <div className="profile-card">
              <h2>User Information</h2>
              <div className="profile-info">
                <div className="info-row">
                  <span className="info-label">Username:</span>
                  <span className="info-value">
                    {profileData.user.username}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email:</span>
                  <span className="info-value">
                    {profileData.user.email || "Not set"}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Role:</span>
                  <span className="info-value">
                    {profileData.user.is_admin ? (
                      <span className="badge-admin">Admin</span>
                    ) : (
                      <span className="badge-user">User</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="profile-actions">
                <button
                  onClick={() => {
                    setShowUpdateForm(!showUpdateForm);
                    setShowPasswordForm(false);
                  }}
                  className="btn-primary"
                >
                  {showUpdateForm ? "Cancel" : "Update Email"}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(!showPasswordForm);
                    setShowUpdateForm(false);
                  }}
                  className="btn-secondary"
                >
                  {showPasswordForm ? "Cancel" : " Change Password"}
                </button>
              </div>
            </div>

            {/* Update Email Form */}
            {showUpdateForm && (
              <div className="profile-card">
                <h2>Update Email</h2>
                <form onSubmit={handleUpdateProfile} className="profile-form">
                  <div className="form-group">
                    <label htmlFor="email">New Email:</label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary">
                    Update Email
                  </button>
                </form>
              </div>
            )}

            {/* Change Password Form */}
            {showPasswordForm && (
              <div className="profile-card">
                <h2>Change Password</h2>
                <form onSubmit={handleChangePassword} className="profile-form">
                  <div className="form-group">
                    <label htmlFor="current_password">Current Password:</label>
                    <input
                      type="password"
                      id="current_password"
                      value={passwordData.current_password}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          current_password: e.target.value,
                        })
                      }
                      placeholder="Enter current password"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="new_password">New Password:</label>
                    <input
                      type="password"
                      id="new_password"
                      value={passwordData.new_password}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          new_password: e.target.value,
                        })
                      }
                      placeholder="Enter new password (min 6 characters)"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirm_password">
                      Confirm New Password:
                    </label>
                    <input
                      type="password"
                      id="confirm_password"
                      value={passwordData.confirm_password}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirm_password: e.target.value,
                        })
                      }
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                    />
                  </div>
                  <button type="submit" className="btn-primary">
                    Change Password
                  </button>
                </form>
              </div>
            )}

            {/* Statistics Card */}
            <div className="profile-card">
              <h2> Your Statistics</h2>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-content">
                    <div className="stat-value">
                      {profileData.statistics.total_predictions}
                    </div>
                    <div className="stat-label">Total Predictions</div>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-content">
                    <div className="stat-value">
                      {profileData.statistics.average_energy_kwh.toFixed(2)} kWh
                    </div>
                    <div className="stat-label">Avg Energy Output</div>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-content">
                    <div className="stat-value">
                      {(
                        profileData.statistics.average_confidence * 100
                      ).toFixed(1)}
                      %
                    </div>
                    <div className="stat-label">Avg Confidence</div>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-content">
                    <div className="stat-value">
                      LKR{" "}
                      {profileData.statistics.total_potential_savings_lkr.toFixed(
                        2
                      )}
                    </div>
                    <div className="stat-label">Potential Savings</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
