// const express = require('express');
// const router = express.Router();
// const axios = require('axios');

// exports.getRealtimeSolarData = async (req, res) => {
//   try {
//     const response = await axios.post(
//       "https://global.solaxcloud.com/api/v2/dataAccess/realtimeInfo/get",
//       {
//         wifiSn: process.env.SOLAX_WIFI_SN
//       },
//       {
//         headers: {
//           tokenId: process.env.SOLAX_TOKEN,
//           "Content-Type": "application/json"
//         }
//       }
//     );

//     return res.status(200).json(response.data);

//   } catch (error) {
//     console.error("SolaX API Error:", error.message);
//     return res.status(500).json({ success: false, message: "Solar API failed" });
//   }
// };
