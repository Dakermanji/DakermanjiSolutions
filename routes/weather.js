//! routes/weather.js

import { Router } from 'express';
import {
	renderWeather,
	saveWeatherViewport,
} from '../controllers/weather/main.js';
import { searchCities } from '../controllers/weather/searchCities.js';
import { validateWeatherQuery } from '../middlewares/validators/weather.js';

const router = Router();

router.get('/', validateWeatherQuery, renderWeather);
router.post('/viewport', saveWeatherViewport);
router.get('/cities', searchCities);

export default router;
