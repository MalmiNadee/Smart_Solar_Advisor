import { Router } from 'express';
import { getCurrent, getForecast, getSeasonal, getFullYearForecast } from '../controllers/weather.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/current', verifyToken, getCurrent);
router.get('/forecast', verifyToken, getForecast);
router.get('/seasonal', verifyToken, getSeasonal);
router.get('/full-year-forecast/:customerName/:siteId', verifyToken, getFullYearForecast);

export default router;
