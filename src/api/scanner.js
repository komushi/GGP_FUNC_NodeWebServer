const SCANNER_PORT = process.env.SCANNER_PORT;
const USER_DELETE_API = 'service2dev/api/userDelete';
const USER_ADD_API = 'service2dev/api/userFaceAdd';

const axios = require('axios');
// const bodyFormData = {};

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


  console.log('deleteUsers userCodes:' + userCodes);

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