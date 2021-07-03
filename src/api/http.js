const storage = require('../api/storage');

const Router = require('express-promise-router');

const router = new Router();

// export our router to be mounted by the parent application
module.exports = router

router.post('/deviceReg', async (req, res) => {

  console.log('req.body' + JSON.stringify(req.body));

  await storage.updateScanner({
    terminalKey: req.body.terminalKey,
    listingId: req.body.listingId,
    roomCode: req.body.roomCode,
    localIp: req.body.localIp
  });

  const response = {
    "code":0,
    "message":"Good!" 
  };
  
  res.send(response);

});

router.post('/uploadMipsGateRecord', async (req, res) => {

  const payload = Object.assign({}, req.body);

  delete payload.checkPic;

  console.log('uploadMipsGateRecord payload:' + JSON.stringify(payload));

  // const storage = require('../handler/storage');
  // await storage.saveScanRecord(payload);

  const response = {
      "code":0,
      "message":"Good!" 
  };

  res.send(response);
  
});