//! routes/weather.js

import { Router } from 'express';
import {
	renderWeather,
	saveWeatherViewport,
} from '../controllers/weather/main.js';
import { searchCities } from '../controllers/weather/searchCities.js';
import { validateWeatherQuery } from '../middlewares/validators/weather.js';
import { externalApiLimiter } from '../middlewares/rateLimit.js';

const router = Router();

router.get('/', externalApiLimiter, validateWeatherQuery, renderWeather);
router.post('/viewport', saveWeatherViewport);
router.get('/cities', externalApiLimiter, searchCities);

export default router;
