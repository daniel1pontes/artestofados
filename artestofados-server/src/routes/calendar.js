const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendar');

router.post('/event', calendarController.createVisit);
router.get('/available-slots', calendarController.getAvailableSlots);

module.exports = router;