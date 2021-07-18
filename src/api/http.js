const storage = require('../api/storage');

const Router = require('express-promise-router');

const router = new Router();

// export our router to be mounted by the parent application
module.exports = router;

router.post('/deviceReg', async (req, res) => {

  console.log('req.body' + JSON.stringify(req.body));

  const listingIds = req.body.listingId.split(',');

  let response = {
    'code': 0,
    'message': 'Good' 
  };

  let params = [];

  if (listingIds.length == 0) {
    response = {
      'code': 1,
      'message': 'Please set listingId to <listingId1> or <listingId1>,<listingId2>!!'
    };
    
    return res.send(response);

  } else if (listingIds.length == 1) {

    res.send(response);

    params.push({
      terminalKey: req.body.terminalKey,
      listingId: req.body.listingId,
      roomCode: req.body.roomCode,
      localIp: req.body.localIp
    });

  } else if (listingIds.length > 1) {

    if (req.body.roomCode) {
      response = {
        'code': 1,
        'message': 'Cannot set roomCode with multiple listingIds.'
      };

      return res.send(response);
    } else {
      res.send(response);

      listingIds.forEach(listingId => {
        params.push({
          terminalKey: req.body.terminalKey,
          listingId: listingId,
          localIp: req.body.localIp
        });
      });
    }
  }

  await Promise.all(params.map(async(param) => {
    await storage.updateScanner(param);
  }));

});

router.post('/uploadMipsGateRecord', async (req, res) => {

  const payload = req.body

  payload.eventTimestamp = Date.now();
  delete payload.checkPic;

  console.log('uploadMipsGateRecord payload:' + JSON.stringify(payload));

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
        "code":0,
        "message": 'Not allowed!'

    });
  }

  await storage.saveScanRecord(payload);
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