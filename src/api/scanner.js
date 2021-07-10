const SCANNER_PORT = process.env.SCANNER_PORT;
const USER_DELETE_API = 'service2dev/api/userDelete';
const USER_ADD_API = 'service2dev/api/userFaceAdd';

const got = require('got');
const FormData = require('form-data');

const storage = require('../api/storage');

module.exports.deleteUser = async ({reservation, userParam}) => {
  console.log('deleteUser in: reservation:' + JSON.stringify(reservation));
  console.log('deleteUser in: userParam:' + JSON.stringify(userParam));

  const scannerAddresses = await storage.getScanners({
    listingId: reservation.listingId, 
    roomCode: userParam.roomCode
  });

  // console.log('deleteUser scannerAddresses:' + JSON.stringify(scannerAddresses));

  const userCode = `${userParam.reservationCode}-${userParam.memberNo}#_`;

  console.log('deleteUser userCode:' + userCode);

  const bodyFormData = new FormData();
  bodyFormData.append('userCode', userCode);

  const results = await Promise.all(scannerAddresses.map(async (scannerAddress) => {
    
    console.log('deleteUser url:' + `http://${scannerAddress}:${SCANNER_PORT}/${USER_DELETE_API}`);
    console.log('addUser bodyFormData:' + JSON.stringify(bodyFormData));

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

  // console.log('addUser scannerAddresses:' + JSON.stringify(scannerAddresses));

  const bodyFormData = new FormData();
  bodyFormData.append('userId', Date.now());
  bodyFormData.append('imgUrl', userParam.faceImgUrl);
  bodyFormData.append('userName', userParam.fullName);
  bodyFormData.append('type', 2);
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