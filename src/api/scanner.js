const SCANNER_PORT = process.env.SCANNER_PORT;
const COL_FACE_IMG_URL = process.env.COL_FACE_IMG_URL;

const USER_DELETE_API = 'service2dev/api/userDelete';
const USER_ADD_API = 'service2dev/api/userFaceAdd';
const USER_FIND_API = 'service2dev/api/findUsers';

const got = require('got');
const FormData = require('form-data');

const storage = require('../api/storage');

module.exports.findUsers = async ({listingId, userName, userCode, group}) => {
  console.log('findUsers in: listingId:' + listingId);
  console.log('findUsers in: userName:' + userName);
  console.log('findUsers in: userCode:' + userCode);
  console.log('findUsers in: group:' + group);

  let scannerAddresses = [];

  if (listingId) {
    scannerAddresses = await storage.getScanners({
      listingId: listingId
    });    
  } else {
    scannerAddresses = await storage.getScanners({});
  }

  console.log('findUsers scannerAddresses:' + JSON.stringify(scannerAddresses));

  if (scannerAddresses.length == 0) {
    throw new Error('No Scanner Addresses found!!');
  }

  const bodyFormData = new FormData();
  if (userName) {
    bodyFormData.append('name', userName);
  } else if (userCode) {
    bodyFormData.append('name', userCode);  
  } else if (group) {
    bodyFormData.append('name', group);  
  } else {
    throw new Error('Need userName, userCode or group to find a user');
  }
  
  const results = await Promise.all(scannerAddresses.map(async (scannerAddress) => {
    
    console.log('findUsers url:' + `http://${scannerAddress}:${SCANNER_PORT}/${USER_FIND_API}`);
    console.log('findUsers bodyFormData:' + JSON.stringify(bodyFormData));

    const response = await got.post(`http://${scannerAddress}:${SCANNER_PORT}/${USER_FIND_API}`, {
      body: bodyFormData
    });

    console.log(response.body);

    return response.body;

  }));

  console.log('findUsers out: results:' + JSON.stringify(results));

  return results;
};

module.exports.deleteUser = async ({listingId, userParam}) => {
  console.log('deleteUser in: listingId:' + listingId);
  console.log('deleteUser in: userParam:' + JSON.stringify(userParam));

  const scannerAddresses = await storage.getScanners({
    listingId: listingId, 
    roomCode: userParam.roomCode
  });

  // console.log('deleteUser scannerAddresses:' + JSON.stringify(scannerAddresses));

  const userCode = `${userParam.reservationCode}-${userParam.memberNo}#_`;

  console.log('deleteUser userCode:' + userCode);

  const bodyFormData = new FormData();
  bodyFormData.append('userCode', userCode);

  const results = await Promise.all(scannerAddresses.map(async (scannerAddress) => {
    
    console.log('deleteUser url:' + `http://${scannerAddress}:${SCANNER_PORT}/${USER_DELETE_API}`);
    console.log('deleteUser bodyFormData:' + JSON.stringify(bodyFormData));

    const response = await got.post(`http://${scannerAddress}:${SCANNER_PORT}/${USER_DELETE_API}`, {
      body: bodyFormData
    });

    return JSON.parse(response.body);

  }));

  console.log('deleteUser out: results:' + JSON.stringify(results));

  return results;
};

module.exports.addUser = async ({reservation, userParam}) => {
  console.log('addUser in: reservation:' + JSON.stringify(reservation));
  console.log('addUser in: userParam:' + JSON.stringify(userParam));

  const scannerAddresses = await storage.getScanners({
    listingId: reservation.listingId, 
    roomCode: userParam.roomCode
  });

  const bodyFormData = new FormData();
  if (userParam[COL_FACE_IMG_URL]) {
    bodyFormData.append('imgUrl', userParam[COL_FACE_IMG_URL]);
  }
  bodyFormData.append('userName', userParam.fullName);
  bodyFormData.append('type', 1);
  bodyFormData.append('userCode', `${userParam.reservationCode}-${userParam.memberNo}`);
  bodyFormData.append('group', `${userParam.reservationCode}`);
  bodyFormData.append('memberId', `${userParam.memberNo}`);
  bodyFormData.append('beginDate', `${reservation.checkInDate} 14:00`);
  bodyFormData.append('endDate', `${reservation.checkOutDate} 11:00`);

  const results = await Promise.all(scannerAddresses.map(async (scannerAddress) => {

    console.log('addUser url:' + `http://${scannerAddress}:${SCANNER_PORT}/${USER_ADD_API}`);
    console.log('addUser bodyFormData:' + JSON.stringify(bodyFormData));

    const response = await got.post(`http://${scannerAddress}:${SCANNER_PORT}/${USER_ADD_API}`, {
      body: bodyFormData
    });

    return JSON.parse(response.body);

  }));    

  console.log('addUser out: results:' + JSON.stringify(results));

  return results;
};

/*
module.exports.deleteUsers = async ({scannerAddress, deleteUsersParam}) => {
  console.log('deleteUsers in: scannerAddress:' + scannerAddress);
  console.log('deleteUsers in: deleteUsersParam:' + JSON.stringify(deleteUsersParam));

  const userCodes = deleteUsersParam.map(member => {
    return member.reservationCode + '-' + member.memberNo;
  }).join('#_');

  console.log('deleteUsers userCodes:' + userCodes);

  const bodyFormData = new FormData();
  bodyFormData.append('userCode', userCodes);

  const response = await fetch(`http://${scannerAddress}:${SCANNER_PORT}/${USER_DELETE_API}`, {
    method: 'POST',
    data: bodyFormData
  });

  return await response.json();

};

module.exports.addUsers = async ({scannerAddress, addUsersParam}) => {
  console.log('addUsers in: scannerAddress:' + scannerAddress);
  console.log('addUsers in: addUsersParam:' + JSON.stringify(addUsersParam));

  const params = addUsersParam.map(user => {
    const bodyFormData = new FormData();
    bodyFormData.append('userId', Date.now());
    bodyFormData.append('imgUrl', user.faceImgUrl);
    bodyFormData.append('userName', user.fullName);
    bodyFormData.append('type', 2);
    bodyFormData.append('userCode', `${user.reservationCode}-${user.memberNo}`);
    bodyFormData.append('group', `${user.reservationCode}`);
    bodyFormData.append('memberId', `${user.memberNo}`);

    return bodyFormData;
  });


  const results = await Promise.all(params.map(async (param) => {
    const response = await fetch(`http://${scannerAddress}:${SCANNER_PORT}/${USER_ADD_API}`, {
      method: 'POST',
      data: param
    });

    return await response.json();
  }));

  return results;
};

module.exports.updateScanner = async ({scannerAddress, deleteUsersParam, addUsersParam}) => {
  console.log('updateScanner in: scannerAddress:' + scannerAddress);
  console.log('updateScanner in: deleteMembersParam:' + JSON.stringify(deleteUsersParam));
  console.log('updateScanner in: addMembersParam:' + JSON.stringify(addUsersParam));

  await module.exports.deleteUsers(scannerAddress, deleteUsersParam);

  await module.exports.addUsers(scannerAddress, addUsersParam);

  console.log('updateScanner out');

  return;
};
*/