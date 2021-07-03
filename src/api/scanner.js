const SCANNERS = process.env.SCANNERS;

const axios = require('axios');
// const bodyFormData = {};

module.exports.deleteUsers = async (params) => {
  comst userCodes = params.members.map(member => {
    return member.reservationCode + '-' + member.memberNo;
  }).join('#_');

  console.log('deleteUsers userCodes:' + userCodes);

  const bodyFormData = {};
  bodyFormData.append('userCode', userCodes);

  return await axios({
    method: "post",
    url: "http://192.168.11.116:8082/service2dev/api/userDelete",
    data: bodyFormData,
    headers: { "Content-Type": "multipart/form-data" },
  });
}
