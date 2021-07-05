const SCANNER_PORT = process.env.SCANNER_PORT;
const USER_DELETE_API = 'service2dev/api/userDelete';
const USER_ADD_API = 'service2dev/api/userFaceAdd';

const axios = require('axios');

const storage = require('../api/storage');

module.exports.deleteUser = async ({reservation, userParam}) => {
  console.log('deleteUser in: reservation:' + JSON.stringify(reservation));
  console.log('deleteUser in: userParam:' + JSON.stringify(userParam));

  const scannerAddresses = await storage.getScanners({
    listingId: reservation.listingId, 
    roomCode: userParam.roomCode
  });

  const userCode = `${member.reservationCode}-${member.memberNo}#_`;

  console.log('deleteUser userCode:' + userCode);

  const bodyFormData = new FormData();
  bodyFormData.append('userCode', `userCode`);

  const results = await Promise.all(scannerAddresses.map(async (scannerAddress) => {
    return await axios({
      method: 'post',
      url: `http://scannerAddress:${scannerAddress}:${SCANNER_PORT}/${USER_DELETE_API}`,
      data: bodyFormData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
  bodyFormData.append('userId', Date.now());
  bodyFormData.append('imgUrl', user.faceImgUrl);
  bodyFormData.append('userName', user.fullName);
  bodyFormData.append('type', 2);
  bodyFormData.append('userCode', `${user.reservationCode}-${user.memberId}`);
  bodyFormData.append('group', `${user.reservationCode}`);
  bodyFormData.append('memberId', `${user.memberId}`);
  bodyFormData.append('beginDate', `${user.checkInDate} 14:00`);
  bodyFormData.append('endDate', `${user.checkOutDate} 11:00`);

  const results = await Promise.all(scannerAddresses.map(async (scannerAddress) => {
    return await axios({
      method: 'post',
      url: `http://scannerAddress:${scannerAddress}:${SCANNER_PORT}/${USER_DELETE_API}`,
      data: bodyFormData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }));    

  console.log('addUser out: results:' + JSON.stringify(results));

  return results;
};

module.exports.deleteUsers = async ({scannerAddress, deleteUsersParam}) => {
  console.log('deleteUsers in: scannerAddress:' + scannerAddress);
  console.log('deleteUsers in: deleteUsersParam:' + JSON.stringify(deleteUsersParam));

  const userCodes = deleteUsersParam.map(member => {
    return member.reservationCode + '-' + member.memberNo;
  }).join('#_');

  console.log('deleteUsers userCodes:' + userCodes);

  const bodyFormData = new FormData();
  bodyFormData.append('userCode', userCodes);

  return await axios({
    method: 'post',
    url: `http://scannerAddress:${scannerAddress}:${SCANNER_PORT}/${USER_DELETE_API}`,
    data: bodyFormData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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
    bodyFormData.append('userCode', `${user.reservationCode}-${user.memberId}`);
    bodyFormData.append('group', `${user.reservationCode}`);
    bodyFormData.append('memberId', `${user.memberId}`);

    return {
      method: 'post',
      url: `http://scannerAddress:${scannerAddress}:${SCANNER_PORT}/${USER_ADD_API}`,
      data: bodyFormData,
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  });


  const results = await Promise.all(params.map(async (param) => {
      return await axios(param);
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