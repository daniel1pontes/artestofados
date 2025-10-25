const express = require('express');
const router = express.Router();
const osController = require('../controllers/os');
const upload = require('../middleware/uploads');

router.post('/', upload.single('imagem_projeto'), osController.create);
router.get('/', osController.list);
router.get('/:id', osController.getById);
router.get('/:id/pdf', osController.downloadPDF);
router.put('/:id', osController.update);
router.delete('/:id', osController.delete);

module.exports = router;