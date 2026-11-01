// import React, { useState, useEffect } from "react";
// import { Plus, Trash2, AlertCircle, Menu } from "lucide-react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import SideBar from "../components/SideBar"; // ✅ adjust path if needed

// function AddDevice() {
//   const navigate = useNavigate();

//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [devices, setDevices] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");

//   const [formData, setFormData] = useState({
//     deviceName: "",
//     apiUrl: "",
//     wifiSN: "",
//     tokenId: "",
//   });


//   useEffect(() => {
//     fetchDevices();
//   }, []);

//   const fetchDevices = async () => {
//     try {
//       setLoading(true);
//       const token = localStorage.getItem("token");

//       const response = await axios.get("http://localhost:5000/api/device", {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (response.data.success) {
//         setDevices(response.data.devices);
//       }
//     } catch (err) {
//       setError("Failed to load devices");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleInputChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//     setError("");
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!formData.deviceName || !formData.apiUrl || !formData.wifiSN) {
//       setError("All fields are required");
//       return;
//     }

//     try {
//       const token = localStorage.getItem("token");

//       const response = await axios.post(
//         "http://localhost:5000/api/devices/add",
//         formData,
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );

//       if (response.data.success) {
//         setSuccess("Device added successfully!");
//         setFormData({ deviceName: "", apiUrl: "", wifiSN: "" });
//         setShowForm(false);
//         fetchDevices();

//         setTimeout(() => {
//           navigate("/");
//         }, 1200);
//       }
//     } catch (err) {
//       setError(err.response?.data?.message || "evice");
//     }
//   };

//   const handleDelete = async (deviceId) => {
//     if (!window.confirm("Delete this device?")) return;

//     try {
//       const token = localStorage.getItem("token");

//       await axios.delete(
//         `http://localhost:5000/api/devices/${deviceId}`,
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );

//       setSuccess("Device deleted successfully");
//       fetchDevices();
//     } catch (err) {
//       setError("Failed to delete device");
//     }
//   };

//   return (
//     <div className="flex h-screen bg-slate-50">
//       {/* Sidebar */}
//       <SideBar sidebarOpen={sidebarOpen} />

//       {/* Main Content */}
//       <div className="flex-1 flex flex-col overflow-hidden">
//         {/* Header */}
//         <header className="bg-white border-b border-slate-200 shadow-sm">
//           <div className="px-6 py-4 flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <button
//                 onClick={() => setSidebarOpen(!sidebarOpen)}
//                 className="p-2 hover:bg-slate-100 rounded-lg"
//               >
//                 <Menu className="w-6 h-6 text-slate-600" />
//               </button>

//               <h1 className="text-xl font-bold text-slate-800">
//                 Device Management
//               </h1>
//             </div>

//             <button
//               onClick={() => navigate(-1)}
//               className="text-blue-600 hover:underline"
//             >
//               ← Back to Dashboard
//             </button>
//           </div>
//         </header>

//         {/* Page Content */}
//         <main className="flex-1 overflow-y-auto p-8">
//           {/* Alerts */}
//           {error && (
//             <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
//               <AlertCircle className="text-red-500" />
//               <span className="text-red-700">{error}</span>
//             </div>
//           )}

//           {success && (
//             <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
//               {success}
//             </div>
//           )}

//           {/* Add Device Button */}
//           {!showForm && (
//             <button
//               onClick={() => setShowForm(true)}
//               className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
//             >
//               <Plus className="w-4 h-4" />
//               Add New Device
//             </button>
//           )}

//           {/* Add Device Form */}
//           {showForm && (
//             <form
//               onSubmit={handleSubmit}
//               className="bg-white p-6 rounded-xl shadow mb-8 space-y-4 max-w-xl"
//             >
//               <input
//                 name="deviceName"
//                 placeholder="Device Name"
//                 value={formData.deviceName}
//                 onChange={handleInputChange}
//                 className="w-full border p-3 rounded"
//               />

//               <input
//                 name="apiUrl"
//                 placeholder="API URL"
//                 value={formData.apiUrl}
//                 onChange={handleInputChange}
//                 className="w-full border p-3 rounded"
//               />

//               <input
//                 name="wifiSN"
//                 placeholder="WiFi SN"
//                 value={formData.wifiSN}
//                 onChange={handleInputChange}
//                 className="w-full border p-3 rounded"
//               />

//               <input
//                 name="tokenId"
//                 placeholder="Token ID"
//                 value={formData.tokenId}
//                 onChange={handleInputChange}
//                 className="w-full border p-3 rounded"
//               />

//               <div className="flex gap-3">
//                 <button
//                   type="submit"
//                   className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
//                 >
//                   Save Device
//                 </button>

//                 <button
//                   type="button"
//                   onClick={() => setShowForm(false)}
//                   className="px-6 py-3 bg-slate-200 rounded"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           )}

//           {/* Device List */}
//           {loading ? (
//             <p>Loading devices...</p>
//           ) : (
//             <div className="grid gap-4 max-w-4xl">
//               {devices.map((device) => (
//                 <div
//                   key={device._id}
//                   className="bg-white p-5 rounded-xl shadow flex justify-between"
//                 >
//                   <div>
//                     <h3 className="font-bold">{device.deviceName}</h3>
//                     <p className="text-sm text-slate-600">{device.apiUrl}</p>
//                     <p className="text-sm font-mono">{device.wifiSN}</p>
//                   </div>

//                   <button
//                     onClick={() => handleDelete(device._id)}
//                     className="text-red-500 hover:bg-red-50 p-2 rounded"
//                   >
//                     <Trash2 />
//                   </button>
//                 </div>
//               ))}
//             </div>
//           )}
//         </main>
//       </div>
//     </div>
//   );
// }

// export default AddDevice;

import React, { useState, useEffect } from "react";
import { Plus, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

function AddDevice() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('User');
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshing, setRefreshing] = useState(null);

  const [formData, setFormData] = useState({
    deviceName: "",
    apiUrl: "",
    wifiSN: "",
    tokenId: "",
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');
    if (!token) {
      navigate('/login');
      return;
    }
    setIsLoggedIn(true);
    setUsername(userEmail || 'User');
    fetchDevices();
  }, [navigate]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/devices?refresh=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Devices response:', response.data);
      console.log('Devices count:', response.data?.count);
      console.log('Devices array:', response.data?.devices);

      if (response.data.success) {
        const deviceList = response.data.devices || response.data.device || [];
        console.log('Setting devices:', deviceList);
        console.log('Device list length:', deviceList.length);
        console.log('Is array?', Array.isArray(deviceList));

        if (Array.isArray(deviceList) && deviceList.length > 0) {
          console.log('First device:', deviceList[0]);
        }

        setDevices(Array.isArray(deviceList) ? deviceList : []);
      } else {
        console.log('Response not successful, setting empty array');
        setDevices([]);
      }
    } catch (err) {
      console.error('Fetch devices error:', err);
      console.error('Error response:', err.response?.data);
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || "Failed to load devices");
        setDevices([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.deviceName || !formData.apiUrl || !formData.wifiSN || !formData.tokenId) {
      setError("All fields are required");
      return;
    }

    // Basic URL validation
    try {
      new URL(formData.apiUrl);
    } catch {
      setError("Please enter a valid API URL");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/devices/add`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setSuccess(response.data.message || "Device added successfully!");
        setFormData({
          deviceName: "",
          apiUrl: "",
          wifiSN: "",
          tokenId: "",
        });
        setShowForm(false);
        setError(""); // Clear any previous errors
        // Wait a bit then fetch devices to ensure backend has saved
        setTimeout(() => {
          fetchDevices();
        }, 500);

        setTimeout(() => {
          setSuccess("");
          // Optionally navigate to dashboard after successful addition
          // navigate("/");
        }, 3000);
      }
    } catch (err) {
      console.error('Add device error:', err);
      console.error('Error response:', err.response?.data);

      // Check if it's a 400 error - might be API connection issue but device could still be created
      if (err.response?.status === 400) {
        const errorMsg = err.response?.data?.message || '';

        // If it's about API connection failure, device might still be created
        // Try to fetch devices to see if it was actually created
        if (errorMsg.includes('Failed to connect') || errorMsg.includes('API') || errorMsg.includes('405')) {
          // Wait a moment then check if device was created
          setTimeout(async () => {
            try {
              await fetchDevices();
              // If devices were fetched successfully, show success message
              setSuccess('Device may have been added. Please check the device list. If not visible, the API connection test failed.');
              setFormData({
                deviceName: "",
                apiUrl: "",
                wifiSN: "",
                tokenId: "",
              });
              setShowForm(false);
              setError("");
            } catch (fetchErr) {
              // If fetch fails, show the original error
              setError(errorMsg || "Failed to add device. Please check your inputs and try again.");
            }
          }, 1000);
        } else if (errorMsg.includes('already exists') || errorMsg.includes('required')) {
          // Validation errors - keep form data
          setError(errorMsg);
        } else {
          // Other 400 errors
          setError(errorMsg || "Failed to add device. Please check your inputs.");
        }
      } else {
        // Other errors (500, network, etc.)
        const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to add device";
        setError(errorMessage);
        // Still try to fetch devices in case it was partially successful
        setTimeout(() => {
          fetchDevices();
        }, 1000);
      }
    }
  };

  const handleRefresh = async (deviceId) => {
    try {
      setRefreshing(deviceId);
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/devices/${deviceId}/refresh`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setSuccess("Device data refreshed successfully");
        fetchDevices();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to refresh device data");
      console.error(err);
    } finally {
      setRefreshing(null);
    }
  };

  const handleDelete = async (deviceId) => {
    if (!window.confirm("Are you sure you want to delete this device?")) return;

    try {
      const token = localStorage.getItem("token");

      await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess("Device deleted successfully");
      fetchDevices();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to delete device");
      console.error(err);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  return (
    <Layout isLoggedIn={isLoggedIn} username={username} onLogout={handleLogout}>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">
              Device Management
            </h1>
            <p className="text-slate-600 mt-1">Add and manage your solar devices</p>
          </div>
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 items-start">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
              {success}
            </div>
          )}

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add New Device
            </button>
          )}

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="bg-white p-6 rounded-xl shadow-md mb-8 space-y-4 max-w-2xl"
            >
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Add Solar Device
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Device Name *
                </label>
                <input
                  name="deviceName"
                  placeholder="e.g., Rooftop Solar Panel"
                  value={formData.deviceName}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  API URL *
                </label>
                <input
                  name="apiUrl"
                  type="url"
                  placeholder="e.g., https://global.solaxcloud.com/api/v2/dataAccess/realtimeInfo/get"
                  value={formData.apiUrl}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter the full API endpoint URL for your device
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  WiFi SN (Registration Number) *
                </label>
                <input
                  name="wifiSN"
                  placeholder="e.g., SRDZQ4B4ZP"
                  value={formData.wifiSN}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Token ID *
                </label>
                <input
                  name="tokenId"
                  placeholder="e.g., 20260101202949173513252"
                  value={formData.tokenId}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
                >
                  Save Device
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      deviceName: "",
                      apiUrl: "",
                      wifiSN: "",
                      tokenId: "",
                    });
                    setError("");
                  }}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-slate-600">Loading devices...</p>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow">
              <p className="text-slate-600">No devices found. Add your first device to get started!</p>
            </div>
          ) : (
            <div className="grid gap-6 max-w-6xl">
              {devices.map((device) => (
                <div
                  key={device._id}
                  className="bg-white p-6 rounded-xl shadow-md border border-slate-200"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">
                        {device.deviceName}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        WiFi SN: <span className="font-mono">{device.wifiSN}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        API: <span className="text-blue-600">{device.apiUrl}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Added: {formatDate(device.createdAt)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRefresh(device._id)}
                        disabled={refreshing === device._id}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                        title="Refresh data"
                      >
                        <RefreshCw
                          className={`w-5 h-5 ${refreshing === device._id ? "animate-spin" : ""
                            }`}
                        />
                      </button>
                      <button
                        onClick={() => handleDelete(device._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete device"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* {device.latestData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-600 font-medium">AC Power</p>
                        <p className="text-lg font-bold text-blue-900">
                          {device.latestData.acpower?.toFixed(1) || "0.0"} W
                        </p>
                      </div>

                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-green-600 font-medium">Today's Yield</p>
                        <p className="text-lg font-bold text-green-900">
                          {device.latestData.yieldtoday?.toFixed(1) || "0.0"} kWh
                        </p>
                      </div>

                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-xs text-purple-600 font-medium">Total Yield</p>
                        <p className="text-lg font-bold text-purple-900">
                          {device.latestData.yieldtotal?.toFixed(1) || "0.0"} kWh
                        </p>
                      </div>

                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-xs text-orange-600 font-medium">Feed-in Power</p>
                        <p className="text-lg font-bold text-orange-900">
                          {device.latestData.feedinpower?.toFixed(1) || "0.0"} W
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-600 font-medium">Inverter SN</p>
                        <p className="text-sm font-mono text-slate-900">
                          {device.latestData.inverterSN || "N/A"}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-600 font-medium">Status</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {device.latestData.inverterStatus || "N/A"}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg col-span-2">
                        <p className="text-xs text-slate-600 font-medium">Last Updated</p>
                        <p className="text-sm text-slate-900">
                          {device.latestData.uploadTime || "N/A"}
                        </p>
                      </div>
                    </div>
                  )} */}

                  {/* {!device.latestData && (
                    <div className="mt-4 pt-4 border-t border-slate-200 text-center text-slate-500">
                      <p>No data available. Click refresh to fetch latest data.</p>
                    </div>
                  )} */}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default AddDevice;