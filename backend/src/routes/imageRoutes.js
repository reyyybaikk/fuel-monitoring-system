const router = require('express').Router();
const path = require('path');
const fs = require('fs');

router.get('/api/images/:id', (req, res) => {
  const imagePath = path.join(__dirname, '../../uploads', req.params.id);
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ message: 'Image not found' });
  }
});

module.exports = router;
