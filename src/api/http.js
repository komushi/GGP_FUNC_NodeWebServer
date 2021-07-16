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

  const payload = req.body

  payload.eventTimestamp = Date.now();
  delete payload.checkPic;

  console.log('uploadMipsGateRecord payload:' + JSON.stringify(payload));

  await storage.saveScanRecord(payload);

  if (payload.type == 1 || payload.type == 2) {
    const getMemberResult = await storage.getMember({
      reservationCode: payload.group,
      memberNo: payload.memberId
    });

    res.send({
        "code":0,
        "message": `${payload.userName} roomKey: ${getMemberResult.roomKey}`
    });

  } else {
    res.send({
        "code":1,
        "message": 'Not allowed!'

    });
  }
});

/*
router.post('/uploadMipsGateRecord', async (req, res) => {

  const payload = Object.assign({}, req.body);

  payload.eventTimestamp = Date.now();

  if (payload.type == 1 || payload.type == 2) {
    delete payload.checkPic;
  } else {
    payload.checkPic = payload.checkPic.replace(/\r?\n|\r/g, "");
  }

  console.log('uploadMipsGateRecord payload:' + JSON.stringify(payload));

  await storage.saveScanRecord(payload);

  if (payload.type == 1 || payload.type == 2) {
    const getMemberResult = await storage.getMember({
      reservationCode: payload.group,
      memberNo: payload.memberId
    });

    res.send({
        "code":0,
        "message": `${payload.userName} roomKey: ${getMemberResult.roomKey}`
    });

  } else {
    res.send({
        "code":1,
        "message": 'Not allowed!'

    });
  }
});
*/