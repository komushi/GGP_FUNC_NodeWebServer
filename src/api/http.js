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

  payload.eventTimestamp = Date.now();

  if(payload.type == 1 || payload.type == 2){
    delete payload.checkPic;
  } else {
    payload.checkPic = payload.checkPic.replace(/\r?\n|\r/g, "");
  }

  console.log('uploadMipsGateRecord payload:' + JSON.stringify(payload));

  await storage.saveScanRecord(payload);

  // await storage.

  const response = {
      "code":0,
      "message": `userName: ${payload.userName}`
  };

  res.send(response);
  
});

/*
router.post('/uploadMipsGateRecord', async (req, res) => {

  const record = Object.assign({}, req.body);

  record.eventTimestamp = Date.now();

  if(record.type == 1 || record.type == 2){
    delete record.checkPic;
  }

  console.log('uploadMipsGateRecord req.body:' + JSON.stringify(record));

  await storage.saveScanRecord(record);

  const response = {
      "code":0,
      "message": `userName: ${payload.userName}`
  };

  res.send(response);
  
});
*/