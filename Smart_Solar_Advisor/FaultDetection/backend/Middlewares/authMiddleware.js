// const jwt = require('jsonwebtoken');

// const authMiddleware = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return res.status(401).json({ message: 'Not authenticated' });
//   }

//   const token = authHeader.split(' ')[1];
//   if (!token) {
//     return res.status(401).json({ message: 'Not authenticated' });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'madusarani**2001');
//     req.userId = decoded.userId;
//     next();
//   } catch (error) {
//     console.error('Token Verification Error:', error.message);
//     return res.status(401).json({ message: 'Invalid or expired token' });
//   }
// };

// module.exports = authMiddleware;

// const jwt = require('jsonwebtoken');

// const authMiddleware = (req, res, next) => {
//   try {
//     // Get token from header
//     const authHeader = req.header('Authorization');

//     if (!authHeader) {
//       return res.status(401).json({
//         success: false,
//         message: 'No authorization header provided'
//       });
//     }

//     // Check if it starts with 'Bearer '
//     if (!authHeader.startsWith('Bearer ')) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid authorization format. Use: Bearer <token>'
//       });
//     }

//     // Extract token
//     const token = authHeader.replace('Bearer ', '');

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: 'No token provided'
//       });
//     }

//     // Verify token
//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);

//       // Add user info to request
//       req.user = decoded;

//       console.log('✅ Token verified for user:', decoded.id); // Debug log

//       next();
//     } catch (jwtError) {
//       console.error('JWT Error:', jwtError.message);

//       if (jwtError.name === 'JsonWebTokenError') {
//         return res.status(401).json({
//           success: false,
//           message: 'Invalid token'
//         });
//       }

//       if (jwtError.name === 'TokenExpiredError') {
//         return res.status(401).json({
//           success: false,
//           message: 'Token expired'
//         });
//       }

//       return res.status(401).json({
//         success: false,
//         message: 'Token verification failed'
//       });
//     }
//   } catch (error) {
//     console.error('Auth middleware error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error in authentication'
//     });
//   }
// };

// module.exports = authMiddleware;

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization header provided'
      });
    }

    // Check if it starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format. Use: Bearer <token>'
      });
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'madusarani**2001'; // Fallback secret
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        // Fallback to SmartSolar_Backend JWT Secret if the primary fails
        decoded = jwt.verify(token, 'your-jwt-secret-key');
      }

      // Add user info to request
      req.user = decoded;
      // Normalizing the ID
      if (!req.user.id && req.user.userId) {
        req.user.id = req.user.userId;
      }

      // Additional check to ensure id exists
      if (!req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token structure - missing user id'
        });
      }

      next();
    } catch (jwtError) {
      console.error('JWT Error:', jwtError.message);

      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Token verification failed'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

module.exports = authMiddleware;