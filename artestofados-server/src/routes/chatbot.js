const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot');

router.post('/connect', chatbotController.connect);
router.get('/qr', chatbotController.getQRCode);
router.post('/disconnect', chatbotController.disconnect);
router.post('/pause', chatbotController.pause);
router.post('/resume', chatbotController.resume);
router.get('/status', chatbotController.getStatus);
router.get('/sessions', chatbotController.getSessions);

module.exports = router;